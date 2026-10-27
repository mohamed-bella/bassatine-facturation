import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getSession } from '@/app/actions/auth-actions';
import InvoicePrintDocument from '@/components/InvoicePrintDocument';
import { Invoice } from '@/types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export default async function PrintInvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : null;
  const from = typeof params.from === 'string' ? params.from : null;
  const to = typeof params.to === 'string' ? params.to : null;

  const hasValidInternalToken = Boolean(process.env.INTERNAL_PDF_TOKEN && token === process.env.INTERNAL_PDF_TOKEN);
  if (!hasValidInternalToken && !(await getSession())) return notFound();

  const range = getDateRange(from, to);
  if (!range) return notFound();

  const supabase = await createClient();
  const { data: invoiceData } = await supabase
    .from('invoices')
    .select('*')
    .gte('created_at', range.fromTimestamp)
    .lt('created_at', range.toTimestampExclusive)
    .order('created_at', { ascending: true });

  const invoices = (invoiceData || []) as Invoice[];
  if (invoices.length === 0) return notFound();

  const clientIds = [...new Set(invoices.map((invoice) => invoice.client_id).filter(Boolean))] as string[];
  const [{ data: clientData }, { data: settings }] = await Promise.all([
    clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : Promise.resolve({ data: [] }),
    supabase.from('settings').select('*').eq('id', 'global').single(),
  ]);

  const clients = Object.fromEntries((clientData || []).map((client) => [client.id, client]));

  return (
    <main id="batch-print-root" className="bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html:has(#batch-print-root),
          body:has(#batch-print-root) {
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            visibility: visible !important;
          }
          #batch-print-root,
          #batch-print-root * {
            visibility: visible !important;
          }
          #batch-print-root {
            display: block !important;
            width: 210mm !important;
          }
        }
      ` }} />
      {invoices.map((invoice, index) => (
        <section key={invoice.id} className="invoice-page" style={{ breakAfter: index === invoices.length - 1 ? 'auto' : 'page', pageBreakAfter: index === invoices.length - 1 ? 'auto' : 'always' }}>
          <InvoicePrintDocument
            invoice={invoice}
            client={invoice.client_id ? clients[invoice.client_id] || null : null}
            settings={settings}
          />
        </section>
      ))}
    </main>
  );
}


