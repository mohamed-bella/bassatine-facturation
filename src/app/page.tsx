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
    <div className="space-y-10 animate-slide-up pb-20 max-w-5xl mx-auto">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-2">Centre de contrôle</p>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Bonjour, Bassatine.</h1>
        </div>
        <div className="flex items-center space-x-3">
           <Link href="/backup">
              <Button variant="outline" className="h-12 px-6 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50 transition-all">
                 <FileSpreadsheet className="w-4 h-4 mr-2" /> Backup & Sync
              </Button>
           </Link>
           <Link href="/facture-commerciale/new">
              <Button className="h-12 px-6 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-black transition-all shadow-xl shadow-slate-900/10">
                 <Plus className="w-4 h-4 mr-2" /> Facture Commerciale
              </Button>
           </Link>
           <Link href="/clients">
              <Button variant="outline" className="h-12 px-6 rounded-xl text-xs font-bold border-slate-200">
                 <Users className="w-4 h-4 mr-2" /> Nouveau Client
              </Button>
           </Link>
        </div>
      </header>

      {/* KPI GRID - MINIMAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'C.A (Mois)', value: formatMAD(stats.monthSales), color: 'text-blue-600' },
           { label: 'Total Encaissé', value: formatMAD(stats.totalPaid), color: 'text-emerald-600' },
           { label: 'À percevoir', value: formatMAD(stats.totalDue), color: 'text-rose-600' },
           { label: 'F. Proforma actifs', value: stats.openProformas, color: 'text-orange-600' },
         ].map((stat, i) => (
           <div key={i} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className={cn("text-xl font-black tabular-nums leading-none tracking-tight", stat.color)}>
                 {stat.value} {typeof stat.value === 'string' && stat.value.includes(',') ? <span className="text-[10px] font-bold opacity-30">MAD</span> : ''}
              </h4>
           </div>
         ))}
      </div>

      <div className="space-y-6">
         <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Activité récente</h3>
         <Card className="border border-slate-100 rounded-3xl bg-white overflow-hidden p-2 shadow-sm">
            <CardContent className="p-6 space-y-6">
               {recentActivity.map((doc, i) => {
                 const client = clients.find(c => c.id === doc.client_id);
                 const isInvoice = (doc as any).type === 'facture';
                 const number = isInvoice ? (doc as Invoice).invoice_number : (doc as Proforma).proforma_number;
                 const amount = isInvoice ? (doc as Invoice).total_ttc : (doc as Proforma).total_ttc;
                 const url = isInvoice ? `/facture-commerciale/${doc.id}/view` : `/proforma/${doc.id}/view`;

                 return (
                   <Link key={i} href={url} className="flex justify-between items-center group cursor-pointer hover:bg-slate-50 p-3 rounded-2xl transition-colors">
                      <div className="flex items-center space-x-4">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all", isInvoice ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900')}>
                            {isInvoice ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase leading-none mb-1 group-hover:text-orange-600 transition-colors">{number}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client?.name || '—'}</p>
                         </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                         <span className="text-sm font-black tabular-nums leading-none mb-1 text-slate-900">{formatMAD(Number(amount))}</span>
                         <span className="text-[8px] font-bold text-slate-300 uppercase">{format(parseISO(doc.created_at), 'dd MMM')}</span>
                      </div>
                   </Link>
                 );
               })}
               
               <Link href="/f-commercial" className="block">
                  <Button variant="ghost" className="w-full h-12 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-4 border border-dashed border-slate-200">
                     Voir tout le flux <ArrowRight className="w-4 h-4 ml-3" />
                  </Button>
               </Link>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
