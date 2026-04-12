'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Table as TableIcon, 
  Plus, 
  ChevronLeft,
  MessageSquare,
  Send,
  Download,
  Printer,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from "framer-motion";

import { chatInvoiceAi } from '@/app/actions/ai-actions';
import { formatMAD } from '@/lib/calculations';

// Generic A4 preview
function AiPreviewDoc({ data, isProforma, settings }: { data: any, isProforma: boolean, settings: any | null }) {
  const s = settings;
  const docTitle = isProforma ? 'FACTURE PROFORMA' : 'FACTURE COMMERCIALE';
  const dateStr = format(new Date(), 'dd/MM/yyyy');
  const items = data.items || [];
  const emptyRowCount = Math.max(0, 8 - items.length);

  const subtotalHt = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price) / 1.1, 0);
  const totalTtc = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0);
  const tvaAmount = totalTtc - subtotalHt;

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
          #ai-creator-root {
            display: none !important;
          }
        }
      `}} />
      <div
        id="ai-print-area"
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
              <div style={{ width: '70px', height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '6px' }} />
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '8px' }}>BOUMHCHAD SARL AU</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>BASSATINE SKOURA</div>
              <div style={{ fontSize: '11px', color: '#444' }}>Douar Boumhchad Skoura – Ouarzazate</div>
              <div style={{ fontSize: '11px', color: '#444' }}>06 23 34 99 51 – 06 61 70 99 20</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
              <span>OUARZAZATE LE : </span>
              <strong style={{ fontSize: '13px' }}>{dateStr}</strong>
            </div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '19px', margin: '8mm 0 6mm', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #000', paddingBottom: '4px', display: 'inline-block' }}>
            {docTitle} N° : 202X/00X
          </div>

          <div style={{ marginBottom: '8mm', fontSize: '14px' }}>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>DOIT :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '15px' }}>{data.client_name || '—'}</span>
            </div>
            {data.client_ice && (
              <div>
                <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
                <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{data.client_ice}</span>
              </div>
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'left' }}>DÉSIGNATION</th>
                <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' }}>QTE</th>
                <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' }}>P.U (DH)</th>
                <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' }}>TOTAL TTC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ccc', padding: '5px 7px' }}>{item.description}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{formatMAD(item.unit_price)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{formatMAD(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRowCount }).map((_, i) => (
                <tr key={`e-${i}`} style={{ height: '22px' }}>
                  <td style={{ border: '1px solid #ccc', padding: '5px' }}>&nbsp;</td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
            <table style={{ width: '220px', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: 'bold' }}>TOTAL TTC</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatMAD(totalTtc)} DH</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>TOTAL HT</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMAD(subtotalHt)} DH</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>TVA 10%</td>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMAD(tvaAmount)} DH</td>
                </tr>
              </tbody>
            </table>
          </div>
          
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
            {s?.company_name || 'BOUMHCHAD SARL AU'} – {s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'} – GMS : {s?.company_phone || '06 23 34 99 51'}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AiInvoiceCreatorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [docType, setDocType] = useState<'invoice' | 'proforma'>('invoice');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchS = async () => {
      const { data } = await (await import('@/lib/supabase')).supabase.from('settings').select('*').eq('id', 'global').single();
      setSettings(data);
    };
    fetchS();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatInvoiceAi(newMessages);
      if (response.type === 'data') {
        setResult(response.data);
        setMessages(m => [...m, { role: 'assistant', content: '✅ Voici l\'aperçu de votre document ! Si cela vous convient, cliquez sur "Valider".' }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', content: response.message || '' }]);
      }
    } catch (err: any) {
      setMessages(m => [...m, { role: 'assistant', content: "❌ Erreur : " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById('ai-print-area');
    if (!el) return;
    setLoading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(el, { 
        scale: 3, 
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`Apercu-${docType}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erreur PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    sessionStorage.setItem('ai_invoice_data', JSON.stringify(result));
    router.push(`/${docType === 'proforma' ? 'proforma' : 'facture-commerciale'}/new?source=ai`);
  };

  return (
    <>
      <div id="ai-creator-root" className="max-w-[1400px] mx-auto px-4 md:px-10 py-8 md:py-16 relative overflow-visible">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
             <Badge variant="outline" className="mb-4 border-slate-200 text-slate-400 font-bold tracking-[0.3em] px-4 py-1 rounded-full text-[9px] uppercase">Générateur IA v3.0</Badge>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase">Magic <span className="text-orange-600 italic text-shadow-glow">Invoice</span></h1>
             <p className="text-slate-400 font-medium mt-2 max-w-md">Facturation instantanée par intelligence artificielle.</p>
          </div>
          <div className="flex items-center bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
            <Button variant={docType === 'invoice' ? 'default' : 'ghost'} onClick={() => setDocType('invoice')} className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6", docType === 'invoice' && 'bg-slate-900 shadow-lg')}>Facture</Button>
            <Button variant={docType === 'proforma' ? 'default' : 'ghost'} onClick={() => setDocType('proforma')} className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6", docType === 'proforma' && 'bg-slate-900 shadow-lg')}>Proforma</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
             <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                   <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                         <CardTitle className="text-xl font-black text-slate-900 uppercase">Assistant AI</CardTitle>
                         <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Connecté</p>
                      </div>
                   </div>
                </CardHeader>
                <CardContent className="p-8">
                   <div className="h-[450px] overflow-y-auto mb-6 pr-4 space-y-4 scrollbar-hide">
                      {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                           <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center"><Plus className="w-8 h-8 text-slate-400" /></div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Décrivez votre facture...</p>
                        </div>
                      )}
                      {messages.map((m, i) => (
                        <div key={i} className={cn("flex flex-col max-w-[85%] space-y-2", m.role === 'user' ? 'ml-auto' : 'mr-auto')}>
                          <div className={cn("px-6 py-4 rounded-[1.8rem] text-sm font-medium shadow-sm leading-relaxed", m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-slate-50 text-slate-600 rounded-tl-none border border-slate-100')}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {loading && <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest animate-pulse">L'IA rédige...</div>}
                      <div ref={chatEndRef} />
                   </div>
                   <div className="relative">
                      <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Ex: 3 nuits chambre double pour M. Martin à 600dh..." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 pr-16 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 transition-all" />
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="absolute right-2 top-2">
                         <Button onClick={handleSend} disabled={loading} className="h-12 w-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg"><Send className="w-5 h-5" /></Button>
                      </motion.div>
                   </div>
                </CardContent>
             </Card>
          </div>

          <div className="space-y-6">
             {!result ? (
                <div className="h-[600px] rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-12 text-center opacity-30">
                   <TableIcon className="w-12 h-12 mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest">En attente de génération...</p>
                </div>
             ) : (
                <div className="space-y-6 animate-slide-up relative">
                   <div className="no-print rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-200 flex items-start justify-center pt-8 border border-slate-300 relative h-[650px]">
                      <div className="scale-[0.45] origin-top">
                         <AiPreviewDoc data={result} isProforma={docType === 'proforma'} settings={settings} />
                      </div>
                   </div>

                   <div className="no-print flex gap-4">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                         <Button onClick={handleDownloadPDF} variant="outline" className="w-full h-16 border-2 border-slate-200 rounded-[2rem] text-[10px] font-black uppercase tracking-widest bg-white"><Download className="w-4 h-4 mr-2" /> PDF</Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="outline" size="icon" className="h-16 w-16 rounded-[2rem] bg-white border-2 border-slate-200" onClick={() => window.print()}>
                          <Printer className="w-5 h-5 text-slate-600" />
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-[2]">
                         <Button onClick={handleConfirm} className="w-full h-16 bg-slate-900 hover:bg-orange-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10">Confirmer et Éditer <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </motion.div>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>

      {result && (
        <div className="print-only hidden print:block">
           <AiPreviewDoc data={result} isProforma={docType === 'proforma'} settings={settings} />
        </div>
      )}
    </>
  );
}
