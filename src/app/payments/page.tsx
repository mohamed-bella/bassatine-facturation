'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Payment, Invoice, Client } from '@/types';
import { formatMAD } from '@/lib/calculations';
import { format, parseISO } from 'date-fns';
import {
  CreditCard,
  Search,
  Loader2,
  Trash2,
  ArrowRight,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({});
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pData }, { data: iData }, { data: cData }] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('invoices').select('*'),
      supabase.from('clients').select('*'),
    ]);

    setPayments(pData || []);

    const invMap: Record<string, Invoice> = {};
    (iData || []).forEach(inv => { invMap[inv.id] = inv; });
    setInvoices(invMap);

    const clientMap: Record<string, Client> = {};
    (cData || []).forEach(c => { clientMap[c.id] = c; });
    setClients(clientMap);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const invNum = invoices[p.invoice_id]?.invoice_number || '';
      const clientName = invoices[p.invoice_id]?.client_id ? clients[invoices[p.invoice_id]!.client_id!]?.name || '' : '';
      const matchSearch = p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
        invNum.toLowerCase().includes(search.toLowerCase()) ||
        clientName.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || p.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [payments, invoices, clients, search, typeFilter]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement des paiements...</span>
    </div>
  );

  const activePayments = filtered.filter(p => !p.is_cancelled);
  const cancelledPayments = filtered.filter(p => p.is_cancelled);
  const totalReceived = activePayments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* HEADER */}
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Finances</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Règlements</h1>
        </div>
        <Card className="bg-emerald-50 border-emerald-100 flex items-center px-6 py-3 rounded-2xl shadow-sm">
           <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 mr-4">
              <CheckCircle2 className="w-5 h-5 text-white" />
           </div>
           <div>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Total Encaissé</p>
              <p className="text-xl font-black text-emerald-700">{formatMAD(totalReceived)} MAD</p>
           </div>
        </Card>
      </header>

      {/* FILTERS */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° règlement, facture ou client..."
            className="pl-11 h-11 bg-white border-slate-200 rounded-xl text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-slate-50 p-1 rounded-xl">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'especes', label: 'Espèces' },
            { key: 'carte', label: 'Carte' },
            { key: 'virement', label: 'Virement' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${typeFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Paiements actifs', value: activePayments.length, color: 'text-emerald-500' },
          { label: 'Paiements annulés', value: cancelledPayments.length, color: 'text-rose-400' },
          { label: 'Moyenne / règlement', value: formatMAD(totalReceived / (activePayments.length || 1)), color: 'text-slate-900' },
          { label: 'Modes differents', value: new Set(activePayments.map(p => p.type)).size, color: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 border border-slate-50 rounded-2xl bg-white shadow-sm flex flex-col justify-between">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-3">{stat.label}</span>
             <span className={cn("text-lg font-black tracking-tight", stat.color)}>{stat.value}</span>
          </Card>
        ))}
      </div>

      {/* TABLE */}
      <Card className="border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableHead className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Référence</TableHead>
              <TableHead className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Facture</TableHead>
              <TableHead className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Mode</TableHead>
              <TableHead className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Montant</TableHead>
              <TableHead className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-24 text-center">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-100" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun règlement enregistré</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => {
                const inv = invoices[p.invoice_id];
                const client = inv?.client_id ? clients[inv.client_id!] : null;
                return (
                  <TableRow key={p.id} className={cn("group transition-colors", p.is_cancelled ? "opacity-50 grayscale bg-slate-50" : "hover:bg-slate-50/50")}>
                    <TableCell className="py-5 px-8">
                       <div className="flex flex-col">
                          <span className={cn("text-sm font-black text-slate-900 tabular-nums leading-none", p.is_cancelled && "line-through")}>{p.payment_number}</span>
                          <span className="text-[10px] text-muted-foreground mt-1.5 flex items-center font-bold">
                             <Calendar className="w-3 h-3 mr-1.5" /> {format(parseISO(p.payment_date), 'dd/MM/yyyy')}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell className="py-5 px-8">
                       <div className="flex flex-col">
                          {inv ? (
                            <Link href={`/facture-commerciale/${inv.id}/view`} className="text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors">
                              {inv.invoice_number}
                            </Link>
                          ) : <span className="text-xs text-rose-500 font-bold uppercase italic">Introuvable</span>}
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px] font-medium">{client?.name || '—'}</span>
                       </div>
                    </TableCell>
                    <TableCell className="py-5 px-8 text-center">
                       <Badge variant="outline" className={cn("rounded-lg text-[10px] font-black uppercase tracking-widest border px-3 py-1", 
                         p.type === 'especes' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' :
                         p.type === 'carte' ? 'border-blue-100 bg-blue-50 text-blue-600' :
                         'border-orange-100 bg-orange-50 text-orange-600'
                       )}>
                          {p.type}
                       </Badge>
                       {p.is_cancelled && (
                         <div className="text-[8px] font-black text-rose-500 uppercase mt-1">Annulé</div>
                       )}
                    </TableCell>
                    <TableCell className="py-5 px-8 text-right">
                       <span className={cn("text-sm font-black tabular-nums text-slate-900", p.is_cancelled && "text-slate-300")}>{formatMAD(p.amount)}</span>
                       <span className="text-[10px] font-bold text-slate-400 ml-1.5">MAD</span>
                    </TableCell>
                    <TableCell className="py-5 px-8 text-right">
                       <Button asChild variant="ghost" size="icon" className="w-9 h-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-orange-600 hover:bg-orange-50">
                          <Link href={`/facture-commerciale/${p.invoice_id}/view`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
