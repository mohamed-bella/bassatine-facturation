import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSession } from '@/app/actions/auth-actions';
import type { Browser, Viewport } from 'puppeteer-core';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PuppeteerLike = {
  launch(options: {
    args?: string[];
    defaultViewport?: Viewport | null;
    executablePath?: string;
    headless?: boolean;
  }): Promise<Browser>;
};

type ChromiumLike = {
  args: string[];
  defaultViewport: Viewport | null;
  executablePath: () => Promise<string>;
  headless: boolean;
};

function getDateRange(from: string | null, to: string | null) {
  if (!from || !to || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return null;

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  if (start.toISOString().slice(0, 10) !== from || end.toISOString().slice(0, 10) !== to) return null;

  end.setUTCDate(end.getUTCDate() + 1);
  return {
    fromTimestamp: start.toISOString(),
    toTimestampExclusive: end.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const range = getDateRange(from, to);

  if (!range) {
    return NextResponse.json({ error: 'La période sélectionnée est invalide.' }, { status: 400 });
  }

  const token = process.env.INTERNAL_PDF_TOKEN;

  const supabase = await createClient();
  const { data: invoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('id')
    .gte('created_at', range.fromTimestamp)
    .lt('created_at', range.toTimestampExclusive);

  if (invoiceError) {
    console.error('[BATCH PDF] Invoice lookup failed', invoiceError);
    return NextResponse.json({ error: 'Impossible de récupérer les factures.' }, { status: 500 });
  }

  if (!invoices?.length) {
    return NextResponse.json({ error: 'Aucune facture trouvée dans cette période.' }, { status: 404 });
  }

  let browser: Browser | undefined;
  try {
    let chromium: ChromiumLike | null = null;
    let puppeteer: PuppeteerLike;

    if (process.env.VERCEL) {
      chromium = (await import('@sparticuz/chromium')).default as unknown as ChromiumLike;
      puppeteer = (await import('puppeteer-core')).default as unknown as PuppeteerLike;
    } else {
      puppeteer = (await import('puppeteer')).default as unknown as PuppeteerLike;
    }

    browser = await puppeteer.launch({
      args: chromium ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      defaultViewport: chromium ? chromium.defaultViewport : { width: 1920, height: 1080 },
      executablePath: chromium
        ? await chromium.executablePath()
        : (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
      headless: chromium ? chromium.headless : true,
    });

    const page = await browser.newPage();
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const siteUrl = process.env.VERCEL_URL
      ? `${protocol}://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin);

    const cookieStore = await (await import('next/headers')).cookies();
    for (const cookie of cookieStore.getAll()) {
      await page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: new URL(siteUrl).hostname,
        path: '/',
        httpOnly: true,
        secure: siteUrl.startsWith('https'),
        sameSite: 'Lax',
      });
    }

    const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
    const printUrl = `${siteUrl}/print/factures?from=${encodeURIComponent(from!)}&to=${encodeURIComponent(to!)}${tokenQuery}`;
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('.invoice-print-area', { visible: true, timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factures-${from}-${to}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[BATCH PDF] Generation failed', error);
    return NextResponse.json({ error: 'La génération du PDF a échoué.' }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}


