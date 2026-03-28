'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import Analytics from '@/components/Analytics';
import RevenueChart from '@/components/RevenueChart';
import { 
  Loader2, 
  ArrowRight, 
  Zap, 
  ChevronRight, 
  Clock, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle,
  FilePlus,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorMsg(err.message || 'Impossible de charger les données financiers.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center relative shadow-[0_40px_100px_-30px_rgba(0,0,0,0.1)] overflow-hidden">
         <motion.div 
           initial={{ y: 50 }}
           animate={{ y: -50 }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
           className="absolute w-full h-full bg-orange-600/10 blur-xl"
         />
         <Zap className="w-6 h-6 text-orange-600 fill-orange-600 animate-pulse relative z-10" />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 animate-pulse">Initialisation Suite Spatial...</span>
    </div>
  );

  if (errorMsg) return (
    <div className="max-w-xl mx-auto mt-20 p-12 bg-white/50 backdrop-blur-xl border border-slate-100 rounded-[3rem] shadow-2xl animate-slide-up">
       <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center mb-8">
         <AlertCircle className="w-8 h-8 text-rose-500" />
       </div>
       <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Sync Timeout</h2>
       <p className="text-sm font-bold text-slate-400 leading-relaxed mb-8">{errorMsg}</p>
       <div className="space-y-4 mb-10">
          {[
            'Ensure Supabase tables are initialized.',
            'Rename .env to .env.local if missing.',
            'Check your network sync state.'
          ].map((step, i) => (
            <div key={i} className="flex items-center space-x-3 text-[11px] font-black uppercase tracking-widest text-slate-300">
              <span className="w-4 h-[2px] bg-rose-500/20"></span>
              <span>{step}</span>
            </div>
          ))}
       </div>
       <button 
        onClick={() => fetchData()} 
        className="w-full bg-slate-900 text-white h-16 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-orange-600 transition-all flex items-center justify-center space-x-3 group"
       >
         <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
         <span>Force Refresh</span>
       </button>
    </div>
  );

  const priorityInvoices = invoices.filter(i => i.invoice_status !== 'paid' && !i.is_trashed).slice(0, 5);

  return (
    <div className="px-10 pb-20 w-full animate-slide-up relative z-10">
      <Analytics invoices={invoices} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <section className="lg:col-span-2 space-y-10">
           <div className="spatial-card h-[450px] p-12 bg-white flex flex-col group relative overflow-hidden">
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] mb-1">Financial Performance</span>
                  <h3 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Revenue Dynamics</h3>
                </div>
                <div className="bg-slate-50 p-1 rounded-xl flex items-center space-x-1 border border-slate-100/50">
                  <span className="px-6 py-2 bg-white text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm rounded-lg border border-slate-100">Live View</span>
                  <span className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-900 transition-colors">Forecasting</span>
                </div>
              </div>

              <div className="flex-1 relative z-10 group-hover:scale-[1.02] transition-transform duration-700">
                <RevenueChart invoices={invoices} />
              </div>

              <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-orange-600/5 blur-[150px] pointer-events-none transition-all duration-700 group-hover:bg-orange-600/10" />
           </div>

           <div className="flex items-center justify-between mt-16 px-4">
              <div className="flex flex-col">
                <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Quick Entry</h3>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1 italic opacity-60">Actions immédiates</span>
              </div>
              <Link href="/invoice/new" className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center group hover:bg-orange-600 hover:border-orange-600 transition-all shadow-sm">
                 <FilePlus className="w-5 h-5 text-slate-300 group-hover:text-white group-hover:rotate-90 transition-all duration-500" />
              </Link>
           </div>
        </section>

        <section className="space-y-10">
           <div className="spatial-card p-10 bg-slate-900 text-white min-h-full">
              <div className="flex items-center space-x-3 mb-10 flex-wrap">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
                   <Clock className="w-4 h-4 text-orange-600" />
                 </div>
                 <h3 className="text-lg font-black tracking-tight uppercase">High Priority</h3>
                 <span className="ml-auto text-[10px] font-black uppercase text-orange-600 tracking-[0.2em] opacity-80 underline underline-offset-8">Pending Docs</span>
              </div>

              <div className="space-y-6">
                {priorityInvoices.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-10">
                    <CheckCircle2 className="w-10 h-10 mb-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-center">Toutes factures payées</span>
                  </div>
                ) : (
                  priorityInvoices.map((inv, i) => (
                    <motion.div 
                      key={inv.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group/item flex flex-col p-6 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/0 hover:border-white/5 cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-tighter text-orange-600">{inv.invoice_number}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          inv.invoice_status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-500/10 text-slate-300 border-white/10'
                        }`}>
                          {inv.invoice_status}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white hover:text-orange-600 transition-colors uppercase truncate">{inv.recipient_name}</span>
                        <div className="flex justify-between items-center mt-6">
                           <span className="text-lg font-black text-white tabular-nums tracking-tighter">
                            {Number(inv.grand_total_ttc).toLocaleString('fr-MA')}
                            <span className="text-[10px] opacity-20 ml-1">DH</span>
                           </span>
                           <Link href={`/invoice/${inv.id}/view`} className="p-2 bg-white/5 group-hover/item:bg-orange-600 group-hover/item:text-white rounded-lg transition-all text-slate-400">
                             <ChevronRight className="w-4 h-4" />
                           </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <Link href="/invoices" className="mt-10 pt-10 border-t border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors group">
                <span>See all Documents</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </Link>
           </div>
        </section>
      </div>

      <AnimatePresence>
        {!invoices.length && !loading && !errorMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-white/90 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-20 text-center"
          >
             <div className="w-40 h-40 bg-orange-600 rounded-[4rem] rotate-12 flex items-center justify-center shadow-2xl shadow-orange-600/30 mb-10 overflow-hidden relative group">
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                <FilePlus className="w-16 h-16 text-white stroke-[3px]" />
             </div>
             <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-6 uppercase">Workspace est Vide</h2>
             <p className="max-w-xl text-lg font-bold text-slate-400 leading-relaxed mb-12">Initialisez votre écosystème en créant votre premiere facture professionnelle.</p>
             <Link href="/invoice/new" className="bg-slate-900 text-white px-12 py-6 rounded-3xl text-xs font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-orange-600 hover:-translate-y-2 transition-all">
                Commencer le setup
             </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
