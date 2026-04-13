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
  Download,
  XCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'envoyé': { label: 'Envoyé', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  'accepté': { label: 'Accepté', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  'refusé': { label: 'Refusé', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

function ProformaPrintDoc({ proforma, client, settings }: { proforma: Proforma; client: Client | null; settings: Settings | null }) {
  const docTitle = 'FACTURE PROFORMA';
  const docNum = proforma.proforma_number?.startsWith('FAC-PROFORMA-') 
    ? `${proforma.created_at ? format(parseISO(proforma.created_at as string), 'yyyy') : ''}/${proforma.proforma_number.replace('FAC-PROFORMA-', '').replace(/^0+/, '').padStart(2, '0')}`
    : proforma.proforma_number;
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
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
          }
          .print-only {
            display: block !important;
            visibility: visible !important;
          }
          #proforma-view-root {
            display: none !important;
          }
        }
      `}} />
      <div
        id="print-area"
        className="print-document"
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
        <div style={{ padding: '12mm 18mm 12mm 12mm', flex: 1, position: 'relative' }}>
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
              <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '15px' }}>{client?.name || proforma?.recipient_name || '—'}</span>
            </div>
            <div>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{client?.company_ice || proforma?.recipient_ice || '—'}</span>
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
    const currentYear = new Date().getFullYear().toString();
    const nextInvNum = generateNextNumber(currentYear, (numData || []).map((x: any) => x.invoice_number), '/', 3);

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
    setActionLoading(true);
    try {
      const response = await fetch(`/api/pdf/generate?type=proforma&id=${params.id}`);
      if (!response.ok) throw new Error('Erreur');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proforma-${proforma?.proforma_number || 'export'}.pdf`;
      a.click();
    } catch (err: any) {
      alert('Erreur PDF');
    } finally {
      setActionLoading(false);
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 120);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading || !proforma) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
    </div>
  );

  const statusInfo = STATUS_CONFIG[proforma.status] || STATUS_CONFIG.brouillon;
  const displayNum = proforma.proforma_number?.startsWith('FAC-PROFORMA-') 
    ? `${proforma.created_at ? format(parseISO(proforma.created_at as string), 'yyyy') : ''}/${proforma.proforma_number.replace('FAC-PROFORMA-', '').replace(/^0+/, '').padStart(2, '0')}`
    : proforma.proforma_number;

  return (
    <>
      {/* STICKY FLOATING ACTIONS */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-fit no-print"
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-6">
              <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions Rapides</span>
                <Badge className={`${statusInfo.color} text-[9px] font-black px-2`}>{statusInfo.label}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-9 px-6 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest flex items-center">
                  <Printer className="w-4 h-4 mr-2" /> Imprimer
                </Button>
                {proforma.status === 'brouillon' && (
                  <Button size="sm" onClick={() => updateStatus('envoyé')} className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                    <Send className="w-3.5 h-3.5 mr-2" /> Envoyer
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="proforma-view-root" className="max-w-6xl mx-auto pb-40 animate-slide-up flex flex-col lg:flex-row gap-8 px-4 md:px-0 relative">
        {/* DECORATIVE BLOBS */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[30%] bg-orange-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="flex-1 space-y-6 min-w-0">
          <header className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/proformas')} className="rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-none">{displayNum}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Facture Proforma</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Badge className={`${statusInfo.color} border rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shrink-0 shadow-sm`}>{statusInfo.label}</Badge>
              {proforma.status === 'brouillon' && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/proforma/${proforma.id}/edit`}>
                    <Button variant="outline" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm">Modifier</Button>
                  </Link>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={() => updateStatus('envoyé')} disabled={actionLoading} className="rounded-xl h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 transition-all">
                      <Send className="w-3.5 h-3.5 mr-2" /> Envoyer
                    </Button>
                  </motion.div>
                </div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm shrink-0" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" /> Imprimer
                </Button>
              </motion.div>
            </div>
          </header>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="no-print shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] rounded-[2.5rem] overflow-hidden border border-white/40 bg-white/20 backdrop-blur-md p-4 md:p-12 flex justify-center min-h-[500px] md:min-h-[1000px] hover:shadow-[0_50px_120px_-20px_rgba(0,0,0,0.25)] transition-shadow duration-700"
          >
            <div className="origin-top scale-[0.4] sm:scale-[0.5] md:scale-[0.8] lg:scale-100 transition-transform duration-500">
              <ProformaPrintDoc proforma={proforma} client={client} settings={settings} />
            </div>
          </motion.div>
        </div>

        <aside className="lg:w-80 space-y-5 no-print lg:sticky lg:top-8 h-fit">
          <Card className="bg-slate-900 text-white rounded-[2rem] border-none overflow-hidden p-7 space-y-7 shadow-2xl">
            <div>
              <p className="text-[10px] font-bold uppercase text-white/30 tracking-[0.2em] mb-1">Montant Estimé</p>
              <h3 className="text-3xl font-black tabular-nums">{formatMAD(Number(proforma.total_ttc))} <span className="text-sm opacity-30">DH</span></h3>
            </div>
            
             {!proforma.linked_invoice_id ? (
               <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                 <Button onClick={convertToInvoice} disabled={actionLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl text-xs font-bold shadow-xl shadow-orange-600/20">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Convertir en facture
                 </Button>
               </motion.div>
             ) : (
               <Link href={`/facture-commerciale/${proforma.linked_invoice_id}/view`} className="block">
                  <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white h-14 rounded-2xl text-xs font-bold shadow-lg">
                    Voir en facture <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
               </Link>
             )}
          </Card>

          <Card className="border border-slate-100/50 rounded-[2rem] bg-white/60 backdrop-blur-xl p-6 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Informations</h4>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Client</span>
                <span className="text-xs font-bold text-slate-900">{client?.name || proforma.recipient_name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crée le</span>
                <span className="text-xs font-bold text-slate-900">{format(parseISO(proforma.created_at), 'dd MMMM yyyy')}</span>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <div className="print-only hidden print:block">
         <ProformaPrintDoc proforma={proforma} client={client} settings={settings} />
      </div>
    </>
  );
}
