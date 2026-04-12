import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { format, parseISO } from 'date-fns';
import { formatMAD, calcLineSubtotal } from '@/lib/calculations';
import { Proforma, Client, Settings } from '@/types';

function ProformaPrintDoc({ proforma, client, settings }: { proforma: Proforma; client: Client | null; settings: Settings | null }) {
  const docTitle = 'FACTURE PROFORMA';
  const rawNum = proforma.proforma_number || '';
  const docNum = rawNum.startsWith('FAC-PROFORMA-') 
    ? `${proforma.created_at ? format(parseISO(proforma.created_at as string), 'yyyy') : ''}/${rawNum.replace('FAC-PROFORMA-', '').replace(/^0+/, '').padStart(2, '0')}`
    : rawNum;
  const dateStr = proforma.created_at ? format(parseISO(proforma.created_at as string), 'dd/MM/yyyy') : '';

  const totalTtc = Number(proforma.total_ttc || 0);
  const subtotalHt = Number(proforma.subtotal_ht || 0);
  const tvaAmount = Number(proforma.tva_amount || 0);

  const items = proforma.items_json || [];
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
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            background: #fff;
          }
          #print-root {
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
          fontSize: '11px',
          color: '#000',
          background: '#fff',
          width: '210mm',
          height: '297mm',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ padding: '12mm 18mm 12mm 12mm', flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6mm' }}>
            <div>
              {s?.logo_url ? (
                <img src={s.logo_url} alt="Logo" style={{ height: '50px', marginBottom: '4px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '60px', height: '50px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '4px' }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '6px' }}>{s?.company_name || 'BOUMHCHAD SARL AU'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#555' }}>{s?.company_sub_name || 'BASSATINE SKOURA'}</div>
              <div style={{ fontSize: '10px', color: '#444' }}>{s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'}</div>
              <div style={{ fontSize: '10px', color: '#444' }}>{s?.company_phone || '06 23 34 99 51 – 06 61 70 99 20'}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px' }}>
              <span>OUARZAZATE LE : </span>
              <strong>{dateStr}</strong>
            </div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '16px', margin: '6mm 0 4mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {docTitle} N° : {docNum}
          </div>

          <div style={{ marginBottom: '6mm', fontSize: '12px' }}>
            <div style={{ marginBottom: '3px' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>DOIT :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{client?.name || proforma?.recipient_name || '—'}</span>
            </div>
            <div>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '16px' }}>{client?.company_ice || proforma?.recipient_ice || '—'}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                {[
                  { label: 'DÉSIGNATION', w: '38%', align: 'left' as const },
                  { label: 'NB\nCHAMBRES', w: '13%', align: 'center' as const },
                  { label: 'NB\nCLIENTS', w: '13%', align: 'center' as const },
                  { label: 'P.U', w: '18%', align: 'center' as const },
                  { label: 'TOTAL\nTTC', w: '18%', align: 'center' as const },
                ].map((col, i) => (
                  <th key={i} style={{
                    border: '1px solid #ccc',
                    padding: '6px 5px',
                    fontWeight: 'bold',
                    fontSize: '10px',
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
                    <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: row.bold ? 'bold' : 'normal', minWidth: '100px' }}>{row.label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 12px', textAlign: 'right', fontWeight: row.bold ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {proforma.notes && (
            <div style={{ marginBottom: '8mm', fontSize: '11px' }}>
               <div style={{ fontStyle: 'italic', fontSize: '10px', color: '#555', marginTop: '6px' }}>Notes :</div>
               <div style={{ whiteSpace: 'pre-line', marginTop: '4px' }}>{proforma.notes}</div>
            </div>
          )}

          {s?.stamp_url && (
            <div style={{
              position: 'absolute',
              bottom: '10mm',
              right: '12mm',
              textAlign: 'center',
            }}>
              <img src={s.stamp_url} alt="Cachet" style={{ height: '110px', opacity: 1, mixBlendMode: 'multiply', objectFit: 'contain' }} />
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
      </div>
    </>
  );
}

export default async function PrintProformaPage({ params, searchParams }: { params: any, searchParams: any }) {
  const { id } = await params;
  const sp = await searchParams;

  if (sp.token !== process.env.INTERNAL_PDF_TOKEN) {
    return notFound();
  }

  const supabase = await createClient();
  const { data: p } = await supabase.from('proformas').select('*').eq('id', id).single();
  if (!p) return notFound();

  const [{ data: cData }, { data: sData }] = await Promise.all([
    p.client_id ? supabase.from('clients').select('*').eq('id', p.client_id).single() : Promise.resolve({ data: null }),
    supabase.from('settings').select('*').eq('id', 'global').single(),
  ]);

  return (
    <div className="bg-white min-h-screen">
       <ProformaPrintDoc proforma={p} client={cData} settings={sData} />
    </div>
  );
}
