'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceItem } from '@/types';
import { Save, ChevronLeft, Plus, X, Calculator, Info } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
  initialData?: Partial<Invoice>;
  isEdit?: boolean;
}

export default function InvoiceForm({ initialData, isEdit = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(initialData?.invoice_type || 'commercial');
  const [status, setStatus] = useState(initialData?.invoice_status || 'paid');
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items_json || [{ desc: 'CHAMBRE DOUBLE', qty: 1, clients: '', price: 0 }]);
  const [client, setClient] = useState({
    name: initialData?.recipient_name || '',
    ice: initialData?.recipient_ice || '',
    email: initialData?.recipient_email || ''
  });
  const [meta, setMeta] = useState({
    number: initialData?.invoice_number || '',
    date: initialData?.invoice_date || new Date().toISOString().split('T')[0],
    amountWords: initialData?.amount_words || ''
  });
  const [useVat, setUseVat] = useState(true);
  const [inputMode, setInputMode] = useState<'HT' | 'TTC'>('HT');

  // Calculation Logic
  const totals = useMemo(() => {
    let ht = 0;
    let ttc = 0;
    items.forEach(item => {
      const line = Number(item.qty) * Number(item.price);
      if (inputMode === 'HT') ht += line;
      else ttc += line;
    });

    if (inputMode === 'HT') {
      ttc = useVat ? ht * 1.1 : ht;
    } else {
      ht = useVat ? ttc / 1.1 : ttc;
    }

    return {
      ht: ht.toFixed(2),
      vat: (ttc - ht).toFixed(2),
      ttc: ttc.toFixed(2)
    };
  }, [items, useVat, inputMode]);

  const addItem = () => setItems([...items, { desc: '', qty: 1, clients: '', price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const invoiceData = {
      invoice_number: meta.number,
      invoice_date: meta.date,
      invoice_type: type,
      invoice_status: status,
      recipient_name: client.name,
      recipient_ice: client.ice,
      recipient_email: client.email,
      items_json: items,
      subtotal_ht: parseFloat(totals.ht),
      vat_amount: parseFloat(totals.vat),
      grand_total_ttc: parseFloat(totals.ttc),
      amount_words: meta.amountWords
    };

    let error;
    if (isEdit && initialData?.id) {
      const { error: err } = await supabase.from('invoices').update(invoiceData).eq('id', initialData.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('invoices').insert([invoiceData]);
      error = err;
    }

    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-10 py-10 animate-fade-in">
      <div className="flex justify-between items-center mb-12">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-600 transition-colors flex items-center group">
          <ChevronLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" />
          Retour dashboard
        </Link>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-gray-100 px-4 py-1 rounded text-gray-500">
          DOCUMENT / {isEdit ? 'REVISION' : 'CREATION'}
        </span>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-100 shadow-2xl p-16">
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 pb-16 border-b border-gray-50 border-dashed gap-10">
          <div className="flex bg-gray-50 p-1 space-x-1 rounded shadow-inner">
            <button 
              type="button" 
              onClick={() => setType('commercial')}
              className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${type === 'commercial' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              Commerciale
            </button>
            <button 
              type="button" 
              onClick={() => setType('proforma')}
              className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${type === 'proforma' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-black'}`}
            >
              Proforma
            </button>
          </div>

          <div className="flex items-center space-x-4">
             <label className="text-[9px] font-black uppercase text-gray-300 tracking-[0.2em]">Statut du document</label>
             <select 
              value={status} 
              onChange={e => setStatus(e.target.value as any)}
              className="bg-transparent border-none text-xs font-black uppercase tracking-widest focus:ring-0 p-0 text-orange-600 cursor-pointer text-right appearance-none hover:opacity-70"
             >
               <option value="paid">Payée</option>
               <option value="pending">En attente</option>
             </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 mb-20">
          <section className="space-y-8">
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] border-b border-gray-100 pb-3 flex items-center">
              <span className="w-4 h-0.5 bg-orange-600 mr-3"></span>
              Client Destination
            </h3>
            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-focus-within:text-orange-600">Nom / Raison Sociale</label>
                <input 
                  type="text" required 
                  className="w-full border-b border-gray-100 py-3 text-sm font-black text-gray-900 uppercase tracking-tight focus:border-black focus:outline-none focus:ring-0 rounded-none bg-transparent"
                  value={client.name}
                  onChange={e => setClient({...client, name: e.target.value})}
                  placeholder="EX: HOTEL ATLAS"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-focus-within:text-orange-600">ICE (Identifiant Commun)</label>
                <input 
                  type="text" 
                  className="w-full border-b border-gray-100 py-3 text-sm font-bold text-gray-900 focus:border-black focus:outline-none focus:ring-0 rounded-none bg-transparent"
                  value={client.ice}
                  onChange={e => setClient({...client, ice: e.target.value})}
                  placeholder="00209..."
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-focus-within:text-orange-600">Email (Optionnel)</label>
                <input 
                  type="email" 
                  className="w-full border-b border-gray-100 py-3 text-sm font-bold text-gray-900 focus:border-black focus:outline-none focus:ring-0 rounded-none bg-transparent"
                  value={client.email}
                  onChange={e => setClient({...client, email: e.target.value})}
                  placeholder="hotel@contact.com"
                />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] border-b border-gray-100 pb-3 flex items-center">
              <span className="w-4 h-0.5 bg-orange-600 mr-3"></span>
              Metadonnées
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-focus-within:text-orange-600">Numéro de Facture</label>
                  <input 
                    type="text" required
                    className="w-full border-b border-gray-100 py-3 text-sm font-black text-gray-900 tracking-widest focus:border-black focus:outline-none focus:ring-0 rounded-none bg-transparent uppercase"
                    value={meta.number}
                    onChange={e => setMeta({...meta, number: e.target.value})}
                    placeholder="B-001/25"
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-focus-within:text-orange-600">Date d'Emission</label>
                  <input 
                    type="date" required
                    className="w-full border-b border-gray-100 py-3 text-sm font-bold text-gray-900 focus:border-black focus:outline-none focus:ring-0 rounded-none bg-transparent h-[44px]"
                    value={meta.date}
                    onChange={e => setMeta({...meta, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-focus-within:text-orange-600">Montant en toutes lettres</label>
                <input 
                  type="text" required
                  className="w-full border-b border-gray-100 py-3 text-xs font-bold text-gray-900 italic focus:border-black focus:outline-none focus:ring-0 rounded-none bg-transparent"
                  value={meta.amountWords}
                  onChange={e => setMeta({...meta, amountWords: e.target.value})}
                  placeholder="Arrêté la présente facture à la somme de..."
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mb-20">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] flex items-center">
              Lignes de Prestations <span className="ml-4 px-2 py-0.5 bg-gray-100 text-[8px] rounded">{items.length}</span>
            </h3>
            <button 
              type="button" 
              onClick={addItem}
              className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-orange-600 hover:text-black transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Ligne supplémentaire</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 items-center animate-fade-in group pb-2">
                <div className="md:col-span-1 text-[10px] font-black text-gray-200">#{String(idx + 1).padStart(2, '0')}</div>
                <div className="md:col-span-5 relative">
                  <input 
                    type="text" required placeholder="Désignation de la chambre / service"
                    className="w-full bg-gray-50/50 border-none p-4 text-xs font-black uppercase tracking-tight focus:ring-1 focus:ring-black placeholder-gray-300"
                    value={item.desc}
                    onChange={e => updateItem(idx, 'desc', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 relative">
                  <span className="absolute left-2 top-0 text-[8px] font-black text-gray-300 uppercase pt-1">Unités</span>
                  <input 
                    type="number" required
                    className="w-full bg-gray-50/50 border-none p-4 pt-5 text-xs font-black focus:ring-1 focus:ring-black text-center"
                    value={item.qty}
                    onChange={e => updateItem(idx, 'qty', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 relative">
                  <span className="absolute left-2 top-0 text-[8px] font-black text-gray-300 uppercase pt-1">Clients / Ref</span>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50/50 border-none p-4 pt-5 text-xs font-black focus:ring-1 focus:ring-black text-center uppercase"
                    value={item.clients}
                    onChange={e => updateItem(idx, 'clients', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 relative pr-10">
                  <span className="absolute left-2 top-0 text-[8px] font-black text-gray-300 uppercase pt-1">P.U {inputMode}</span>
                  <input 
                    type="number" step="0.01" required
                    className="w-full bg-gray-50/50 border-none p-4 pt-5 text-xs font-black focus:ring-1 focus:ring-black text-right"
                    value={item.price}
                    onChange={e => updateItem(idx, 'price', e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => removeItem(idx)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-10 items-stretch">
          <div className="flex-1 bg-gray-50 p-10 space-y-8 shadow-inner">
            <div className="flex items-center space-x-10 mb-6">
               <label className="flex items-center space-x-3 cursor-pointer group">
                 <input 
                  type="radio" 
                  name="inputMode" 
                  className="accent-black w-4 h-4 cursor-pointer"
                  checked={inputMode === 'HT'}
                  onChange={() => setInputMode('HT')}
                 />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Saisie Hors Taxe</span>
               </label>
               <label className="flex items-center space-x-3 cursor-pointer group">
                 <input 
                  type="radio" 
                  name="inputMode" 
                  className="accent-black w-4 h-4 cursor-pointer"
                  checked={inputMode === 'TTC'}
                  onChange={() => setInputMode('TTC')}
                 />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Saisie Toutes Taxes</span>
               </label>
               <label className="flex items-center space-x-3 cursor-pointer group border-l border-gray-200 pl-10 ml-auto">
                 <input 
                  type="checkbox" 
                  className="accent-black w-4 h-4 cursor-pointer" 
                  checked={useVat}
                  onChange={e => setUseVat(e.target.checked)}
                 />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Appliquer TVA 10%</span>
               </label>
            </div>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total HT</span>
                  <span className="text-sm font-black text-gray-900 tabular-nums">{Number(totals.ht).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
                </div>
                <div className="flex justify-between items-center pb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">TVA (10%)</span>
                  <span className="text-sm font-black text-gray-900 tabular-nums">{Number(totals.vat).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
                </div>
              </div>
              <div className="bg-white p-6 shadow-xl flex flex-col items-end justify-center border-t-2 border-orange-600">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Net à Payer (TTC)</span>
                <span className="text-4xl font-black text-black tracking-tighter tabular-nums">
                  {Number(totals.ttc).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                  <span className="text-sm opacity-30 ml-2">DH</span>
                </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 flex flex-col justify-end">
             <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black text-white h-24 text-xs font-black uppercase tracking-[0.4em] hover:bg-orange-600 transition-all flex items-center justify-center space-x-3 shadow-2xl disabled:opacity-50"
             >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder</span>
                </>
               )}
             </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Memory optimization
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
