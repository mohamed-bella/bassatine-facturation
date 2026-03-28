'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Proforma, Client, Settings } from '@/types';
import { formatMAD, calcLineSubtotal } from '@/lib/calculations';
import { format, parseISO } from 'date-fns';
import {
  Loader2,
  Printer,
  ChevronLeft,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'envoyé': { label: 'Envoyé', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  'accepté': { label: 'Accepté', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  'refusé': { label: 'Refusé', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

// Emits exactly the invoice PDF layout from the template, just titled 'FACTURE PROFORMA' without a stamp
function ProformaPrintDoc({ proforma, client, settings }: { proforma: Proforma; client: Client | null; settings: Settings | null }) {
  const docTitle = 'FACTURE PROFORMA';
  const docNum = proforma.proforma_number;
  const dateStr = proforma.created_at ? format(parseISO(proforma.created_at as string), 'dd/MM/yyyy') : '';

  const totalTtc = Number(proforma.total_ttc || 0);
  const subtotalHt = Number(proforma.subtotal_ht || 0);
  const tvaAmount = Number(proforma.tva_amount || 0);

  // Pad table to at least 8 rows
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
    <div
      id="print-area"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#000',
        background: '#fff',
        width: '210mm',
        minHeight: '297mm',
        padding: '12mm 14mm',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* ─── HEADER ─────────────────────────────────────────── */}
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

      {/* ─── TITLE ─────────────────────────────────────────── */}
      <div style={{ fontWeight: 'bold', fontSize: '16px', margin: '6mm 0 4mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {docTitle} N° : {docNum}
      </div>

      {/* ─── CLIENT INFO ─────────────────────────────────────── */}
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

      {/* ─── TABLE ─────────────────────────────────────────── */}
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
          {items.map((item, i) => {
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
          {/* Empty rows for padding alignment like the invoice template */}
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

      {/* ─── TOTALS ─────────────────────────────────────────── */}
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

      {/* ─── AMOUNT IN WORDS (Optional for Proforma) ─────────── */}
      {proforma.notes && (
        <div style={{ marginBottom: '8mm', fontSize: '11px' }}>
           <div style={{ fontStyle: 'italic', fontSize: '10px', color: '#555', marginTop: '6px' }}>Notes :</div>
           <div style={{ whiteSpace: 'pre-line', marginTop: '4px' }}>{proforma.notes}</div>
        </div>
      )}
      {/* ─── STAMP ─────────────────────────────────────────── */}
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

      {/* ─── FOOTER ─────────────────────────────────────────── */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ViewProformaPage() {
  const params = useParams();
  const router = useRouter();
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    const { data: p } = await supabase.from('proformas').select('*').eq('id', params.id).single();
    if (!p) { router.push('/proformas'); return; }

    const [{ data: cData }, { data: sData }] = await Promise.all([
      p.client_id ? supabase.from('clients').select('*').eq('id', p.client_id).single() : Promise.resolve({ data: null }),
      supabase.from('settings').select('*').eq('id', 'global').single(),
    ]);

    const totalTtc = Number(p.total_ttc || (p as any).grand_total_ttc || 0);
    const tvaAmount = Number(p.tva_amount || (p as any).tax_total || 0);
    setProforma({ ...p, total_ttc: totalTtc, tva_amount: tvaAmount });

    setClient(cData);
    setSettings(sData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setActionLoading(true);
    await supabase.from('proformas').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', params.id);
    await fetchData();
    setActionLoading(false);
  };

  const convertToInvoice = async () => {
    setActionLoading(true);
    if (!proforma) return;

    const { data: numData } = await supabase.from('invoices').select('invoice_number');
    const { generateNextNumber } = await import('@/lib/calculations');
    const nextInvNum = generateNextNumber('INV', (numData || []).map((x: any) => x.invoice_number));

    const { data: newInvoice, error } = await supabase.from('invoices').insert([{
      invoice_number: nextInvNum,
      client_id: proforma.client_id,
      proforma_id: proforma.id,
      status: 'brouillon',
      items_json: proforma.items_json,
      tva_mode: proforma.tva_mode,
      subtotal_ht: proforma.subtotal_ht,
      tva_amount: proforma.tva_amount,
      total_ttc: proforma.total_ttc,
      notes: proforma.notes,
    }]).select().single();

    if (error) {
      alert('Erreur: ' + error.message);
      setActionLoading(false);
    } else {
      await supabase.from('proformas').update({ linked_invoice_id: newInvoice.id, status: 'accepté' }).eq('id', proforma.id);
      router.push(`/facture-commerciale/${newInvoice.id}/edit`);
    }
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById('print-area');
    if (!el) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({
      margin: 0,
      filename: `Proforma-${proforma?.proforma_number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    }).from(el).save();
  };

  if (loading || !proforma) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement...</span>
    </div>
  );

  const statusInfo = STATUS_CONFIG[proforma.status] || STATUS_CONFIG.brouillon;

  return (
    <div className="max-w-6xl mx-auto pb-40 animate-slide-up flex flex-col lg:flex-row gap-10">
      {/* LEFT: DOCUMENT */}
      <div className="flex-1 space-y-6">
        <header className="no-print flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/proformas')} className="rounded-xl bg-white border border-slate-200 shadow-sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{proforma.proforma_number}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Facture Proforma</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <Badge className={`${statusInfo.color} border rounded-xl px-4 py-2 text-xs font-bold`}>{statusInfo.label}</Badge>
            {proforma.status === 'brouillon' && (
              <>
                <Link href={`/proforma/${proforma.id}/edit`}>
                  <Button variant="outline" className="rounded-xl h-10 text-xs font-bold">Modifier</Button>
                </Link>
                <Button onClick={() => updateStatus('envoyé')} disabled={actionLoading} className="rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                  <Send className="w-3.5 h-3.5 mr-2" /> Marquer envoyé
                </Button>
              </>
            )}
            {proforma.status === 'envoyé' && (
              <Button onClick={() => updateStatus('refusé')} disabled={actionLoading} variant="outline" className="rounded-xl h-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold">
                <XCircle className="w-4 h-4 mr-2" /> Refusé
              </Button>
            )}
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* A4 Document */}
        <div className="shadow-2xl rounded-xl overflow-hidden border border-slate-200">
          <ProformaPrintDoc proforma={proforma} client={client} settings={settings} />
        </div>
      </div>

      {/* RIGHT: ACTION SIDEBAR */}
      <aside className="lg:w-80 space-y-5 no-print lg:sticky lg:top-8 h-fit">
        <Card className="bg-slate-900 text-white rounded-[2rem] border-none overflow-hidden p-7">
           <p className="text-[10px] font-bold uppercase text-white/30 tracking-[0.2em] mb-1">Montant Estimé</p>
           <h3 className="text-3xl font-black tabular-nums">{formatMAD(Number(proforma.total_ttc))} <span className="text-sm opacity-30">DH</span></h3>
           <Separator className="bg-white/10 my-6" />

           {!proforma.linked_invoice_id && (
             <Button
               onClick={convertToInvoice}
               disabled={actionLoading}
               className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl text-xs font-bold shadow-xl shadow-orange-600/20"
             >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Convertir en facture
             </Button>
           )}
           {proforma.linked_invoice_id && (
             <Link href={`/facture-commerciale/${proforma.linked_invoice_id}/view`} className="block">
                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white h-14 rounded-2xl text-xs font-bold">
                  Voir la facture liée <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
             </Link>
           )}
        </Card>
      </aside>
    </div>
  );
}
