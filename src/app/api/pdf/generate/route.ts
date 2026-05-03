import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  // 1. AUTHENTICATION CHECK
  const { getSession } = await import('@/app/actions/auth-actions');
  const isAuthenticated = await getSession();

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const token = process.env.INTERNAL_PDF_TOKEN;

  if (!type || !id || !token) {
    return NextResponse.json({ error: 'Missing parameters or configuration' }, { status: 400 });
  }

  try {
    let chromium = null;
    let puppeteer = null;

    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      // Vercel / Production deployment
      chromium = (await import('@sparticuz/chromium')).default;
      puppeteer = (await import('puppeteer-core')).default;
    } else {
      // Local development
      puppeteer = (await import('puppeteer')).default;
    }

    const browser = await puppeteer.launch({
      args: chromium ? chromium.args : [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      defaultViewport: chromium ? (chromium as any).defaultViewport : { width: 1920, height: 1080 },
      executablePath: chromium ? await chromium.executablePath() : (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
      headless: chromium ? (chromium as any).headless : true,
    });

    const page = await browser.newPage();
    
    // 2. ENVIRONMENT & SESSION PROXYING
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const siteUrl = process.env.VERCEL_URL 
      ? `${protocol}://${process.env.VERCEL_URL}` 
      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

    // Inject each cookie individually for maximum reliability
    const cookieStore = await (await import('next/headers')).cookies();
    const cookies = cookieStore.getAll();
    
    for (const cookie of cookies) {
      await page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: new URL(siteUrl).hostname,
        path: '/',
        httpOnly: true,
        secure: siteUrl.startsWith('https'),
        sameSite: 'Lax'
      });
    }

    const printUrl = `${siteUrl}/print/${type}/${id}?token=${token}`;
    console.log(`[PDF] Navigating to: ${printUrl}`);
    
    await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // 3. WAIT FOR CONTENT
    // Ensure the document component is actually rendered
    try {
      await page.waitForSelector('#print-area', { visible: true, timeout: 5000 });
    } catch (e) {
      console.warn('[PDF] Warning: #print-area not found in 5s, proceeding anyway');
    }

    // Safety buffer for images/icons
    await new Promise(r => setTimeout(r, 1500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '5mm', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    await browser.close();

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}-${id}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('[PDF ERROR]', error);
    return NextResponse.json({ 
      error: 'PDF Generation Failed', 
      details: error.message 
    }, { status: 500 });
  }
}
