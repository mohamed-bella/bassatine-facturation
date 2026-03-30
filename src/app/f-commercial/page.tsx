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
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Documents</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">F. COMMERCIAL</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button asChild variant="outline" className="h-11 px-6 border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            <Link href="/facture-commerciale/ai">
              <Sparkles className="w-4 h-4 mr-2" /> Générer via IA
            </Link>
          </Button>
          <Button asChild className="h-11 px-6 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all">
            <Link href="/facture-commerciale/new">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle facture
            </Link>
          </Button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou partenaire..."
            className="pl-11 h-11 bg-white border-slate-200 rounded-xl text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-slate-50 p-1 rounded-xl overflow-x-auto">
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
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${statusFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <Card className="border border-slate-100 rounded-2xl shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500">Numéro</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500">Partenaire</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-center">Statut</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-right">Reste à payer</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-right">Total TTC</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-muted-foreground">Aucune facture trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(inv => {
                const clientName = inv.client_id ? clients[inv.client_id]?.name : (inv.recipient_name || '—');
                const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.brouillon;
                return (
                  <TableRow key={inv.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <Link href={`/facture-commerciale/${inv.id}/view`} className="text-sm font-bold text-slate-900 hover:text-orange-600 transition-colors">
                          {inv.invoice_number?.startsWith('FACTURE-COMMERCIAL-') 
                            ? inv.invoice_number.replace('FACTURE-COMMERCIAL-', `${new Date(inv.created_at || new Date()).getFullYear()}/`)
                            : inv.invoice_number}
                        </Link>
                        <span className="text-xs text-muted-foreground mt-0.5 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(parseISO(inv.created_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <span className="text-sm font-medium text-slate-700">{clientName}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      <Badge variant="outline" className={`rounded-lg text-[11px] font-bold border ${status.color}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      {inv.status === 'payée' ? (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Réglée</span>
                      ) : (
                        <span className="text-sm font-bold text-rose-500 tabular-nums">
                          {formatMAD(inv.amount_due || 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{formatMAD(Number(inv.total_ttc))}</span>
                      <span className="text-xs text-muted-foreground ml-1">MAD</span>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl p-1 border-slate-200 shadow-lg bg-white w-44">
                          <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer text-sm">
                            <Link href={`/facture-commerciale/${inv.id}/view`}>
                              <Eye className="w-3.5 h-3.5 mr-2 text-slate-400" /> Voir
                            </Link>
                          </DropdownMenuItem>
                          {(inv.status === 'brouillon' || inv.status === 'envoyée') && (
                            <DropdownMenuItem asChild className="p-2 rounded-lg cursor-pointer text-sm">
                              <Link href={`/facture-commerciale/${inv.id}/edit`}>
                                <Edit className="w-3.5 h-3.5 mr-2 text-slate-400" /> Modifier
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {(inv.status === 'brouillon' || inv.status === 'envoyée') && (
                            <>
                              <DropdownMenuSeparator className="bg-slate-100 mx-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(inv.id)}
                                className="p-2 rounded-lg cursor-pointer text-sm text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
