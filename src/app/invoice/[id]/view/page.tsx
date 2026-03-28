'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice, Settings } from '@/types';
import { 
  Loader2, 
  Printer, 
  ChevronLeft, 
  Mail, 
  FileCheck, 
  CheckCircle2, 
  Download, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Globe,
  History,
  MessageCircle,
  Share2,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function ViewInvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'activity'>('document');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: inv }, { data: sett }] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', id).single(),
        supabase.from('settings').select('*').eq('id', 'global').single()
      ]);

      setInvoice(inv);
      setSettings(sett);
      setLoading(false);
    };

    if (id) fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = printRef.current;
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `Doc-${invoice?.invoice_number}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
    </div>
  );

  if (!invoice) return <div className="p-20 text-center uppercase tracking-widest font-black text-slate-300">Architecture non trouvée</div>;

  return (
    <div className="max-w-7xl mx-auto px-10 pb-40 animate-slide-up flex flex-col lg:flex-row gap-16">
      <div className="flex-1">
        <div className="no-print flex justify-between items-center mb-16">
           <Link href="/invoices" className="flex items-center space-x-4 px-6 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all shadow-sm group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Registry Archive</span>
           </Link>
           <div className="flex items-center space-x-3 bg-slate-100/50 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('document')} 
                className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'document' ? 'bg-white text-slate-900 shadow-xl border border-slate-100' : 'text-slate-300'}`}
              >
                Document Reality
              </button>
              <button 
                onClick={() => setActiveTab('activity')} 
                className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'activity' ? 'bg-white text-slate-900 shadow-xl border border-slate-100' : 'text-slate-300'}`}
              >
                Audit Flow
              </button>
           </div>
        </div>

        <section className="relative z-10 mx-auto w-full lg:w-[210mm] animate-fade-in group">
           <div ref={printRef} className="bg-white p-[20mm] shadow-2xl relative min-h-[297mm] ring-1 ring-slate-100 print:shadow-none print:m-0 print:ring-0 mx-auto origin-top transition-transform duration-1000 scale-[1] lg:scale-[1]">
              <div className="flex justify-between items-start mb-24 relative z-10">
                <div className="max-w-[400px]">
                   {settings?.logo_url ? (
                      <img src={settings.logo_url} className="w-48 grayscale hover:grayscale-0 transition-all duration-700" alt="Logo" />
                   ) : (
                      <div className="w-20 h-2 bg-orange-600 mb-6"></div>
                   )}
                   <div className="mt-10">
                     <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{settings?.company_name}</h1>
                     <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-4 leading-relaxed italic border-l-2 border-orange-600 pl-4">
                       {settings?.company_details}
                     </p>
                   </div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col items-center mb-10 shadow-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Reality ID</span>
                      <span className="text-lg font-black tracking-tighter">{invoice.invoice_number}</span>
                   </div>
                   <div className="text-right space-y-4">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest block mb-1">Emission Reality</span>
                        <span className="text-sm font-black text-slate-900 uppercase tabular-nums tracking-widest">{format(parseISO(invoice.invoice_date), 'dd/MM/yyyy')}</span>
                      </div>
                      {invoice.due_date && (
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest block mb-1">Contractual Due</span>
                          <span className="text-sm font-black text-rose-500 uppercase tabular-nums tracking-widest">{format(parseISO(invoice.due_date), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="mb-24 relative z-10">
                 <div className="flex items-center space-x-4 mb-2">
                    <div className="w-8 h-1 bg-slate-900"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">DESTINATION AUTHORITY</span>
                 </div>
                 <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase mb-4">{invoice.recipient_name}</h2>
                 <div className="flex items-center space-x-10">
                    <div className="flex items-center space-x-3 text-[10px] font-black text-slate-300 uppercase underline decoration-slate-100 decoration-4">
                       <span>ICE NR :</span>
                       <span className="text-slate-900">{invoice.recipient_ice}</span>
                    </div>
                    {invoice.recipient_email && (
                      <div className="flex items-center space-x-3 text-[10px] font-black text-slate-300 uppercase underline decoration-slate-100 decoration-4">
                        <span>ACCESS POINT :</span>
                        <span className="text-slate-900">{invoice.recipient_email}</span>
                      </div>
                    )}
                 </div>
              </div>

              <div className="mb-24 relative z-10 w-full">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="border-b-4 border-slate-900">
                          <th className="py-6 px-4 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-900 w-[55%]">Service Logic Architecture</th>
                          <th className="py-6 px-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Unités</th>
                          <th className="py-6 px-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Tax</th>
                          <th className="py-6 px-4 text-right text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Amount Reality</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50 border-b-2 border-slate-900">
                       {invoice.items_json.map((it, idx) => (
                         <tr key={idx} className="group">
                            <td className="py-8 px-4">
                               <p className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{it.desc}</p>
                               <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic">{it.clients || 'GLOBAL FLOW REFERENCE'}</span>
                            </td>
                            <td className="py-8 px-4 text-center align-middle">
                               <span className="bg-slate-50 text-[10px] font-black p-2 rounded tabular-nums min-w-[30px] inline-block">{it.qty}</span>
                            </td>
                            <td className="py-8 px-4 text-center align-middle">
                               <span className="text-[9px] font-black text-slate-300">{it.tax}%</span>
                            </td>
                            <td className="py-8 px-4 text-right align-middle">
                               <span className="text-sm font-black text-slate-900 tabular-nums">
                                 {(it.qty * it.price * (1 + 0)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                               </span>
                            </td>
                         </tr>
                       ))}
                       {Array.from({ length: Math.max(0, 8 - invoice.items_json.length) }).map((_, i) => (
                         <tr key={`spacer-${i}`} className="opacity-0"><td className="py-8 px-4">&nbsp;</td><td colSpan={3}></td></tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="flex justify-between items-start mb-24 relative z-10">
                 <div className="flex-1 pr-20">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Literal Sync</p>
                    <div className="text-[11px] font-black text-slate-900 italic uppercase leading-relaxed tracking-tight group-hover:text-orange-600 transition-colors">
                      Arrêté la présente facture à la somme de : <br />
                      &quot; {invoice.amount_words} &quot;
                    </div>
                 </div>
                 <div className="w-[300px] space-y-4">
                    <div className="flex justify-between items-center px-4">
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total Services (HT)</span>
                       <span className="text-[12px] font-black text-slate-900 tabular-nums">{Number(invoice.subtotal_ht).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} {invoice.currency}</span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Aggregate Tax (TVA)</span>
                       <span className="text-[12px] font-black text-slate-900 tabular-nums">{Number(invoice.tax_total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} {invoice.currency}</span>
                    </div>
                    <div className="p-8 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex flex-col items-end transform rotate-2 hover:rotate-0 transition-transform duration-700">
                       <span className="text-[9px] font-black uppercase text-orange-600 tracking-[0.5em] mb-2">Net Payable TTC</span>
                       <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-black tabular-nums tracking-tighter">
                            {Number(invoice.grand_total_ttc).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-black opacity-30">{invoice.currency}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="relative mt-20 h-40 flex justify-between items-end border-t border-slate-50 pt-10">
                 <div className="w-64 grayscale opacity-20">
                    <Globe className="w-10 h-10 mb-4" />
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                       Document generated by Bassatine Spatial Suite 2.0. <br />
                       Authorised signature verified via blockchain logic.
                    </p>
                 </div>
                 <div className="relative group/stamp pr-10">
                    <img 
                      src="https://mohamedbella.com/wp-content/uploads/2025/11/BASSATINE-SKOURA.png" 
                      className="w-48 opacity-60 transform -rotate-12 translate-y-10 group-hover/stamp:-rotate-3 group-hover/stamp:translate-y-0 transition-all duration-1000 grayscale group-hover/stamp:grayscale-0" 
                      alt="Official Seal"
                    />
                 </div>
              </div>

              <div className="absolute top-[-200px] right-[-200px] w-full h-[800px] bg-orange-600/5 blur-[300px] pointer-events-none group-hover:bg-orange-600/10 transition-all duration-1000 z-0" />
           </div>
        </section>
      </div>

      {/* ACTION SIDEBAR */}
      <aside className="lg:w-96 space-y-8 no-print pt-28 sticky top-0 h-fit">
         <div className="spatial-card bg-slate-900 p-10 text-white space-y-10 overflow-hidden relative group">
            <div className="flex items-center space-x-4 mb-6 relative z-10">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
                 <ShieldCheck className="w-5 h-5 text-emerald-500" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Document Verified</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Fulfillment Success</span>
               </div>
            </div>

            <div className="space-y-4 relative z-10">
               <button onClick={handlePrint} className="w-full bg-white text-black h-16 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center space-x-3 group/btn">
                  <Printer className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                  <span>Physical Print</span>
               </button>
               <button onClick={handlePDF} className="w-full bg-white/5 border border-white/5 text-white h-16 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all flex items-center justify-center space-x-3 group/btn">
                  <Download className="w-4 h-4 group-hover/btn:translate-y-1 transition-transform" />
                  <span>Reality PDF</span>
               </button>
               <button className="w-full bg-emerald-500 text-white h-16 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all flex items-center justify-center space-x-3 group/btn shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]">
                  <Mail className="w-4 h-4 group-hover/btn:-rotate-12 transition-transform" />
                  <span>Send to Authority</span>
               </button>
            </div>

            <div className="pt-10 border-t border-white/5 relative z-10">
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-white/60 transition-colors cursor-pointer">
                  <span>Advanced Operations</span>
                  <MoreVertical className="w-3.5 h-3.5" />
               </div>
            </div>

            <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-1000" />
         </div>

         <div className="spatial-card bg-white p-10 space-y-8">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center">
              <History className="w-4 h-4 text-orange-600 mr-3" />
              Document Genealogy
            </h4>
            <div className="space-y-6 relative ml-4 pl-8 border-l border-slate-50">
               {[
                 { label: 'Created by System', date: invoice.created_at, icon: Zap },
                 { label: 'Architecture Finalized', date: invoice.updated_at, icon: ShieldCheck },
                 { label: 'Viewed by Reality', date: new Date().toISOString(), icon: Eye, active: true },
               ].map((log, i) => (
                 <div key={i} className="relative group/log">
                    <div className={`absolute -left-12 top-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-all ${log.active ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-200 border-slate-100'}`}>
                       <log.icon className="w-3 h-3" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{log.label}</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">{format(parseISO(log.date), 'dd/MM/yyyy HH:mm')}</p>
                 </div>
               ))}
            </div>
         </div>
      </aside>
    </div>
  );
}
