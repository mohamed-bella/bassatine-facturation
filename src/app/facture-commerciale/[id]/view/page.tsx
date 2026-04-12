'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice, Client, Payment, Proforma, Settings } from '@/types';
import { formatMAD, calcLineSubtotal, calcAmountPaid, calcAmountDue } from '@/lib/calculations';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import {
  Loader2,
  Printer,
  ChevronLeft,
  Send,
  Download,
  CheckCircle2,
  History,
  FileText,
  CreditCard,
  ArrowRight,
  XCircle,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'envoyée': { label: 'Envoyée', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  'partiellement_payée': { label: 'Partiellement payée', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  'payée': { label: 'Payée', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  'en_retard': { label: 'En retard', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

function InvoicePrintDoc({ invoice, client, settings }: { invoice: Invoice; client: Client | null; settings: Settings | null }) {
  const docTitle = 'FACTURE COMMERCIALE';
  const rawNum = invoice.invoice_number || '';
  const docNum = rawNum.startsWith('FACTURE-COMMERCIAL-') 
    ? rawNum.replace('FACTURE-COMMERCIAL-', `${new Date(invoice.created_at || new Date()).getFullYear()}/`)
    : rawNum;
  const dateStr = invoice.created_at ? format(parseISO(invoice.created_at as string), 'dd/MM/yyyy') : '';

  const totalTtc = Number(invoice.total_ttc || 0);
  const subtotalHt = Number(invoice.subtotal_ht || 0);
  const tvaAmount = Number(invoice.tva_amount || 0);

  const items = invoice.items_json || [];
  const emptyRowCount = Math.max(0, 8 - items.length);

  const s = settings;
  const footerLine = [
    s?.company_rc ? `RC : ${s.company_rc}` : '',
    s?.company_tp ? `T.P : ${s.company_tp}` : '',
    s?.company_if ? `IF : ${s.company_if}` : '',
    s?.company_cnss ? `CNSS : ${s.company_cnss}` : '',
    s?.company_ice ? `ICE : ${s.company_ice}` : '',
  ].filter(Boolean).join(' • ');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
          }
          .print-only {
            display: block !important;
            visibility: visible !important;
          }
          #view-root-container {
            display: none !important;
          }
        }
      `}} />
      <div
        id="print-area"
        className="print-document"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12.5px',
          color: '#000',
          background: '#fff',
          width: '210mm',
          height: '297mm',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ padding: '12mm 18mm 12mm 12mm', flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
            <div>
              {s?.logo_url ? (
                <img src={s.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '6px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '70px', height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '6px' }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '8px' }}>{s?.company_name || 'BOUMHCHAD SARL AU'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>{s?.company_sub_name || 'BASSATINE SKOURA'}</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'}</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{s?.company_phone || '06 23 34 99 51 – 06 61 70 99 20'}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
              <span>OUARZAZATE LE : </span>
              <strong style={{ fontSize: '13px' }}>{dateStr}</strong>
            </div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '19px', margin: '8mm 0 6mm', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #000', paddingBottom: '4px', display: 'inline-block' }}>
            {docTitle} N° : {docNum}
          </div>

          <div style={{ marginBottom: '8mm', fontSize: '14px' }}>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>DOIT :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '15px' }}>{client?.name || invoice?.recipient_name || '—'}</span>
            </div>
            <div>
              <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
              <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{client?.company_ice || invoice?.recipient_ice || '—'}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {[
                  { label: 'DÉSIGNATION', w: '40%', align: 'left' as const },
                  { label: 'NB\nCHAMBRES', w: '12%', align: 'center' as const },
                  { label: 'NB\nCLIENTS', w: '12%', align: 'center' as const },
                  { label: 'P.U (DH)', w: '18%', align: 'center' as const },
                  { label: 'TOTAL\nTTC', w: '18%', align: 'center' as const },
                ].map((col, i) => (
                  <th key={i} style={{
                    border: '1.5px solid #000',
                    padding: '8px 5px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textAlign: col.align,
                    width: col.w,
                    whiteSpace: 'pre-line',
                    textTransform: 'uppercase',
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => {
                const desc = item.description || (item as any).desc || '';
                const qty = item.quantity || (item as any).qty || 0;
                const nbClients = item.nb_clients ?? (item as any).nb_clients ?? '';
                const price = item.unit_price || (item as any).price || 0;
                const total = calcLineSubtotal(qty, price);
                return (
                  <tr key={i}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 7px' }}>{desc}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', fontWeight: qty ? 'bold' : 'normal', color: qty ? '#c2410c' : '#000' }}>{qty || ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center', color: nbClients ? '#c2410c' : '#000', fontWeight: nbClients ? 'bold' : 'normal' }}>{nbClients}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{price ? formatMAD(price) : ''}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'right' }}>{total ? formatMAD(total) : ''}</td>
                  </tr>
                );
              })}
              {Array.from({ length: emptyRowCount }).map((_, i) => (
                <tr key={`e-${i}`} style={{ height: '22px' }}>
                  <td style={{ border: '1px solid #ccc', padding: '5px' }}>&nbsp;</td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                  <td style={{ border: '1px solid #ccc' }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
            <table style={{ width: '240px', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                {[
                  { label: 'TOTAL TTC', value: formatMAD(totalTtc) + ' DH', bold: true },
                  { label: 'TOTAL HT', value: formatMAD(subtotalHt) + ' DH', bold: false },
                  { label: 'DONT TVA 10%', value: formatMAD(tvaAmount) + ' DH', bold: false },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: row.bold ? 'bold' : 'normal', minWidth: '100px' }}>{row.label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 12px', textAlign: 'right', fontWeight: row.bold ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '8mm', fontSize: '11px' }}>
            <div style={{ marginBottom: '3px' }}>Arrête la présente facture à la somme de :</div>
            <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '12px', textTransform: 'uppercase' }}>
              {invoice.amount_words || ''}
            </div>
          </div>

          {s?.stamp_url && (
            <div style={{
              position: 'absolute',
              bottom: '10mm',
              right: '12mm',
              textAlign: 'center',
            }}>
              <img src={s.stamp_url} alt="Cachet" style={{ height: '110px', opacity: 1, mixBlendMode: 'multiply', objectFit: 'contain' }} />
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: '10mm',
            left: '14mm',
            right: '14mm',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '6px',
            fontSize: '7.5px',
            color: '#94a3b8',
            textAlign: 'center',
          }}>
            {s?.company_address || 'Douar Boumhchad Skoura – Ouarzazate'} – GMS : {s?.company_phone || ''}{s?.company_email ? ` – Email: ${s.company_email}` : ''}<br />
            {footerLine}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    type: 'especes',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const fetchData = async () => {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', params.id).single();
    if (!inv) { router.push('/f-commercial'); return; }

    const [{ data: cData }, { data: pData }, { data: payData }, { data: sData }] = await Promise.all([
      inv.client_id ? supabase.from('clients').select('*').eq('id', inv.client_id).single() : Promise.resolve({ data: null }),
      inv.proforma_id ? supabase.from('proformas').select('*').eq('id', inv.proforma_id).single() : Promise.resolve({ data: null }),
      supabase.from('payments').select('*').eq('invoice_id', inv.id).order('payment_date', { ascending: false }),
      supabase.from('settings').select('*').eq('id', 'global').single(),
    ]);

    let status = inv.status;
    if (status !== 'payée' && status !== 'brouillon' && inv.due_date) {
      if (isBefore(parseISO(inv.due_date), startOfDay(new Date()))) status = 'en_retard';
    }

    const totalTtc = Number(inv.total_ttc || (inv as any).grand_total_ttc || 0);
    const tvaAmount = Number(inv.tva_amount || (inv as any).tax_total || 0);
    setInvoice({ ...inv, status, total_ttc: totalTtc, tva_amount: tvaAmount });
    setClient(cData);
    setProforma(pData);
    setPayments(payData || []);
    setSettings(sData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setActionLoading(true);
    await supabase.from('invoices').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', params.id);
    await fetchData();
    setActionLoading(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setActionLoading(true);

    const amount = parseFloat(paymentForm.amount);
    const paidSoFar = calcAmountPaid(payments);
    const totalTtc = Number(invoice.total_ttc);

    const { data: payNums } = await supabase.from('payments').select('payment_number');
    const { generateNextNumber } = await import('@/lib/calculations');
    const currentYear = new Date().getFullYear().toString();
    const nextPayNum = generateNextNumber(currentYear, (payNums || []).map((p: any) => p.payment_number), '/', 3);

    const { error } = await supabase.from('payments').insert([{
      payment_number: nextPayNum,
      invoice_id: invoice.id,
      amount,
      type: paymentForm.type,
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes,
    }]);

    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      const newPaidTotal = paidSoFar + amount;
      const newStatus = newPaidTotal >= totalTtc - 0.01 ? 'payée' : 'partiellement_payée';
      await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', type: 'especes', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      await fetchData();
    }
    setActionLoading(false);
  };

  const cancelPayment = async (payId: string) => {
    const reason = prompt('Raison de l\'annulation :');
    if (reason === null) return;
    setActionLoading(true);
    await supabase.from('payments').update({ is_cancelled: true, cancelled_at: new Date().toISOString(), cancellation_reason: reason }).eq('id', payId);

    const { data: rem } = await supabase.from('payments').select('amount').eq('invoice_id', params.id).eq('is_cancelled', false);
    const totalPaid = (rem || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
    const totalTtc = Number(invoice?.total_ttc || 0);
    let newStatus = 'envoyée';
    if (totalPaid > 0 && totalPaid < totalTtc - 0.01) newStatus = 'partiellement_payée';
    if (totalPaid >= totalTtc - 0.01) newStatus = 'payée';
    
    await supabase.from('invoices').update({ status: newStatus }).eq('id', params.id);
    await fetchData();
    setActionLoading(false);
  };

  const handleDownloadPDF = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/pdf/generate?type=facture&id=${params.id}`);
      if (!response.ok) throw new Error('Erreur');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture-${invoice?.invoice_number || 'export'}.pdf`;
      a.click();
    } catch (err: any) {
      alert('Erreur PDF');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !invoice) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
    </div>
  );

  const statusInfo = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.brouillon;
  const amountPaid = calcAmountPaid(payments);
  const amountDue = calcAmountDue(Number(invoice.total_ttc), amountPaid);

  return (
    <>
      <div id="view-root-container" className="max-w-6xl mx-auto pb-40 animate-slide-up flex flex-col lg:flex-row gap-8 px-4 md:px-0">
        <div className="flex-1 space-y-6 min-w-0">
          <header className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/facture-commerciale')} className="rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-none">
                  {invoice.invoice_number?.startsWith('FACTURE-COMMERCIAL-') 
                    ? invoice.invoice_number.replace('FACTURE-COMMERCIAL-', `${new Date(invoice.created_at || new Date()).getFullYear()}/`)
                    : invoice.invoice_number}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Facture Commerciale</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Badge className={`${statusInfo.color} border rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shrink-0 shadow-sm`}>{statusInfo.label}</Badge>
              {invoice.status === 'brouillon' && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/facture-commerciale/${invoice.id}/edit`}>
                    <Button variant="outline" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm">Modifier</Button>
                  </Link>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={() => updateStatus('envoyée')} disabled={actionLoading} className="rounded-xl h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 transition-all">
                      <Send className="w-3.5 h-3.5 mr-2" /> Envoyer
                    </Button>
                  </motion.div>
                </div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white shadow-sm shrink-0" onClick={handleDownloadPDF} disabled={actionLoading}>
                  <Download className="w-3.5 h-3.5 mr-2 text-slate-400" /> PDF
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 shrink-0 bg-white border-slate-200 shadow-sm" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 text-slate-600" />
                </Button>
              </motion.div>
            </div>
          </header>

          <div className="no-print shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden border border-slate-200 bg-slate-200 p-4 md:p-12 flex justify-center min-h-[500px] md:min-h-[1000px]">
            <div className="origin-top scale-[0.4] sm:scale-[0.5] md:scale-[0.8] lg:scale-100 transition-transform duration-500">
              <InvoicePrintDoc invoice={invoice} client={client} settings={settings} />
            </div>
          </div>
        </div>

        <aside className="lg:w-80 space-y-5 no-print lg:sticky lg:top-8 h-fit">
          <Card className="bg-slate-900 text-white rounded-[2rem] border-none overflow-hidden p-7 space-y-7">
            <div>
              <p className="text-[10px] font-bold uppercase text-white/30 tracking-[0.2em] mb-1">Total Facture</p>
              <h3 className="text-3xl font-black tabular-nums">{formatMAD(Number(invoice.total_ttc))} <span className="text-sm opacity-30">DH</span></h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40 flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Payé</span>
                <span className="font-bold tabular-nums text-emerald-400">{formatMAD(amountPaid)} DH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Restant</span>
                <span className="font-bold tabular-nums text-orange-400">{formatMAD(amountDue)} DH</span>
              </div>
            </div>
            {amountDue > 0 && invoice.status !== 'brouillon' && (
              <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-2xl text-xs font-bold shadow-lg shadow-orange-600/20">
                    <CreditCard className="w-4 h-4 mr-2" /> Enregistrer un paiement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">Règlement</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Montant (DH)</Label>
                      <Input type="number" step="0.01" max={amountDue} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="h-12 text-lg font-black bg-slate-50 border-slate-200 rounded-xl" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">Mode</Label>
                        <Select value={paymentForm.type} onValueChange={v => setPaymentForm({ ...paymentForm, type: v })}>
                          <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="especes">Espèces</SelectItem>
                            <SelectItem value="carte">Carte</SelectItem>
                            <SelectItem value="virement">Virement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">Date</Label>
                        <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                          className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Référence</Label>
                      <Input value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs" placeholder="N° chèque, virement..." />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={actionLoading} className="w-full h-12 bg-slate-900 hover:bg-orange-600 rounded-xl text-xs font-bold text-white transition-all">
                         Confirmer le règlement
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </Card>

          {payments.length > 0 && (
            <Card className="border border-slate-100 rounded-[2rem] bg-white overflow-hidden shadow-sm">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
                  <History className="w-4 h-4 text-orange-600 mr-2" /> Historique
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                {payments.map(pay => (
                  <div key={pay.id} className={cn("p-4 rounded-2xl border flex justify-between items-center group", pay.is_cancelled ? 'bg-slate-50 border-slate-50 opacity-50' : 'bg-white border-slate-100 hover:border-slate-300 transition-all')}>
                    <div className="flex items-center space-x-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", pay.is_cancelled ? 'bg-slate-100' : 'bg-emerald-50')}>
                        <CreditCard className={cn("w-4 h-4", pay.is_cancelled ? 'text-slate-400' : 'text-emerald-600')} />
                      </div>
                      <div>
                        <p className={cn("text-xs font-black tabular-nums", pay.is_cancelled && "line-through")}>{formatMAD(pay.amount)} DH</p>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">{format(parseISO(pay.payment_date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    {!pay.is_cancelled && (
                      <Button variant="ghost" size="icon" onClick={() => cancelPayment(pay.id)} className="w-8 h-8 rounded-lg md:opacity-0 md:group-hover:opacity-100 text-rose-500 transition-all">
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {proforma && (
            <Link href={`/proforma/${proforma.id}/view`}>
              <Card className="border border-slate-100 rounded-2xl p-5 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Source Proforma</p>
                    <p className="text-xs font-bold text-slate-900">{proforma.proforma_number}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
              </Card>
            </Link>
          )}
        </aside>
      </div>
      
      <div className="print-only hidden print:block">
         <InvoicePrintDoc invoice={invoice} client={client} settings={settings} />
      </div>
    </>
  );
}
