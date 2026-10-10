import { BANK_TRANSFER_DETAILS } from '@/lib/document-assets';

/** Compact payment block for printable pro forma documents. */
export default function BankTransferDetails({ marginBottom = '5mm' }: { marginBottom?: string }) {
  const { bankName, rib, iban, swift } = BANK_TRANSFER_DETAILS;

  return (
    <div style={{ marginBottom, textAlign: 'left' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>
        Paiement par virement bancaire
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: '10px', maxWidth: '100%' }}>
        <tbody>
          {[
            { label: 'Banque', value: bankName, mono: false },
            { label: 'RIB', value: rib, mono: true },
            { label: 'IBAN', value: iban, mono: true },
            { label: 'SWIFT', value: swift, mono: true },
          ].map(({ label, value, mono }) => (
            <tr key={label}>
              <td style={{ border: '1px solid #cbd5e1', padding: '2px 6px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '2px 7px', fontFamily: mono ? 'monospace' : undefined, letterSpacing: mono ? '0.1px' : undefined, whiteSpace: 'nowrap' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
