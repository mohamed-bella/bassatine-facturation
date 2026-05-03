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
  Grid,
  Calendar,
  LogIn,
  LogOut
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";


export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [todayData, setTodayData] = useState<{arrivals: any[], departures: any[]}>({ arrivals: [], departures: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: iData }, { data: pData }, { data: payData }, { data: cData }, tRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('proformas').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('is_cancelled', false),
        supabase.from('clients').select('*'),
        fetch('/api/dashboard/today'),
      ]);

      const tData = await tRes.json();

      setInvoices(iData || []);
      setProformas(pData || []);
      setPayments(payData || []);
      setClients(cData || []);
      setTodayData(tData);
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

    return { 
      monthSales, 
      totalDue, 
      totalPaid, 
      openProformas,
      arrivals: todayData?.arrivals?.length || 0,
      departures: todayData?.departures?.length || 0
    };
  }, [invoices, proformas, payments, todayData]);


  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initialisation du système...</span>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 max-w-[1400px] mx-auto px-4 md:px-10 mt-6 relative overflow-visible">
      
      {/* HEADER SECTION */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 relative z-10"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/40 backdrop-blur-md border border-white/40 mb-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Système opérationnel</span>
          </div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-none"
          >
            Bonjour, <span className="text-orange-600">Bassatine.</span>
          </motion.h1>
          <p className="text-xs md:text-sm font-bold text-slate-500/80 uppercase tracking-widest">Contrôle et pilotage de la gestion de luxe.</p>
        </div>
        
         <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 scrollbar-hide">
            <Link href="/channel-manager">
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="h-14 px-8 rounded-2xl text-[11px] font-black bg-orange-600 hover:bg-orange-700 text-white transition-all flex items-center shadow-lg cursor-pointer"
               >
                  <Calendar className="w-4 h-4 mr-2" /> MANAGE CALENDAR
               </motion.button>
            </Link>
            <Link href="/backup">
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="h-14 px-8 rounded-2xl text-[11px] font-black border border-white/40 bg-white/60 backdrop-blur-md text-slate-900 hover:bg-white hover:shadow-xl transition-all flex items-center shadow-lg cursor-pointer"
               >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-400" /> SYNC & BACKUP
               </motion.button>
            </Link>
            <Link href="/facture-commerciale/new">
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black transition-all shadow-2xl flex items-center border border-slate-800 cursor-pointer"
               >
                  <Plus className="w-4 h-4 mr-2" /> NOUVELLE FACTURE
               </motion.button>
            </Link>
         </div>

      </motion.header>

      {/* KPI GRID - GLASS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 lg:gap-8">
         {[
           { label: 'C.A (Mois)', value: formatMAD(stats.monthSales), color: 'text-blue-600', bg: 'bg-blue-500/10', icon: TrendingUp, iconColor: 'text-blue-600' },
           { label: 'Encaissé', value: formatMAD(stats.totalPaid), color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CheckCircle2, iconColor: 'text-emerald-600' },
           { label: 'À percevoir', value: formatMAD(stats.totalDue), color: 'text-rose-600', bg: 'bg-rose-500/10', icon: AlertTriangle, iconColor: 'text-rose-600' },
           { label: 'Arrivées', value: stats.arrivals, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: LogIn, iconColor: 'text-emerald-500', isNumber: true },
           { label: 'Départs', value: stats.departures, color: 'text-orange-500', bg: 'bg-orange-500/10', icon: LogOut, iconColor: 'text-orange-500', isNumber: true },
           { label: 'Proformas', value: stats.openProformas, color: 'text-slate-600', bg: 'bg-slate-100', icon: FileText, iconColor: 'text-slate-600', isNumber: true },
         ].map((stat, i) => {

           const Icon = stat.icon;
           return (
             <motion.div 
               key={i} 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               whileHover={{ y: -8, scale: 1.02 }}
               className="relative p-8 rounded-[2.5rem] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] overflow-hidden group"
             >
                <div className="flex justify-between items-start mb-8 relative z-10">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} backdrop-blur-md`}>
                      <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                   </div>
                   {!stat.isNumber && <Badge className="bg-white/40 text-slate-400 font-bold text-[9px] uppercase tracking-widest px-2 backdrop-blur-md">MAD</Badge>}
                </div>
                <div className="relative z-10">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                   <h4 className={cn("text-3xl font-black tabular-nums tracking-tighter leading-none", stat.color)}>
                      {stat.value}
                   </h4>
                </div>
             </motion.div>
           );
         })}
      </div>

      <div className="space-y-10">
         <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center">
               <Grid className="w-7 h-7 mr-4 text-orange-600" />
               Actions Stratégiques
            </h3>
         </div>

         {/* COLORFUL BENTO GRID - GLASSMORPHISM EDITION */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 auto-rows-[220px]">
            
            {/* AI Generation - Large Highlight Card */}
            <motion.div
               whileHover={{ scale: 1.01 }}
               whileTap={{ scale: 0.98 }}
               className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl shadow-slate-900/40"
            >
               <Link href="/facture-commerciale/ai" className="absolute inset-0 block">
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:scale-125 transition-transform duration-1000"></div>
                  <div className="absolute inset-0 p-12 flex flex-col justify-between z-10">
                     <div className="w-20 h-20 bg-orange-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-600/40 group-hover:rotate-12 transition-all duration-700">
                        <Sparkles className="w-10 h-10 text-white" />
                     </div>
                     <div>
                        <Badge className="bg-orange-500/20 text-orange-400 font-black text-[10px] tracking-widest mb-4 py-1 px-4 rounded-full backdrop-blur-xl">INTELLIGENCE ARTIFICIELLE</Badge>
                        <h4 className="text-white font-black text-4xl lg:text-6xl tracking-tighter leading-none mb-6">IA Billing Pro</h4>
                        <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">Dictez vos ventes en langage naturel et générez vos PDF instantanément.</p>
                     </div>
                  </div>
               </Link>
            </motion.div>

            {/* Listes - Glass Tiles */}
            {[
               { href: '/channel-manager', label: 'Calendrier', title: 'Reservations Manager', icon: Calendar, color: 'blue', span: 'col-span-1 md:col-span-2 lg:col-span-4' },
               { href: '/f-commercial', label: 'Archive', title: 'Factures Commerciales', icon: FolderOpen, color: 'blue' },
               { href: '/proformas', label: 'Archive', title: 'Factures Proformas', icon: FolderOpen, color: 'emerald' },
               { href: '/facture-commerciale/new', label: 'Générer', title: 'Nouveau Document', icon: Plus, color: 'orange' },
               { href: '/proforma/new', label: 'Générer', title: 'Nouvelle Proforma', icon: Plus, color: 'slate' },
               { href: '/clients', label: 'Partenaires', title: 'Agences & Clients', icon: Users, color: 'pink', span: 'col-span-1 lg:col-span-2' },
               { href: '/catalog', label: 'Rooms', title: 'Catalogue Hébergement', icon: Bed, color: 'cyan', span: 'col-span-1 lg:col-span-2' },
            ].map((item, i) => {
               const Icon = item.icon;
               const colorClass: any = {
                  blue: 'text-blue-600 bg-blue-500/10',
                  emerald: 'text-emerald-600 bg-emerald-500/10',
                  orange: 'text-orange-600 bg-orange-500/10',
                  slate: 'text-slate-600 bg-slate-500/10',
                  pink: 'text-pink-600 bg-pink-500/10',
                  cyan: 'text-cyan-600 bg-cyan-500/10',
               };
               
               return (
                  <motion.div
                    key={i}
                    whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.8)' }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(item.span || "", "group rounded-[2.5rem] bg-white/60 backdrop-blur-xl p-8 lg:p-10 flex flex-col justify-between hover:shadow-2xl transition-all border border-white/60 cursor-pointer overflow-hidden")}
                  >
                     <Link href={item.href} className="flex flex-col h-full justify-between">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300", colorClass[item.color])}>
                           <Icon className="w-7 h-7" />
                        </div>
                        <div>
                           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{item.label}</p>
                           <h4 className="text-slate-900 font-black text-lg leading-tight uppercase tracking-tighter group-hover:text-orange-600 transition-colors">{item.title}</h4>
                        </div>
                     </Link>
                  </motion.div>
               );
            })}
         </div>
      </div>
    </div>
  );
}
