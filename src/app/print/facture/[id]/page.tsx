import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { format, parseISO } from 'date-fns';
import { formatMAD, calcLineSubtotal } from '@/lib/calculations';
import { Invoice, Client, Settings } from '@/types';

function InvoicePrintDoc({ invoice, client, settings }: { invoice: Invoice; client: Client | null; settings: Settings | null }) {
  const docTitle = 'FACTURE COMMERCIALE';
  const rawNum = invoice.invoice_number || '';
  const docNum = rawNum.startsWith('FACTURE-COMMERCIAL-') 
    ? rawNum.replace('FACTURE-COMMERCIAL-', `${new Date(invoice.created_at || new Date()).getFullYear()}/`)
    : rawNum;
  const dateStr = invoice.created_at ? format(parseISO(invoice.created_at as string), 'dd/MM/yyyy') : '';

  const totalTtc = Number(invoice.total_ttc || 0);
  const subtotalHt = Number(invoice.subtotal_ht || 0);
  const tvaAmount = Number(invoice.tva_amount || 0);

  const items = invoice.items_json || [];
  const emptyRowCount = Math.max(0, 8 - items.length);
  const s = settings;

  const footerLine = [
    s?.company_rc ? `RC : ${s.company_rc}` : '',
    s?.company_tp ? `T.P : ${s.company_tp}` : '',
    s?.company_if ? `IF : ${s.company_if}` : '',
    s?.company_cnss ? `CNSS : ${s.company_cnss}` : '',
    s?.company_ice ? `ICE : ${s.company_ice}` : '',
  ].filter(Boolean).join(' • ');

  return (
    <div
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12.5px',
        color: '#000',
        background: '#fff',
        width: '210mm',
        height: '297mm',
        padding: '10mm 10mm',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
        <div>
          {s?.logo_url ? (
            <img src={s.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '6px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '70px', height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '6px' }} />
          )}
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '8px' }}>{s?.company_name || 'BOUMHCHAD SARL AU'}</div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{s?.company_sub_name || 'BASSATINE SKOURA'}</div>
          <div style={{ fontSize: '11px', color: '#444' }}>{s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'}</div>
          <div style={{ fontSize: '11px', color: '#444' }}>{s?.company_phone || '06 23 34 99 51 – 06 61 70 99 20'}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px' }}>
          <span>OUARZAZATE LE : </span>
          <strong style={{ fontSize: '13px' }}>{dateStr}</strong>
        </div>
      </div>

      <div style={{ fontWeight: 'bold', fontSize: '19px', margin: '8mm 0 6mm', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #000', paddingBottom: '4px', display: 'inline-block' }}>
        {docTitle} N° : {docNum}
      </div>

      <div style={{ marginBottom: '8mm', fontSize: '14px' }}>
        <div style={{ marginBottom: '5px' }}>
          <span style={{ color: '#2563eb', fontWeight: 'bold' }}>DOIT :</span>
          <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '15px' }}>{client?.name || invoice?.recipient_name || '—'}</span>
        </div>
        <div>
          <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
          <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{client?.company_ice || invoice?.recipient_ice || '—'}</span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '12.5px' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {[
              { label: 'DÉSIGNATION', w: '40%', align: 'left' as const },
              { label: 'NB\nCHAMBRES', w: '12%', align: 'center' as const },
              { label: 'NB\nCLIENTS', w: '12%', align: 'center' as const },
              { label: 'P.U (DH)', w: '18%', align: 'center' as const },
              { label: 'TOTAL\nTTC', w: '18%', align: 'center' as const },
            ].map((col, i) => (
              <th key={i} style={{
                border: '1.5px solid #000',
                padding: '8px 5px',
                fontWeight: 'bold',
                fontSize: '11px',
                textAlign: col.align,
                width: col.w,
                whiteSpace: 'pre-line',
                textTransform: 'uppercase',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => {
            const desc = item.description || (item as any).desc || '';
            const qty = item.quantity || (item as any).qty || 0;
            const nbClients = item.nb_clients ?? (item as any).nb_clients ?? '';
            const price = item.unit_price || (item as any).price || 0;
            const total = calcLineSubtotal(qty, price);
            return (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '5px 7px' }}>{desc}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', fontWeight: qty ? 'bold' : 'normal', color: qty ? '#c2410c' : '#000' }}>{qty || ''}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', color: nbClients ? '#c2410c' : '#000', fontWeight: nbClients ? 'bold' : 'normal' }}>{nbClients}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{price ? formatMAD(price) : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{total ? formatMAD(total) : ''}</td>
              </tr>
            );
          })}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`e-${i}`} style={{ height: '22px' }}>
              <td style={{ border: '1px solid #ccc', padding: '5px' }}>&nbsp;</td>
              <td style={{ border: '1px solid #ccc' }}></td>
              <td style={{ border: '1px solid #ccc' }}></td>
              <td style={{ border: '1px solid #ccc' }}></td>
              <td style={{ border: '1px solid #ccc' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
        <table style={{ width: '240px', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            {[
              { label: 'TOTAL TTC', value: formatMAD(totalTtc) + ' DH', bold: true },
              { label: 'TOTAL HT', value: formatMAD(subtotalHt) + ' DH', bold: false },
              { label: 'DONT TVA 10%', value: formatMAD(tvaAmount) + ' DH', bold: false },
            ].map((row, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: row.bold ? 'bold' : 'normal' }}>{row.label}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: row.bold ? 'bold' : 'normal' }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '8mm', fontSize: '11px' }}>
        <div style={{ marginBottom: '3px' }}>Arrête la présente facture à la somme de :</div>
        <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '12px', textTransform: 'uppercase' }}>
          {invoice.amount_words || ''}
        </div>
      </div>

      {s?.stamp_url && (
        <div style={{
          position: 'absolute',
          bottom: '35mm',
          right: '15mm',
          textAlign: 'center',
        }}>
          <img src={s.stamp_url} alt="Cachet" style={{ height: '140px', opacity: 0.95, objectFit: 'contain' }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '10mm',
        left: '14mm',
        right: '14mm',
        borderTop: '1px solid #e2e8f0',
        paddingTop: '6px',
        fontSize: '7.5px',
        color: '#94a3b8',
        textAlign: 'center',
      }}>
        {s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'} – GMS : {s?.company_phone || ''}{s?.company_email ? ` – Email: ${s.company_email}` : ''}<br />
        {footerLine}
      </div>
    </div>
  );
}

export default async function PrintInvoicePage({ params, searchParams }: { params: { id: string }, searchParams: { token?: string } }) {
  const { id } = await params;
  const sp = await searchParams;

  if (sp.token !== process.env.INTERNAL_PDF_TOKEN) {
    return notFound();
  }

  const supabase = await createClient();
  const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!inv) return notFound();

  const [{ data: cData }, { data: sData }] = await Promise.all([
    inv.client_id ? supabase.from('clients').select('*').eq('id', inv.client_id).single() : Promise.resolve({ data: null }),
    supabase.from('settings').select('*').eq('id', 'global').single(),
  ]);

  return (
    <div className="bg-white min-h-screen">
       <InvoicePrintDoc invoice={inv} client={cData} settings={sData} />
    </div>
  );
}
