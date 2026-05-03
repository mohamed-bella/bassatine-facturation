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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            background: #fff;
          }
          #print-area {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            background: #fff;
          }
        }
      `}} />
      <div
        id="print-area"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12.5px',
          color: '#000',
          background: '#fff',
          width: '210mm',
          height: '297mm',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Main content — bottom padding reserves space for footer (~38mm) */}
        <div style={{ padding: '12mm 14mm 42mm 14mm', flex: 1, position: 'relative' }}>

          {/* Header: logo + company info | date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7mm' }}>
            <div>
              {s?.logo_url ? (
                <img src={s.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '6px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '70px', height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '6px' }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '6px' }}>{s?.company_name || 'BOUMHCHAD SARL AU'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{s?.company_sub_name || 'BASSATINE SKOURA'}</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'}</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{s?.company_phone || '06 23 34 99 51 – 06 61 70 99 20'}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
              <span>OUARZAZATE LE : </span>
              <strong style={{ fontSize: '13px' }}>{dateStr}</strong>
            </div>
          </div>

          {/* Document title */}
          <div style={{
            fontWeight: 'bold',
            fontSize: '19px',
            margin: '6mm 0 5mm',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '2px solid #000',
            paddingBottom: '4px',
            display: 'inline-block',
          }}>
            {docTitle} N° : {docNum}
          </div>

          {/* Client info */}
          <div style={{ marginBottom: '7mm', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>DOIT :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '14px' }}>{client?.name || invoice?.recipient_name || '—'}</span>
            </div>
            <div>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{client?.company_ice || invoice?.recipient_ice || '—'}</span>
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '12px' }}>
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
                    padding: '7px 5px',
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
                  <tr key={i} style={{ height: '24px' }}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 7px' }}>{desc}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', fontWeight: qty ? 'bold' : 'normal', color: qty ? '#c2410c' : '#000' }}>{qty || ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', color: nbClients ? '#c2410c' : '#000', fontWeight: nbClients ? 'bold' : 'normal' }}>{nbClients}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{price ? formatMAD(price) : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{total ? formatMAD(total) : ''}</td>
                  </tr>
                );
              })}
              {Array.from({ length: emptyRowCount }).map((_, i) => (
                <tr key={`e-${i}`} style={{ height: '24px' }}>
                  <td style={{ border: '1px solid #ccc', padding: '5px' }}>&nbsp;</td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals table */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
            <table style={{ width: '250px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  { label: 'TOTAL TTC', value: formatMAD(totalTtc) + ' DH', bold: true },
                  { label: 'TOTAL HT', value: formatMAD(subtotalHt) + ' DH', bold: false },
                  { label: 'DONT TVA 10%', value: formatMAD(tvaAmount) + ' DH', bold: false },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: row.bold ? 'bold' : 'normal', minWidth: '110px' }}>{row.label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 12px', textAlign: 'right', fontWeight: row.bold ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount in words */}
          <div style={{ marginBottom: '6mm', fontSize: '11px' }}>
            <div style={{ marginBottom: '3px', color: '#555' }}>Arrête la présente facture à la somme de :</div>
            <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '12px', textTransform: 'uppercase' }}>
              {invoice.amount_words || ''}
            </div>
          </div>

          {/* Stamp — sits above footer, on the right */}
          {s?.stamp_url && (
            <div style={{
              position: 'absolute',
              bottom: '22mm',
              right: '14mm',
              textAlign: 'center',
            }}>
              <img src={s.stamp_url} alt="Cachet" style={{ height: '100px', opacity: 1, mixBlendMode: 'multiply', objectFit: 'contain' }} />
            </div>
          )}

          {/* Footer */}
          <div style={{
            position: 'absolute',
            bottom: '8mm',
            left: '0',
            right: '0',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '5px',
            margin: '0 14mm',
            fontSize: '7.5px',
            color: '#94a3b8',
            textAlign: 'center',
          }}>
            {s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'} – GMS : {s?.company_phone || ''}{s?.company_email ? ` – Email: ${s.company_email}` : ''}<br />
            {footerLine}
          </div>
        </div>
      </div>
    </>
  );
}

export default async function PrintInvoicePage({ params, searchParams }: { params: any, searchParams: any }) {
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
