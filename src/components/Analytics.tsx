'use client';

import { useMemo } from 'react';
import { Invoice } from '@/types';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, Target } from 'lucide-react';

interface Props {
  invoices: Invoice[];
}

export default function Analytics({ invoices }: Props) {
  const stats = useMemo(() => {
    const activeInvoices = invoices.filter(inv => !inv.is_trashed && inv.invoice_type === 'commercial');
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));

    const currentMonthInvoices = activeInvoices.filter(inv => isSameMonth(new Date(inv.invoice_date), currentMonthStart));
    const lastMonthInvoices = activeInvoices.filter(inv => isSameMonth(new Date(inv.invoice_date), lastMonthStart));

    const currentRevenue = currentMonthInvoices.reduce((acc, inv) => acc + Number(inv.grand_total_ttc), 0);
    const lastRevenue = lastMonthInvoices.reduce((acc, inv) => acc + Number(inv.grand_total_ttc), 0);
    const currentVat = currentMonthInvoices.reduce((acc, inv) => acc + Number(inv.tax_total), 0);

    const growth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const pendingAmount = activeInvoices.filter(i => i.invoice_status === 'sent' || i.invoice_status === 'overdue').reduce((acc, i) => acc + Number(i.grand_total_ttc), 0);

    return {
      revenue: currentRevenue,
      vat: currentVat,
      growth: growth.toFixed(1),
      pending: pendingAmount,
      totalCount: activeInvoices.length,
      paidRatio: Math.round((activeInvoices.filter(i => i.invoice_status === 'paid').length / activeInvoices.length) * 100) || 0,
    };
  }, [invoices]);

  const cards = [
    { 
      label: 'Monthly Revenue', 
      value: stats.revenue, 
      unit: 'DH', 
      icon: DollarSign, 
      growth: stats.growth, 
      color: 'orange',
      meta: 'votre objectif de 120k'
    },
    { 
      label: 'Total Collected VAT', 
      value: stats.vat, 
      unit: 'DH', 
      icon: PieChart, 
      growth: null, 
      color: 'slate',
      meta: 'Basé sur taux standard 10%'
    },
    { 
      label: 'Portfolio Health', 
      value: stats.paidRatio, 
      unit: '%', 
      icon: Activity, 
      growth: null, 
      color: 'emerald',
      meta: 'Taux de paiement global'
    },
    { 
      label: 'Active Receivables', 
      value: stats.pending, 
      unit: 'DH', 
      icon: TrendingDown, 
      growth: null, 
      color: 'rose', 
      meta: 'Factures en attente'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="spatial-card p-10 relative group"
        >
          <div className="flex justify-between items-start mb-10">
            <div className={`w-14 h-14 bg-${card.color}-500/10 rounded-2xl flex items-center justify-center transition-all group-hover:bg-slate-900 group-hover:text-white`}>
              <card.icon className={`w-6 h-6 text-${card.color}-600 group-hover:text-white transition-colors`} />
            </div>
            {card.growth && (
               <div className={`flex items-center space-x-1 ${Number(card.growth) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                 <TrendingUp className="w-3 h-3 pt-[2px]" />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">{card.growth}%</span>
               </div>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] mb-2">{card.label}</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-orange-600 transition-colors tabular-nums">{card.value.toLocaleString('fr-MA')}</span>
              <span className="text-xs font-black text-slate-200 group-hover:text-slate-900 transition-all">{card.unit}</span>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-50 flex items-center space-x-2 whitespace-nowrap overflow-hidden">
               <span className="text-[9px] font-black uppercase text-slate-200 tracking-[0.2em] group-hover:text-slate-400 block truncate">{card.meta}</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-50 overflow-hidden rounded-b-3xl">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, delay: 0.5 + i * 0.1 }}
                className={`h-full bg-${card.color}-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] opacity-50`}
              />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
