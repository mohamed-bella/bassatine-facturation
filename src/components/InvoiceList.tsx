'use client';

import { useState, useMemo } from 'react';
import { Invoice, Client } from '@/types';
import { 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { formatMAD } from '@/lib/calculations';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface Props {
  invoices: Invoice[];
  onRestore?: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'envoyée': { label: 'Envoyée', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  'partiellement_payée': { label: 'Partielle', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  'payée': { label: 'Payée', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  'en_retard': { label: 'Retard', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

export default function InvoiceList({ invoices, onRestore, onDelete }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const searchStr = search.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(searchStr) ||
        (inv.recipient_name || '').toLowerCase().includes(searchStr)
      );
    });
  }, [invoices, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
          <Input 
            placeholder="Rechercher une facture..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 bg-white border-slate-200 rounded-xl focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
      </div>

      <Card className="border border-slate-100 rounded-[2rem] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Document</TableHead>
              <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Partenaire</TableHead>
              <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</TableHead>
              <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Montant TTC</TableHead>
              <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                   <div className="flex flex-col items-center opacity-20">
                      <Trash2 className="w-12 h-12 mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">Aucun document trouvé</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => {
                const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.brouillon;
                return (
                  <TableRow key={inv.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors">{inv.invoice_number}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center mt-0.5 font-bold">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(parseISO(inv.created_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-8 text-sm font-bold text-slate-500">
                      {inv.recipient_name || '—'}
                    </TableCell>
                    <TableCell className="py-4 px-8">
                      <Badge className={cn(status.color, "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-none border")}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-8 text-right">
                      <span className="text-sm font-black tabular-nums">{formatMAD(Number(inv.total_ttc))}</span>
                      <span className="text-[9px] font-bold text-slate-300 ml-1 uppercase">DH</span>
                    </TableCell>
                    <TableCell className="py-4 px-8 text-right">
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
                          {onRestore && (
                            <DropdownMenuItem onClick={() => onRestore(inv.id)} className="p-2 rounded-lg cursor-pointer text-sm text-emerald-600 focus:bg-emerald-50">
                              <RotateCcw className="w-3.5 h-3.5 mr-2" /> Restaurer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onDelete(inv.id)} className="p-2 rounded-lg cursor-pointer text-sm text-rose-600 focus:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                          </DropdownMenuItem>
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
