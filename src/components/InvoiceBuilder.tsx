'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceItem, InvoiceType, InvoiceStatus, Client } from '@/types';
import { 
  Save, 
  ChevronLeft, 
  Plus, 
  X, 
  Calculator, 
  Info, 
  Eye, 
  FileText, 
  Users, 
  Percent, 
  Truck, 
  Calendar,
  CheckCircle2,
  Trash2,
  MoreVertical,
  Minus,
  Settings as SettingsIcon,
  HelpCircle,
  Clock,
  Zap,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';

interface Props {
  initialData?: Partial<Invoice>;
  isEdit?: boolean;
}

export default function InvoiceBuilder({ initialData, isEdit = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  
  // FORM STATE
  const [type, setType] = useState<InvoiceType>(initialData?.invoice_type || 'commercial');
  const [status, setStatus] = useState<InvoiceStatus>(initialData?.invoice_status || 'draft');
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items_json || [{ desc: 'CHAMBRE DOUBLE', qty: 1, price: 0, tax: 10, discount: 0, clients: '' }]);
  const [client, setClient] = useState({
    name: initialData?.recipient_name || '',
    ice: initialData?.recipient_ice || '',
    email: initialData?.recipient_email || '',
    phone: initialData?.recipient_phone || '',
    address: initialData?.recipient_address || ''
  });
  const [meta, setMeta] = useState({
    number: initialData?.invoice_number || '',
    date: initialData?.invoice_date || new Date().toISOString().split('T')[0],
    dueDate: initialData?.due_date || addDays(new Date(), 30).toISOString().split('T')[0],
    amountWords: initialData?.amount_words || '',
    notes: initialData?.notes || '',
    internalNotes: initialData?.internal_notes || '',
    currency: initialData?.currency || 'DH'
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchEnv = async () => {
      const [{ data: cData }, { data: sData }] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('settings').select('*').eq('id', 'global').single()
      ]);
      setClients(cData || []);
      setSettings(sData);
    };
    fetchEnv();
  }, []);

  const totals = useMemo(() => {
    let subtotalIdx = 0;
    let taxTotalIdx = 0;
    
    items.forEach(item => {
      const basePrice = Number(item.qty) * Number(item.price);
      const afterDiscount = basePrice * (1 - (Number(item.discount) / 100));
      subtotalIdx += afterDiscount;
      taxTotalIdx += afterDiscount * (Number(item.tax) / 100);
    });

    return {
      subtotal: subtotalIdx,
      tax: taxTotalIdx,
      ttc: subtotalIdx + taxTotalIdx
    };
  }, [items]);

  const addItem = () => setItems([...items, { desc: '', qty: 1, price: 0, tax: 10, discount: 0, clients: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const selectClient = (c: Client) => {
    setClient({
      name: c.name,
      ice: c.ice || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const invoiceData = {
      invoice_number: meta.number,
      invoice_date: meta.date,
      due_date: meta.dueDate,
      invoice_type: type,
      invoice_status: status,
      recipient_name: client.name,
      recipient_ice: client.ice,
      recipient_email: client.email,
      recipient_phone: client.phone,
      recipient_address: client.address,
      items_json: items,
      subtotal_ht: totals.subtotal,
      tax_total: totals.tax,
      grand_total_ttc: totals.ttc,
      amount_words: meta.amountWords,
      currency: meta.currency,
      notes: meta.notes,
      internal_notes: meta.internalNotes,
      updated_at: new Date().toISOString()
    };

    try {
      if (isEdit && initialData?.id) {
        await supabase.from('invoices').update(invoiceData).eq('id', initialData.id);
      } else {
        await supabase.from('invoices').insert([invoiceData]);
      }
      router.push('/invoices');
      router.refresh();
    } catch (err) {
      alert('Error: ' + err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/10 spatial-page animate-slide-up">
      {/* BUILDER HEADER */}
      <header className="h-28 bg-white/2 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-16 sticky top-0 z-50">
        <div className="flex items-center space-x-10">
          <Link href="/invoices" className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-slate-900 group transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-white" />
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-1">Architecture Document</span>
            <div className="flex items-center space-x-3">
               <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                 {isEdit ? 'Revision' : 'Generator'}
                 <span className="text-orange-600 ml-3">#{meta.number || 'Draft'}</span>
               </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
           <div className="flex bg-slate-100/50 p-1.5 rounded-2xl shadow-inner ring-1 ring-slate-100">
             <button 
              onClick={() => setActiveTab('edit')}
              className={twMerge("px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center space-x-2", activeTab === 'edit' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-900")}
             >
               <Calculator className="w-3.5 h-3.5" />
               <span>Architecture</span>
             </button>
             <button 
              onClick={() => setActiveTab('preview')}
              className={twMerge("px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center space-x-2", activeTab === 'preview' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-900")}
             >
               <Eye className="w-3.5 h-3.5" />
               <span>Reality Preview</span>
             </button>
           </div>

           <button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-slate-900 text-white px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-slate-900/10 hover:bg-orange-600 transition-all flex items-center space-x-3 group relative overflow-hidden"
           >
             <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 transition-transform group-hover:scale-110" />}
             <span>Synchronize</span>
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-[calc(100vh-112px)]">
         {/* LEFT PANE: ARCHITECTURE (FORM) */}
         <div className={twMerge("flex-1 overflow-y-auto p-16 space-y-20 custom-scrollbar pb-40", activeTab === 'preview' ? 'hidden lg:block' : 'block')}>
            {/* TYPE & STATUS SELECTION */}
            <section className="flex flex-col md:flex-row gap-10 items-stretch">
               <div className="flex-1 spatial-card bg-white p-10 border-slate-100/50 shadow-sm relative group overflow-hidden">
                  <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] mb-4 block">Document Integrity</span>
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-100">
                    <button type="button" onClick={() => setType('commercial')} className={twMerge("flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", type === 'commercial' ? "bg-white text-black shadow-md border border-slate-100" : "text-slate-300 hover:text-slate-900")}>Comm. Invoice</button>
                    <button type="button" onClick={() => setType('proforma')} className={twMerge("flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", type === 'proforma' ? "bg-white text-black shadow-md border border-slate-100" : "text-slate-300 hover:text-slate-900")}>Proforma</button>
                  </div>
                  <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-orange-600/5 blur-3xl pointer-events-none group-hover:bg-orange-600/10 transition-colors" />
               </div>

               <div className="flex-1 spatial-card bg-white p-10 border-slate-100/50 shadow-sm">
                  <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] mb-4 block">Workflow Status</span>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-900 focus:ring-1 focus:ring-slate-900 appearance-none shadow-inner border border-slate-100"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="sent">Sent (Unpaid)</option>
                    <option value="paid">Settled (Paid)</option>
                    <option value="overdue">Overdue (Claim)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
               </div>
            </section>

            {/* RECIPIENT & METADATA */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-16">
               <div className="space-y-10 focus-within:ring-2 ring-orange-600/5 p-4 rounded-3xl transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center">
                       <Users className="w-4 h-4 text-orange-600 mr-3" />
                       Client Logic
                    </h3>
                    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl cursor-default group">
                       <Zap className="w-3 h-3 text-orange-600 animate-pulse" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Memory Sync</span>
                    </div>
                  </div>
                  <div className="space-y-8">
                     <div className="group relative">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 transition-colors group-focus-within:text-orange-600">Recherche client existant</label>
                        <div className="relative">
                           <input 
                            type="text" 
                            list="clients-list"
                            className="w-full bg-transparent border-b border-slate-100 py-3 text-sm font-black text-slate-900 uppercase tracking-tight focus:border-orange-600 focus:outline-none transition-all placeholder:text-slate-200"
                            placeholder="RECHERCHE PAR NOM..."
                            value={client.name}
                            onChange={e => {
                               setClient({...client, name: e.target.value});
                               const found = clients.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                               if (found) selectClient(found);
                            }}
                           />
                           <datalist id="clients-list">
                             {clients.map(c => <option key={c.id} value={c.name} />)}
                           </datalist>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="group">
                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 group-focus-within:text-orange-600">ICE Identifier</label>
                           <input 
                            type="text" 
                            className="w-full bg-transparent border-b border-slate-100 py-2 text-xs font-bold text-slate-900 tracking-widest focus:border-orange-600 focus:outline-none placeholder:text-slate-100"
                            placeholder="000219..."
                            value={client.ice}
                            onChange={e => setClient({...client, ice: e.target.value})}
                           />
                        </div>
                        <div className="group">
                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 group-focus-within:text-orange-600">Contact Email</label>
                           <input 
                            type="email" 
                            className="w-full bg-transparent border-b border-slate-100 py-2 text-xs font-bold text-slate-900 tracking-widest focus:border-orange-600 focus:outline-none placeholder:text-slate-100"
                            placeholder="CLIENT@EMAIL.COM"
                            value={client.email}
                            onChange={e => setClient({...client, email: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-10 p-4">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] mb-2 flex items-center">
                    <Clock className="w-4 h-4 text-slate-900 mr-3" />
                    Temporal Meta
                  </h3>
                  <div className="space-y-8">
                     <div className="grid grid-cols-2 gap-8">
                        <div className="group">
                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 group-focus-within:text-slate-900">Reference NR.</label>
                           <input 
                            type="text" required
                            className="w-full bg-transparent border-b border-slate-100 py-3 text-sm font-black text-slate-900 tracking-[0.1em] uppercase focus:border-slate-900 focus:outline-none placeholder:text-slate-200"
                            placeholder="BS-001/25"
                            value={meta.number}
                            onChange={e => setMeta({...meta, number: e.target.value})}
                           />
                        </div>
                        <div className="group">
                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 group-focus-within:text-slate-900">Currency (ISO)</label>
                           <input 
                            type="text" 
                            className="w-full bg-transparent border-b border-slate-100 py-3 text-sm font-black text-slate-900 tracking-widest focus:border-slate-900 focus:outline-none uppercase"
                            value={meta.currency}
                            onChange={e => setMeta({...meta, currency: e.target.value.toUpperCase()})}
                           />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-8">
                        <div className="group">
                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 transition-colors">Invoice Date</label>
                           <input 
                            type="date" 
                            className="w-full bg-transparent border-b border-slate-100 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none h-[40px]"
                            value={meta.date}
                            onChange={e => setMeta({...meta, date: e.target.value})}
                           />
                        </div>
                        <div className="group">
                           <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-2 transition-colors">Payment Due</label>
                           <input 
                            type="date" 
                            className="w-full bg-transparent border-b border-slate-100 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none h-[40px]"
                            value={meta.dueDate}
                            onChange={e => setMeta({...meta, dueDate: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>
               </div>
            </section>

            {/* LINE ITEMS: THE CORE LOGIC */}
            <section className="space-y-10">
               <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                  <div className="flex flex-col">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center">
                      <Zap className="w-5 h-5 text-orange-600 mr-4 shadow-sm" />
                      Dynamic Services
                    </h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={addItem}
                    className="flex items-center space-x-3 bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-900/10 hover:shadow-orange-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ligne de prestation</span>
                  </button>
               </div>

               <div className="space-y-4">
                  <AnimatePresence>
                    {items.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group relative"
                      >
                         <div className="grid grid-cols-12 gap-8 items-start">
                            <div className="col-span-12 lg:col-span-5 space-y-4">
                               <label className="text-[8px] font-black uppercase text-slate-200 tracking-widest">Désignation & Détails</label>
                               <input 
                                type="text" 
                                className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-1 focus:ring-slate-900 placeholder:text-slate-200 transition-all h-[56px]"
                                placeholder="CHAMBRE / SERVICE / REPAS..."
                                value={item.desc}
                                onChange={e => updateItem(idx, 'desc', e.target.value)}
                               />
                               <div className="relative group/ref">
                                  <input 
                                    type="text" 
                                    className="w-full bg-transparent border-b border-slate-50 py-2 text-[10px] font-bold text-slate-300 group-focus-within/ref:text-slate-900 focus:outline-none uppercase"
                                    placeholder="REFERENCE CLIENT / CHAMBRE NR."
                                    value={item.clients}
                                    onChange={e => updateItem(idx, 'clients', e.target.value)}
                                  />
                               </div>
                            </div>
                            
                            <div className="col-span-4 lg:col-span-2 space-y-4">
                               <label className="text-[8px] font-black uppercase text-slate-200 tracking-widest text-center block">Quantité</label>
                               <div className="flex bg-slate-50 p-1.5 rounded-2xl h-[56px] border border-slate-100">
                                  <button type="button" onClick={() => updateItem(idx, 'qty', Math.max(1, (item.qty || 1) - 1))} className="w-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all"><Minus className="w-3 h-3" /></button>
                                  <input 
                                    type="number" 
                                    className="flex-1 bg-transparent border-none text-center text-xs font-black focus:ring-0 p-0"
                                    value={item.qty}
                                    onChange={e => updateItem(idx, 'qty', e.target.value)}
                                  />
                                  <button type="button" onClick={() => updateItem(idx, 'qty', (item.qty || 1) + 1)} className="w-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all"><Plus className="w-3 h-3" /></button>
                               </div>
                            </div>

                            <div className="col-span-8 lg:col-span-2 space-y-4">
                               <label className="text-[8px] font-black uppercase text-slate-200 tracking-widest text-right block">P.U {meta.currency}</label>
                               <input 
                                type="number" step="0.01"
                                className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black text-right focus:ring-1 focus:ring-slate-900 h-[56px] border border-slate-100"
                                value={item.price}
                                onChange={e => updateItem(idx, 'price', e.target.value)}
                               />
                            </div>

                            <div className="col-span-6 lg:col-span-1 space-y-4">
                               <label className="text-[8px] font-black uppercase text-slate-200 tracking-widest text-center block">Tax %</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black text-center focus:ring-1 focus:ring-slate-900 h-[56px] border border-slate-100 appearance-none"
                                    value={item.tax}
                                    onChange={e => updateItem(idx, 'tax', e.target.value)}
                                  />
                                  <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-200" />
                               </div>
                            </div>

                            <div className="col-span-6 lg:col-span-2 space-y-4 relative">
                               <label className="text-[8px] font-black uppercase text-slate-200 tracking-widest text-right block">Total TTC Line</label>
                               <div className="flex items-center justify-end h-[56px] pr-8">
                                  <span className="text-sm font-black text-slate-900 tabular-nums">
                                    {(Number(item.qty || 0) * Number(item.price || 0) * (1 + Number(item.tax || 0)/100)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                                  </span>
                               </div>
                               
                               <button 
                                type="button" 
                                onClick={() => removeItem(idx)}
                                className="absolute -top-12 -right-12 w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-300 hover:bg-rose-500 hover:text-white transition-all scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
               </div>
            </section>

            {/* FOOTER TOTALS & WORDS */}
            <section className="bg-slate-900 text-white rounded-[4rem] p-16 shadow-2xl relative overflow-hidden group">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
                  <div className="space-y-8">
                     <div className="group">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 block group-focus-within:text-orange-600 transition-colors">Amount in Written Words</label>
                        <textarea 
                          className="w-full bg-white/5 border border-white/5 p-8 rounded-[2rem] text-sm font-black italic tracking-wide text-white focus:outline-none focus:ring-1 focus:ring-orange-600 transition-all h-32 placeholder:text-white/10"
                          placeholder="ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE..."
                          value={meta.amountWords}
                          onChange={e => setMeta({...meta, amountWords: e.target.value.toUpperCase()})}
                        />
                     </div>
                     <div className="flex items-center space-x-6">
                        <div className="p-4 bg-white/5 rounded-2xl flex items-center space-x-4">
                           <Info className="w-5 h-5 text-orange-600" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-white/40 leading-relaxed uppercase">
                             La conversion intelligente des montants <br /> est activée sur la preview live.
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-center py-4 border-b border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Subtotal (HT)</span>
                        <span className="text-xl font-black tabular-nums tracking-tighter">{totals.subtotal.toLocaleString('fr-MA')} <span className="text-xs opacity-20 ml-1">{meta.currency}</span></span>
                     </div>
                     <div className="flex justify-between items-center py-4 border-b border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Value Added Tax (AVG)</span>
                        <span className="text-xl font-black tabular-nums tracking-tighter">{totals.tax.toLocaleString('fr-MA')} <span className="text-xs opacity-20 ml-1">{meta.currency}</span></span>
                     </div>
                     <div className="pt-10 flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-600 mb-2">Grand Total Reality</span>
                        <div className="flex items-baseline space-x-4">
                           <span className="text-6xl font-black tracking-tighter text-white tabular-nums drop-shadow-2xl">
                             {totals.ttc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                           </span>
                           <span className="text-2xl font-black uppercase text-white/10">{meta.currency}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="absolute top-[-200px] left-[-200px] w-full h-[600px] bg-orange-600/5 blur-[200px] pointer-events-none group-hover:bg-orange-600/10 transition-all duration-1000" />
            </section>
         </div>

         {/* RIGHT PANE: REALITY PREVIEW (LIVE RECONSTRUCTION) */}
         <div className={twMerge("w-full lg:w-[600px] bg-slate-100/30 overflow-y-auto p-12 h-screen-navbar custom-scrollbar border-l border-slate-100 hidden lg:block", activeTab === 'preview' ? 'block' : 'hidden')}>
            <div className="sticky top-0 mb-8 z-10">
               <div className="glass p-6 rounded-3xl flex items-center justify-between border-white shadow-xl">
                  <div className="flex items-center space-x-4">
                     <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Live Architecture Preview</span>
                  </div>
                  <div className="flex items-center space-x-1">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                     <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Rendering...</span>
                  </div>
               </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] mx-auto p-[15mm] border border-white relative overflow-hidden ring-1 ring-slate-100 rounded-lg origin-top scale-[0.9] transition-transform duration-700" style={{ width: '210mm', minHeight: '297mm' }}>
               {/* Simplified Preview Header */}
               <div className="flex justify-between mb-16 px-4">
                  {settings?.logo_url ? <img src={settings.logo_url} className="w-32 grayscale" /> : <div className="w-32 h-12 bg-slate-50 border border-dashed border-slate-200 rounded"></div>}
                  <div className="text-right">
                     <span className="text-xs font-black uppercase tracking-tighter text-slate-900">{meta.number || 'DOC-XXXX'}</span>
                     <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-2">Emission: {format(parseISO(meta.date), 'dd/MM/yyyy')}</p>
                  </div>
               </div>

               <div className="mb-20 px-4">
                  <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">RECIPIENT ARCHITECTURE</h4>
                  <div className="space-y-1">
                     <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{client.name || 'CLIENT NAME NON-DÉFINI'}</p>
                     <p className="text-[10px] font-bold text-slate-400">ICE : {client.ice || '---'}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">{client.address || '---'}</p>
                  </div>
               </div>

               <table className="w-full border-collapse mb-10">
                  <thead className="border-b-2 border-slate-900">
                    <tr>
                      <th className="py-4 text-left text-[8px] font-black uppercase tracking-widest px-4">Service Description</th>
                      <th className="py-4 text-right text-[8px] font-black uppercase tracking-widest px-4">Total (TTC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((it, idx) => (
                      <tr key={idx} className="group">
                        <td className="py-6 px-4">
                          <p className="text-[10px] font-black uppercase tracking-tight text-slate-900">{it.desc || 'DESCRIPTION INDISPONIBLE'}</p>
                          <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase italic">{it.qty} UNITÉS × {Number(it.price).toLocaleString()} {meta.currency}</p>
                        </td>
                        <td className="py-6 px-4 text-right align-top">
                          <span className="text-[11px] font-black text-slate-900 tabular-nums">
                            {(Number(it.qty) * Number(it.price) * (1 + Number(it.tax)/100)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
                      <tr key={`spacer-${i}`} className="opacity-0"><td className="py-6">&nbsp;</td><td></td></tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col items-end px-4 border-t border-slate-100 pt-8 mt-auto">
                   <div className="w-[300px] space-y-3">
                      <div className="flex justify-between">
                         <span className="text-[9px] font-black text-slate-300 uppercase underline decoration-slate-100">SUBTOTAL HT</span>
                         <span className="text-[11px] font-black text-slate-900 uppercase">{totals.subtotal.toLocaleString('fr-MA')} {meta.currency}</span>
                      </div>
                      <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-2xl shadow-xl transform rotate-1">
                         <span className="text-[9px] font-black uppercase tracking-widest">NET PAYABLE TTC</span>
                         <span className="text-xl font-black tabular-nums">{totals.ttc.toLocaleString('fr-MA')} {meta.currency}</span>
                      </div>
                   </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/[0.02] pointer-events-none" />
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-orange-600/5 blur-[100px] border border-orange-600/10 rounded-full" />
            </div>

            <div className="flex flex-col items-center mt-12 opacity-30">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Final Document Architecture</p>
               <div className="w-1 h-20 bg-gradient-to-b from-slate-200 to-transparent mt-4" />
            </div>
         </div>
      </div>
    </div>
  );
}
