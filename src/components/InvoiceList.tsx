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
  ExternalLink,
  MoreVertical,
  Printer,
  Mail,
  History
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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
      case 'paid': return <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-none ring-1 ring-emerald-500/20">Payée</Badge>;
      case 'overdue': return <Badge className="bg-rose-500/10 text-rose-500 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-none ring-1 ring-rose-500/20">Retard</Badge>;
      case 'sent': return <Badge className="bg-orange-500/10 text-orange-500 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-none ring-1 ring-orange-500/20">Envoyée</Badge>;
      case 'draft': return <Badge className="bg-slate-100 text-slate-400 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-none ring-1 ring-slate-200">Brouillon</Badge>;
      default: return <Badge variant="outline" className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-10 animate-slide-up pb-40">
      {/* SHADCN FILTER SECTION */}
      <Card className="border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white p-4">
        <CardHeader className="p-8">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
               <CardTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">Registre Global</CardTitle>
               <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Archives des documents synchronisés</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" className="rounded-xl h-12 uppercase font-black tracking-widest text-[10px] border-slate-200 shadow-sm px-8 hover:bg-slate-900 hover:text-white transition-all">
              <Download className="w-3.5 h-3.5 mr-3" />
              Exporter Registre
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
           <div className="relative group col-span-1 lg:col-span-2">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-orange-600 transition-colors" />
              <Input 
                placeholder="Identifié par nr. ou autorité..."
                className="w-full bg-slate-50 border-none pl-14 pr-6 h-14 rounded-2xl text-[11px] font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner placeholder:text-slate-200"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <Select value={typeFilter} onValueChange={setTypeFilter}>
             <SelectTrigger className="bg-slate-50 border-none h-14 rounded-2xl text-[10px] font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner">
               <SelectValue placeholder="Type Document" />
             </SelectTrigger>
             <SelectContent className="rounded-xl p-2 border-none shadow-2xl bg-white w-48">
               <SelectItem value="all">Tous les types</SelectItem>
               <SelectItem value="commercial">Factures Commerciales</SelectItem>
               <SelectItem value="proforma">Proformas Registry</SelectItem>
             </SelectContent>
           </Select>

           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="bg-slate-50 border-none h-14 rounded-2xl text-[10px] font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner">
               <SelectValue placeholder="Statut Flow" />
             </SelectTrigger>
             <SelectContent className="rounded-xl p-2 border-none shadow-2xl bg-white w-48">
               <SelectItem value="all">Tous les statuts</SelectItem>
               <SelectItem value="paid">Payées uniquement</SelectItem>
               <SelectItem value="sent">Envoyées / En attente</SelectItem>
               <SelectItem value="overdue">Retards critiques</SelectItem>
               <SelectItem value="draft">Brouillons privés</SelectItem>
             </SelectContent>
           </Select>

           <div className="bg-slate-50 p-1 rounded-2xl border border-slate-100 flex items-center shadow-inner h-14">
              <input 
                type="date" 
                className="bg-transparent border-none p-2 text-[10px] font-black text-slate-400 focus:ring-0 uppercase h-full w-full"
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
              />
              <span className="text-[90x] font-black text-slate-100 opacity-20 uppercase mx-2">to</span>
              <input 
                type="date" 
                className="bg-transparent border-none p-2 text-[10px] font-black text-slate-400 focus:ring-0 uppercase h-full w-full"
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
              />
           </div>
        </CardContent>
      </Card>

      {/* INSIGHT STRIP */}
      {filtered.length > 0 && (
         <div className="flex items-center space-x-6 px-10">
            <Badge className="bg-slate-900 text-white rounded-full h-10 px-8 flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest border-none pointer-events-none">
               <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
               <span>{filtered.length} Records Logic Match</span>
            </Badge>
            <div className="flex items-center space-x-3 bg-white px-8 h-10 rounded-full shadow-sm ring-1 ring-slate-100">
               <span className="text-[10px] font-black uppercase text-slate-300">Sum Reality :</span>
               <span className="text-sm font-black text-slate-900 tabular-nums">{stats.total.toLocaleString('fr-MA')} DH</span>
            </div>
            {stats.unpaid > 0 && (
               <div className="flex items-center space-x-3 bg-white px-8 h-10 rounded-full shadow-sm ring-1 ring-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[10px] font-black uppercase text-rose-500">Unpaid : {stats.unpaid.toLocaleString('fr-MA')} DH</span>
               </div>
            )}
         </div>
      )}

      {/* SHADCN TABLE ARCHITECTURE */}
      <Card className="border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] border border-slate-100 overflow-hidden bg-white">
         <Table>
            <TableHeader className="bg-slate-900">
               <TableRow className="border-none hover:bg-slate-900">
                  <TableHead className="py-8 px-10 text-[9px] font-black uppercase tracking-widest text-white/40">Reference Identity</TableHead>
                  <TableHead className="py-8 px-10 text-[9px] font-black uppercase tracking-widest text-white/90">Authority Destination</TableHead>
                  <TableHead className="py-8 px-10 text-[9px] font-black uppercase tracking-widest text-white/40 text-center">Protocol</TableHead>
                  <TableHead className="py-8 px-10 text-[9px] font-black uppercase tracking-widest text-white/90 text-center">Sync Flow</TableHead>
                  <TableHead className="py-8 px-10 text-[9px] font-black uppercase tracking-widest text-white/90 text-right">Aggregate Amount</TableHead>
                  <TableHead className="py-8 px-10 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">State Control</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {filtered.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={6} className="py-40 text-center border-none opacity-10">
                       <FileSearch className="w-24 h-24 mb-6 mx-auto" />
                       <span className="text-[10px] font-black uppercase tracking-[0.5em]">No matching reality found in registry</span>
                    </TableCell>
                 </TableRow>
               ) : (
                 filtered.map((inv, idx) => (
                   <TableRow key={inv.id} className="group hover:bg-slate-50 transition-all border-slate-50">
                      <TableCell className="py-10 px-10">
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 tracking-tighter uppercase leading-none group-hover:text-orange-600 transition-colors">{inv.invoice_number}</span>
                            <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest mt-2 flex items-center">
                               <Clock className="w-2.5 h-2.5 mr-1.5" />
                               {format(parseISO(inv.invoice_date), 'dd/MM/yyyy')}
                            </span>
                         </div>
                      </TableCell>
                      <TableCell className="py-10 px-10">
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 uppercase leading-none">{inv.recipient_name}</span>
                            <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest mt-2 truncate max-w-[200px]">{inv.recipient_ice || 'SANS ICE REGISTERED'}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-10 px-10 text-center uppercase text-[10px] font-black tracking-widest text-slate-300 italic">
                        {inv.invoice_type}
                      </TableCell>
                      <TableCell className="py-10 px-10 text-center">
                         {getStatusBadge(inv.invoice_status)}
                      </TableCell>
                      <TableCell className="py-10 px-10 text-right">
                         <div className="flex items-baseline justify-end space-x-2 group-hover:scale-105 transition-transform origin-right">
                            <span className="text-lg font-black text-slate-900 tabular-nums tracking-tighter leading-none">{Number(inv.grand_total_ttc).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] font-black text-slate-200 uppercase leading-none">{inv.currency}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-10 px-10 text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="hover:bg-white rounded-xl shadow-none">
                                  <MoreHorizontal className="w-4 h-4 text-slate-200" />
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl p-2 border-none shadow-2xl bg-white w-56">
                               <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground p-3">Opérations Stratégiques</DropdownMenuLabel>
                               
                               <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer group/item" asChild>
                                  <Link href={`/facture-commerciale/${inv.id}/view`} className="flex items-center">
                                     <ExternalLink className="w-3.5 h-3.5 mr-4 text-slate-300 group-hover/item:text-orange-600" />
                                     <span className="text-[10px] font-black uppercase tracking-widest">Visualiser Reality</span>
                                  </Link>
                               </DropdownMenuItem>

                               <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer group/item" asChild>
                                  <Link href={`/facture-commerciale/${inv.id}/edit`} className="flex items-center">
                                     <Edit className="w-3.5 h-3.5 mr-4 text-slate-300 group-hover/item:text-slate-900" />
                                     <span className="text-[10px] font-black uppercase tracking-widest">Révision Structure</span>
                                  </Link>
                               </DropdownMenuItem>

                               <DropdownMenuSeparator className="bg-slate-50 m-2" />

                               <div className="grid grid-cols-2 gap-2 p-2 pt-0">
                                  <Button variant="outline" className="h-10 rounded-xl px-0 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                     <Printer className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="outline" className="h-10 rounded-xl px-0 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                     <Mail className="w-3.5 h-3.5" />
                                  </Button>
                               </div>

                               <DropdownMenuSeparator className="bg-slate-50 m-2" />

                               {inv.is_trashed ? (
                                 <DropdownMenuItem 
                                  onClick={() => onRestore(inv.id)} 
                                  className="p-3 rounded-xl focus:bg-emerald-50 text-emerald-600 cursor-pointer group/item"
                                 >
                                    <RotateCcw className="w-3.5 h-3.5 mr-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Restaurer Doc</span>
                                 </DropdownMenuItem>
                               ) : (
                                 <DropdownMenuItem 
                                  onClick={() => onTrash(inv.id)} 
                                  className="p-3 rounded-xl focus:bg-rose-50 text-rose-500 cursor-pointer group/item"
                                 >
                                    <Trash2 className="w-3.5 h-3.5 mr-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Archiver Registry</span>
                                 </DropdownMenuItem>
                               )}

                               {inv.is_trashed && (
                                  <DropdownMenuItem 
                                    onClick={() => onDelete(inv.id)} 
                                    className="p-3 rounded-xl focus:bg-rose-900 focus:text-white text-rose-700 cursor-pointer group/item"
                                  >
                                     <Trash2 className="w-3.5 h-3.5 mr-4" />
                                     <span className="text-[10px] font-black uppercase tracking-widest font-black">Effacer Définitivement</span>
                                  </DropdownMenuItem>
                               )}
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                   </TableRow>
                 ))
               )}
            </TableBody>
         </Table>
      </Card>
    </div>
  );
}
