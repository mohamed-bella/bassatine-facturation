'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice, Proforma, Payment, Client } from '@/types';
import { formatMAD, calcAmountPaid, calcAmountDue } from '@/lib/calculations';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Bed,
  FileSpreadsheet,
  Sparkles,
  FolderOpen,
  Tag,
  Grid
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: iData }, { data: pData }, { data: payData }, { data: cData }] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('proformas').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('is_cancelled', false),
        supabase.from('clients').select('*'),
      ]);

      setInvoices(iData || []);
      setProformas(pData || []);
      setPayments(payData || []);
      setClients(cData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthInvoices = invoices.filter(inv => isWithinInterval(parseISO(inv.created_at), { start: monthStart, end: monthEnd }));
    const monthSales = monthInvoices.reduce((acc, inv) => acc + Number(inv.total_ttc || (inv as any).grand_total_ttc || 0), 0);

    const activeInvoices = invoices.filter(inv => inv.status !== 'brouillon');
    const totalDue = activeInvoices.reduce((acc, inv) => {
       const invPayments = payments.filter(p => p.invoice_id === inv.id);
       const totalTtc = Number(inv.total_ttc || (inv as any).grand_total_ttc || 0);
       return acc + calcAmountDue(totalTtc, calcAmountPaid(invPayments));
    }, 0);

    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    const openProformas = proformas.filter(p => p.status === 'envoyé' || p.status === 'brouillon').length;

    return { monthSales, totalDue, totalPaid, openProformas };
  }, [invoices, proformas, payments]);

  const arrivalsToday = useMemo(() => {
    const today = new Date();
    return invoices.filter(inv => {
      const isToday = isSameDay(parseISO(inv.created_at), today);
      const isRoom = (inv.items_json || []).some(item => {
        const desc = (item.description || (item as any).desc || '').toLowerCase();
        return desc.includes('chambre') || desc.includes('nuitée') || desc.includes('séjour');
      });
      return isToday && isRoom;
    });
  }, [invoices]);

  const recentActivity = useMemo(() => {
    const combined = [
      ...invoices.map(inv => ({ ...inv, type: 'facture' as const })),
      ...proformas.map(p => ({ ...p, type: 'proforma' as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined.slice(0, 5);
  }, [invoices, proformas]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initialisation du système...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-slide-up pb-24 max-w-6xl mx-auto px-4 md:px-8 mt-4">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-slate-200 mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Système opérationnel</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">Bonjour, Bassatine.</h1>
          <p className="text-sm font-bold text-slate-400 mt-2">Aperçu et gestion de vos activités récentes.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <Link href="/backup" className="shrink-0">
              <Button variant="outline" className="h-12 px-6 rounded-2xl text-xs font-black border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-md">
                 <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-400" /> Sauvegardes
              </Button>
           </Link>
           <Link href="/facture-commerciale/new" className="shrink-0">
              <Button className="h-12 px-6 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-slate-900/10 border border-slate-800">
                 <Plus className="w-4 h-4 mr-2" /> Créer Facture
              </Button>
           </Link>
        </div>
      </header>

      {/* KPI GRID - SOLID WHITE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'C.A (Mois)', value: formatMAD(stats.monthSales), color: 'text-blue-600', bg: 'bg-blue-50', icon: TrendingUp, iconColor: 'text-blue-500' },
           { label: 'Total Encaissé', value: formatMAD(stats.totalPaid), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-500' },
           { label: 'À percevoir', value: formatMAD(stats.totalDue), color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertTriangle, iconColor: 'text-rose-500' },
           { label: 'F. Proforma Actifs', value: stats.openProformas, color: 'text-orange-600', bg: 'bg-orange-50', icon: FileText, iconColor: 'text-orange-500', isNumber: true },
         ].map((stat, i) => {
           const Icon = stat.icon;
           return (
             <div key={i} className="relative p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden group hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6 relative z-10">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} shadow-inner`}>
                      <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                   </div>
                   {!stat.isNumber && <Badge variant="outline" className="border-slate-100 text-slate-300 font-black bg-slate-50 text-[9px] uppercase tracking-widest px-2">MAD</Badge>}
                </div>
                <div className="relative z-10">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{stat.label}</p>
                   <h4 className={cn("text-3xl font-black tabular-nums tracking-tighter", stat.color)}>
                      {stat.value}
                   </h4>
                </div>
             </div>
           );
         })}
      </div>

      <div className="space-y-8 pt-4">
         <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center">
               <Grid className="w-6 h-6 mr-4 text-orange-600" />
               Actions Rapides
            </h3>
         </div>

         {/* COLORFUL BENTO GRID - REIMAGINED AS SOLID WHITE CARDS */}
         <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[160px] gap-6">
            
            {/* AI Generation - Large White Highlight */}
            <Link href="/facture-commerciale/ai" className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-[3rem] bg-white p-10 flex flex-col justify-between border-2 border-orange-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:shadow-2xl transition-all duration-500">
               <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700"></div>
               <div className="w-16 h-16 bg-orange-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-orange-600/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 z-10">
                  <Sparkles className="w-8 h-8 text-white" />
               </div>
               <div className="z-10 mt-auto">
                  <h4 className="text-slate-900 font-black text-3xl md:text-4xl transition-colors tracking-tight leading-none mb-3">Générateur IA</h4>
                  <p className="text-slate-400 text-sm font-bold tracking-tight leading-relaxed max-w-sm">Dictez votre facture en langage naturel. L'intelligence artificielle s'occupe de structurer les données instantanément.</p>
               </div>
            </Link>

            {/* Listes - Clean white tiles */}
            <Link href="/f-commercial" className="md:col-span-1 group rounded-[3rem] bg-white p-8 flex flex-col justify-between hover:shadow-2xl hover:border-blue-200 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="w-12 h-12 bg-blue-50 rounded-[1.2rem] flex items-center justify-center border border-blue-100 z-10 transition-all group-hover:bg-blue-600">
                  <FolderOpen className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
               </div>
               <div className="z-10">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 leading-none">Archive</p>
                  <h4 className="text-slate-900 font-black text-base leading-tight uppercase group-hover:text-blue-600 transition-colors tracking-tighter">Factures<br/>Commerciales</h4>
               </div>
            </Link>

            <Link href="/proformas" className="md:col-span-1 group rounded-[3rem] bg-white p-8 flex flex-col justify-between hover:shadow-2xl hover:border-emerald-200 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="w-12 h-12 bg-emerald-50 rounded-[1.2rem] flex items-center justify-center border border-emerald-100 z-10 transition-all group-hover:bg-emerald-600">
                  <FolderOpen className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
               </div>
               <div className="z-10">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 leading-none">Archive</p>
                  <h4 className="text-slate-900 font-black text-base leading-tight uppercase group-hover:text-emerald-600 transition-colors tracking-tighter">Factures<br/>Proformas</h4>
               </div>
            </Link>

            {/* Create Actions */}
            <Link href="/facture-commerciale/new" className="md:col-span-1 group rounded-[3rem] bg-white p-8 flex flex-col justify-between hover:shadow-2xl hover:border-orange-200 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="w-12 h-12 bg-slate-50 rounded-[1.2rem] flex items-center justify-center group-hover:bg-orange-600 transition-all duration-300">
                  <Plus className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
               </div>
               <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 leading-none">Nouveau</p>
                  <h4 className="text-slate-900 font-black text-base leading-tight uppercase group-hover:text-orange-600 transition-colors tracking-tighter">Nouvelle Facture<br/>Commerciale</h4>
               </div>
            </Link>

            <Link href="/proforma/new" className="md:col-span-1 group rounded-[3rem] bg-white p-8 flex flex-col justify-between hover:shadow-2xl hover:border-slate-300 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="w-12 h-12 bg-slate-50 rounded-[1.2rem] flex items-center justify-center group-hover:bg-slate-900 transition-all duration-300">
                  <Plus className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
               </div>
               <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 leading-none">Nouveau</p>
                  <h4 className="text-slate-900 font-black text-base leading-tight uppercase group-hover:text-slate-900 transition-colors tracking-tighter">Nouvelle Facture<br/>Proforma</h4>
               </div>
            </Link>

            {/* Management Actions */}
            <Link href="/clients" className="md:col-span-2 lg:col-span-1 group rounded-[3rem] bg-white p-8 flex flex-col justify-between hover:shadow-2xl hover:border-pink-200 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="w-12 h-12 bg-pink-50 rounded-[1.2rem] flex items-center justify-center border border-pink-100 z-10 transition-all group-hover:bg-pink-600">
                  <Users className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors" />
               </div>
               <div className="z-10">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 leading-none">Partenaires</p>
                  <h4 className="text-white font-black text-base leading-tight uppercase group-hover:text-pink-600 transition-colors tracking-tighter text-slate-900">Gérer Les les<br/>Agences Clients</h4>
               </div>
            </Link>

            <Link href="/catalog" className="md:col-span-2 lg:col-span-1 group rounded-[3rem] bg-white p-8 flex flex-col justify-between hover:shadow-2xl hover:border-cyan-200 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="w-12 h-12 bg-cyan-50 rounded-[1.2rem] flex items-center justify-center border border-cyan-100 z-10 transition-all group-hover:bg-cyan-600">
                  <Bed className="w-6 h-6 text-cyan-600 group-hover:text-white transition-colors" />
               </div>
               <div className="z-10">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 leading-none">Catalogue</p>
                  <h4 className="text-white font-black text-base leading-tight uppercase group-hover:text-cyan-600 transition-colors tracking-tighter text-slate-900">Catalogue des<br/>Chambres & Services</h4>
               </div>
            </Link>

         </div>
      </div>
    </div>
  );
}
