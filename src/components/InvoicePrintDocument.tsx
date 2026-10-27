import { format, parseISO } from 'date-fns';
import { formatMAD, calcLineSubtotal } from '@/lib/calculations';
import { STAMP_URL } from '@/lib/document-assets';
import { Invoice, Client, Settings, LineItem } from '@/types';

type InvoicePrintDocumentProps = {
  invoice: Invoice;
  client: Client | null;
  settings: Settings | null;
};

type PrintableLineItem = Partial<LineItem> & {
  desc?: string;
  qty?: number;
  price?: number;
};

export default function InvoicePrintDocument({ invoice, client, settings }: InvoicePrintDocumentProps) {
  const rawNum = invoice.invoice_number || '';
  const docNum = rawNum.startsWith('FACTURE-COMMERCIAL-')
    ? rawNum.replace('FACTURE-COMMERCIAL-', `${new Date(invoice.created_at || new Date()).getFullYear()}/`)
    : rawNum;
  const dateStr = invoice.created_at ? format(parseISO(invoice.created_at), 'dd/MM/yyyy') : '';
  const totalTtc = Number(invoice.total_ttc || 0);
  const subtotalHt = Number(invoice.subtotal_ht || 0);
  const tvaAmount = Number(invoice.tva_amount || 0);
  const items = (invoice.items_json || []) as PrintableLineItem[];
  const emptyRowCount = Math.max(0, 8 - items.length);

  const footerLine = [
    settings?.company_rc ? `RC : ${settings.company_rc}` : '',
    settings?.company_tp ? `T.P : ${settings.company_tp}` : '',
    settings?.company_if ? `IF : ${settings.company_if}` : '',
    settings?.company_cnss ? `CNSS : ${settings.company_cnss}` : '',
    settings?.company_ice ? `ICE : ${settings.company_ice}` : '',
  ].filter(Boolean).join(' • ');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 0; }
        @media print {
          body { margin: 0; background: #fff; }
          .invoice-print-area {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            background: #fff;
          }
        }
      ` }} />
      <div
        className="invoice-print-area"
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
        <div style={{ padding: '12mm 14mm 42mm 14mm', flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7mm' }}>
            <div>
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '6px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '70px', height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '6px' }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '6px' }}>{settings?.company_name || 'BOUMHCHAD SARL AU'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{settings?.company_sub_name || 'BASSATINE SKOURA'}</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{settings?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'}</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{settings?.company_phone || '06 23 34 99 51 – 06 61 70 99 20'}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
              <span>OUARZAZATE LE : </span>
              <strong style={{ fontSize: '13px' }}>{dateStr}</strong>
            </div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '19px', margin: '6mm 0 5mm', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #000', paddingBottom: '4px', display: 'inline-block' }}>
            FACTURE COMMERCIALE N° : {docNum}
          </div>

          <div style={{ marginBottom: '7mm', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>DOIT :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '14px' }}>{client?.name || invoice.recipient_name || '—'}</span>
            </div>
            <div>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{client?.company_ice || invoice.recipient_ice || '—'}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {[
                  { label: 'DÉSIGNATION', w: '40%', align: 'left' as const },
                  { label: 'NB\nCHAMBRES', w: '12%', align: 'center' as const },
                  { label: 'NB\nCLIENTS', w: '12%', align: 'center' as const },
                  { label: 'P.U (DH)', w: '18%', align: 'center' as const },
                  { label: 'TOTAL\nTTC', w: '18%', align: 'center' as const },
                ].map((col) => (
                  <th key={col.label} style={{ border: '1.5px solid #000', padding: '7px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: col.align, width: col.w, whiteSpace: 'pre-line', textTransform: 'uppercase' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const description = item.description || item.desc || '';
                const quantity = item.quantity || item.qty || 0;
                const clients = item.nb_clients ?? '';
                const price = item.unit_price || item.price || 0;
                const total = calcLineSubtotal(quantity, price);

                return (
                  <tr key={index} style={{ height: '24px' }}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 7px' }}>{description}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', fontWeight: quantity ? 'bold' : 'normal', color: quantity ? '#c2410c' : '#000' }}>{quantity || ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', color: clients ? '#c2410c' : '#000', fontWeight: clients ? 'bold' : 'normal' }}>{clients}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{price ? formatMAD(price) : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{total ? formatMAD(total) : ''}</td>
                  </tr>
                );
              })}
              {Array.from({ length: emptyRowCount }).map((_, index) => (
                <tr key={`empty-${index}`} style={{ height: '24px' }}>
                  <td style={{ border: '1px solid #ccc', padding: '5px' }}>&nbsp;</td>
                  <td style={{ border: '1px solid #ccc' }} />
                  <td style={{ border: '1px solid #ccc' }} />
                  <td style={{ border: '1px solid #ccc' }} />
                  <td style={{ border: '1px solid #ccc' }} />
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
            <table style={{ width: '250px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  { label: 'TOTAL TTC', value: `${formatMAD(totalTtc)} DH`, bold: true },
                  { label: 'TOTAL HT', value: `${formatMAD(subtotalHt)} DH`, bold: false },
                  { label: 'DONT TVA 10%', value: `${formatMAD(tvaAmount)} DH`, bold: false },
                ].map((row) => (
                  <tr key={row.label}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: row.bold ? 'bold' : 'normal', minWidth: '110px' }}>{row.label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 12px', textAlign: 'right', fontWeight: row.bold ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '6mm', fontSize: '11px' }}>
            <div style={{ marginBottom: '3px', color: '#555' }}>Arrête la présente facture à la somme de :</div>
            <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '12px', textTransform: 'uppercase' }}>{invoice.amount_words || ''}</div>
          </div>

          {STAMP_URL && (
            <div style={{ position: 'absolute', bottom: '22mm', right: '14mm', textAlign: 'center' }}>
              <img src={STAMP_URL} alt="Cachet" style={{ height: '100px', opacity: 1, mixBlendMode: 'multiply', objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '8mm', left: '0', right: '0', borderTop: '1px solid #e2e8f0', paddingTop: '5px', margin: '0 14mm', fontSize: '7.5px', color: '#94a3b8', textAlign: 'center' }}>
            {settings?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'} – GMS : {settings?.company_phone || ''}{settings?.company_email ? ` – Email: ${settings.company_email}` : ''}<br />
            {footerLine}
          </div>
        </div>
      </div>
    </>
  );
}


