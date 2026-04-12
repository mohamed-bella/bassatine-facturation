'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice, Client, Payment } from '@/types';
import { formatMAD, calcAmountPaid, calcAmountDue } from '@/lib/calculations';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import {
  Plus,
  Search,
  Loader2,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { motion } from "framer-motion";
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'envoyée': { label: 'Envoyée', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  'partiellement_payée': { label: 'Partiellement payée', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  'payée': { label: 'Payée', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  'en_retard': { label: 'En retard', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: iData }, { data: cData }, { data: pData }] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*'),
      supabase.from('payments').select('*').eq('is_cancelled', false),
    ]);

    const clientMap: Record<string, Client> = {};
    (cData || []).forEach(c => { clientMap[c.id] = c; });
    setClients(clientMap);

    const paymentMap: Record<string, Payment[]> = {};
    (pData || []).forEach(p => {
      if (!paymentMap[p.invoice_id]) paymentMap[p.invoice_id] = [];
      paymentMap[p.invoice_id].push(p);
    });

    const enrichedInvoices = (iData || []).map(inv => {
      const invPayments = paymentMap[inv.id] || [];
      const paid = calcAmountPaid(invPayments);
      const totalTtc = Number(inv.total_ttc || (inv as any).grand_total_ttc || 0);
      const due = calcAmountDue(totalTtc, paid);

      // Simple overdue calculation: if due_date is passed and not fully paid
      let status = inv.status;
      if (status !== 'payée' && status !== 'brouillon' && inv.due_date) {
        if (isBefore(parseISO(inv.due_date), startOfDay(new Date()))) {
          status = 'en_retard';
        }
      }

      return {
        ...inv,
        total_ttc: totalTtc,
        amount_paid: paid,
        amount_due: due,
        status: status as any
      };
    });

    setInvoices(enrichedInvoices);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture ?')) return;
    await supabase.from('invoices').delete().eq('id', id);
    fetchData();
  };

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const clientName = inv.client_id ? clients[inv.client_id]?.name || '' : (inv.recipient_name || '');
      const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        clientName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, clients, search, statusFilter]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement des factures...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-slide-up">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Documents Officiels</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none group">
            <span className="inline-block group-hover:scale-105 transition-transform duration-500">F. COMMERCIAL</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-2">Gestion et suivi des factures définitives.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild variant="outline" className="shrink-0 h-11 px-6 border-slate-200 bg-white text-orange-600 hover:bg-orange-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
              <Link href="/facture-commerciale/ai">
                <Sparkles className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Générer via </span>IA
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button asChild className="shrink-0 h-11 px-6 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10">
              <Link href="/facture-commerciale/new">
                <Plus className="w-4 h-4 mr-2" /> Nouveau
              </Link>
            </Button>
          </motion.div>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par numéro ou partenaire..."
            className="pl-11 h-12 bg-white border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 placeholder:font-medium shadow-sm transition-all focus:border-orange-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-slate-100/50 p-1 rounded-xl overflow-x-auto scrollbar-hide border border-slate-200/50">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'brouillon', label: 'Brouillon' },
            { key: 'envoyée', label: 'Envoyée' },
            { key: 'partiellement_payée', label: 'Partielle' },
            { key: 'payée', label: 'Payée' },
            { key: 'en_retard', label: 'En retard' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${statusFilter === tab.key ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <Card className="border border-slate-200 rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-hide">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Numéro</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Partenaire</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Balance Due</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total TTC</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-300">Aucun document dans cette catégorie</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(inv => {
                  const clientName = inv.client_id ? clients[inv.client_id]?.name : (inv.recipient_name || '—');
                  const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.brouillon;
                  return (
                    <TableRow key={inv.id} className="group hover:bg-slate-50/30 transition-colors border-b border-slate-100 last:border-0">
                      <TableCell className="py-5 px-6 min-w-[180px]">
                        <div className="flex flex-col">
                          <Link href={`/facture-commerciale/${inv.id}/view`} className="text-sm font-black text-slate-900 hover:text-orange-600 transition-colors tracking-tight">
                            {inv.invoice_number?.startsWith('FACTURE-COMMERCIAL-') 
                              ? inv.invoice_number.replace('FACTURE-COMMERCIAL-', `${new Date(inv.created_at || new Date()).getFullYear()}/`)
                              : inv.invoice_number}
                          </Link>
                          <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center uppercase tracking-wider">
                            <Clock className="w-3 h-3 mr-1.5 opacity-50" />
                            {format(parseISO(inv.created_at), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6 min-w-[180px]">
                        <span className="text-sm font-bold text-slate-700 tracking-tight">{clientName}</span>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-center">
                        <Badge variant="outline" className={`rounded-xl py-1 px-3 text-[9px] font-black uppercase tracking-widest border border-current bg-transparent ${status.color.split(' ').pop()}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right tabular-nums">
                        {inv.status === 'payée' ? (
                          <div className="inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Réglée</span>
                          </div>
                        ) : (
                          <span className="text-sm font-black text-rose-500 tracking-tighter">
                            {formatMAD(inv.amount_due || 0)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-slate-900 tracking-tighter tabular-nums">{formatMAD(Number(inv.total_ttc))}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase leading-none mt-0.5">Dirhams (MAD)</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button asChild variant="ghost" size="icon" className="w-9 h-9 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 shadow-sm">
                              <Link href={`/facture-commerciale/${inv.id}/view`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </motion.div>

                          {(inv.status === 'brouillon' || inv.status === 'envoyée') && (
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button asChild variant="ghost" size="icon" className="w-9 h-9 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-orange-600 shadow-sm">
                                <Link href={`/facture-commerciale/${inv.id}/edit`}>
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </Button>
                            </motion.div>
                          )}

                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(inv.id)}
                              className="w-9 h-9 rounded-xl border border-slate-100 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
