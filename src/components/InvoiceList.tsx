'use client';

import { useState, useMemo } from 'react';
import { Invoice } from '@/types';
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  ChevronDown,
  ArrowUpDown,
  FileSearch,
  Zap,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface Props {
  invoices: Invoice[];
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function InvoiceList({ invoices, onTrash, onRestore, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.recipient_name.toLowerCase().includes(search.toLowerCase()) || 
        inv.invoice_number.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = typeFilter === 'all' || inv.invoice_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || inv.invoice_status === statusFilter;
      
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        matchesDate = isWithinInterval(parseISO(inv.invoice_date), {
          start: parseISO(dateRange.start),
          end: parseISO(dateRange.end)
        });
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [invoices, search, typeFilter, statusFilter, dateRange]);

  const stats = useMemo(() => {
    return {
      total: filtered.reduce((acc, i) => acc + Number(i.grand_total_ttc), 0),
      count: filtered.length,
      unpaid: filtered.filter(i => i.invoice_status !== 'paid').reduce((acc, i) => acc + Number(i.grand_total_ttc), 0)
    };
  }, [filtered]);

  const handleExport = () => {
    const csv = [
      ['Date', 'Numéro', 'Client', 'ICE', 'Type', 'Status', 'HT', 'TVA', 'TTC'].join(','),
      ...filtered.map(i => [
        i.invoice_date,
        i.invoice_number,
        `"${i.recipient_name}"`,
        i.recipient_ice,
        i.invoice_type,
        i.invoice_status,
        i.subtotal_ht,
        i.tax_total,
        i.grand_total_ttc
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factures-Export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid': return <span className="badge-paid">Settled</span>;
      case 'overdue': return <span className="badge-overdue">Delayed</span>;
      case 'sent': return <span className="badge-pending">Open</span>;
      case 'draft': return <span className="badge-draft">Private</span>;
      default: return <span className="badge-draft">{status}</span>;
    }
  };

  return (
    <div className="space-y-10 animate-slide-up pb-40">
      {/* RICH TABLE FILTERING ENGINE */}
      <section className="spatial-card bg-white p-10 flex flex-col space-y-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] mb-1">Universal Registry</span>
             <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Documents Archive</h2>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={handleExport} className="flex items-center space-x-3 bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-900/10 hover:shadow-orange-600/20 group">
               <Download className="w-3.5 h-3.5 group-hover:-translate-y-1 transition-transform" />
               <span>Export CSV Registry</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
           <div className="relative group col-span-1 lg:col-span-2">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-orange-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Find Record nr. or Client identity..."
                className="w-full bg-slate-50 border-none pl-14 pr-6 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-slate-900 placeholder:text-slate-200"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-50 border-none p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:ring-1 focus:ring-slate-900 appearance-none shadow-inner border border-slate-100"
           >
              <option value="all">Document Types [ALL]</option>
              <option value="commercial">Commercial Invoices</option>
              <option value="proforma">Proformas Registry</option>
           </select>

           <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border-none p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:ring-1 focus:ring-slate-900 appearance-none shadow-inner border border-slate-100"
           >
              <option value="all">Fulfillment Status [ALL]</option>
              <option value="paid">Settled Records</option>
              <option value="sent">Awaiting Payment</option>
              <option value="overdue">Overdue Claims</option>
              <option value="draft">Private Drafts</option>
           </select>

           <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex items-center space-x-2">
              <input 
                type="date" 
                className="bg-transparent border-none p-2 text-[10px] font-black text-slate-400 focus:ring-0 uppercase h-full w-full"
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
              />
              <span className="text-[10px] font-black text-slate-200 uppercase">to</span>
              <input 
                type="date" 
                className="bg-transparent border-none p-2 text-[10px] font-black text-slate-400 focus:ring-0 uppercase h-full w-full"
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
              />
           </div>
        </div>
      </section>

      {/* QUICK INSIGHT SUMMARY */}
      <AnimatePresence>
        {filtered.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-6 px-10"
          >
            <div className="flex items-center space-x-3 bg-slate-900 text-white px-8 py-3 rounded-full shadow-2xl shadow-slate-900/10">
               <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
               <span className="text-[10px] font-black uppercase tracking-widest">{filtered.length} Results Matching Logic</span>
            </div>
            <div className="flex items-center space-x-3 bg-white px-8 py-3 rounded-full shadow-sm border border-slate-100/50">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Summation Reality:</span>
               <span className="text-sm font-black text-slate-900 tabular-nums">{stats.total.toLocaleString('fr-MA')} DH</span>
            </div>
            {stats.unpaid > 0 && (
                <div className="flex items-center space-x-3 bg-rose-50 px-8 py-3 rounded-full border border-rose-100 ring-4 ring-white">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Unsettled: {stats.unpaid.toLocaleString('fr-MA')} DH</span>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* THE TABLE SYSTEM */}
      <section className="spatial-card bg-white p-0 overflow-hidden group">
         <table className="w-full border-collapse">
            <thead>
               <tr className="bg-slate-900 text-white">
                  <th className="py-8 px-10 text-left text-[10px] font-black uppercase tracking-widest opacity-40">Document Nr.</th>
                  <th className="py-8 px-10 text-left text-[10px] font-black uppercase tracking-widest">Recipient Authority</th>
                  <th className="py-8 px-10 text-center text-[10px] font-black uppercase tracking-widest opacity-40">Type</th>
                  <th className="py-8 px-10 text-center text-[10px] font-black uppercase tracking-widest">Status Flow</th>
                  <th className="py-8 px-10 text-right text-[10px] font-black uppercase tracking-widest">Amount Reality</th>
                  <th className="py-8 px-10 text-right text-[10px] font-black uppercase tracking-widest opacity-40">Sync State</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {filtered.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="py-40 text-center">
                       <div className="flex flex-col items-center opacity-10">
                          <FileSearch className="w-20 h-20 mb-6" />
                          <span className="text-[11px] font-black uppercase tracking-widest">No matching records found in this universe</span>
                       </div>
                    </td>
                 </tr>
               ) : (
                 filtered.map((inv, idx) => (
                   <motion.tr 
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-slate-50/50 cursor-pointer transition-all relative"
                   >
                      <td className="py-10 px-10">
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 tracking-tighter group-hover:text-orange-600 transition-colors uppercase">{inv.invoice_number}</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest pt-2 flex items-center">
                               <Clock className="w-3 h-3 mr-2" />
                               {format(parseISO(inv.invoice_date), 'dd MMMM yyyy').toUpperCase()}
                            </span>
                         </div>
                      </td>
                      <td className="py-10 px-10">
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{inv.recipient_name}</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pt-1">ICE : {inv.recipient_ice}</span>
                         </div>
                      </td>
                      <td className="py-10 px-10 text-center">
                         <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            inv.invoice_type === 'proforma' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                         }`}>
                           {inv.invoice_type}
                         </span>
                      </td>
                      <td className="py-10 px-10 text-center">
                         {getStatusBadge(inv.invoice_status)}
                      </td>
                      <td className="py-10 px-10 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-slate-900 tabular-nums tracking-tighter group-hover:scale-105 transition-transform origin-right">
                               {Number(inv.grand_total_ttc).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                               <span className="text-xs font-black text-slate-200 ml-1">{inv.currency}</span>
                            </span>
                            <span className="text-[8px] font-black uppercase text-slate-200 tracking-widest group-hover:text-slate-400 transition-colors">Tax Included TTC</span>
                         </div>
                      </td>
                      <td className="py-10 px-10 text-right">
                         <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                            <Link href={`/invoice/${inv.id}/view`} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                               <ExternalLink className="w-4 h-4" />
                            </Link>
                            <Link href={`/invoice/${inv.id}/edit`} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-sm">
                               <Edit className="w-4 h-4" />
                            </Link>
                            {inv.is_trashed ? (
                               <button onClick={() => onRestore(inv.id)} className="w-10 h-10 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all">
                                 <RotateCcw className="w-4 h-4" />
                               </button>
                            ) : (
                               <button onClick={() => onTrash(inv.id)} className="w-10 h-10 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            )}
                         </div>
                      </td>
                   </motion.tr>
                 ))
               )}
            </tbody>
         </table>
         
         <div className="absolute top-[-200px] left-[-200px] w-96 h-96 bg-orange-600/5 blur-[150px] pointer-events-none transition-all duration-700 group-hover:bg-orange-600/10" />
      </section>
    </div>
  );
}
