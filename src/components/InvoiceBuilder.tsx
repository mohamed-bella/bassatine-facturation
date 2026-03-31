'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice, Client, CatalogItem, LineItem, TvaMode } from '@/types';
import { calcLineSubtotal, calcDocumentTotals, formatMAD, generateNextNumber } from '@/lib/calculations';
import {
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  Loader2,
  Package,
  PlusCircle,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  initialData?: Invoice;
  isEdit?: boolean;
}

const EMPTY_LINE: LineItem = { description: '', quantity: 1, nb_clients: 1, unit_price: 0, subtotal: 0 };

export default function InvoiceBuilder({ initialData, isEdit = false }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [openClientSearch, setOpenClientSearch] = useState(false);
  const [openCatalogPicker, setOpenCatalogPicker] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState<Partial<Invoice>>(() => {
    if (initialData) {
      return {
        ...initialData,
        items_json: (initialData.items_json || []).map(item => ({
          ...item,
          description: item.description || (item as any).desc || '',
          quantity: item.quantity || (item as any).qty || 1,
          unit_price: item.unit_price || (item as any).price || 0
        }))
      };
    }
    return {
      invoice_number: '',
      client_id: undefined,
      proforma_id: undefined,
      created_at: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      status: 'brouillon',
      items_json: [{ ...EMPTY_LINE }],
      tva_mode: 'ht',
      subtotal_ht: 0,
      tva_amount: 0,
      total_ttc: 0,
      amount_words: '',
      notes: '',
    };
  });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cData }, { data: catData }, { data: nums }] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('product_catalog').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('invoices').select('invoice_number'),
      ]);
      setClients(cData || []);
      setCatalogItems(catData || []);

      if (!isEdit && nums) {
        const currentYear = new Date().getFullYear().toString();
        const nextNum = generateNextNumber(currentYear, nums.map(n => n.invoice_number), '/', 3);
        setFormData(prev => ({ ...prev, invoice_number: nextNum }));
      }

      // Check for AI source data
      const params = new URLSearchParams(window.location.search);
      if (params.get('source') === 'ai' && !isEdit) {
        const aiDataRaw = sessionStorage.getItem('ai_invoice_data');
        if (aiDataRaw) {
          const aiData = JSON.parse(aiDataRaw);
          setFormData(prev => ({
            ...prev,
            items_json: aiData.items.map((item: any) => ({
              description: item.description,
              quantity: item.quantity || 1,
              nb_clients: item.nb_clients || 1,
              unit_price: item.unit_price || 0,
              subtotal: (item.quantity || 1) * (item.unit_price || 0)
            })),
            amount_words: aiData.amount_words || prev.amount_words,
            notes: aiData.notes || prev.notes,
            // Pre-fill manual client fields for the form
            recipient_name: aiData.client_name || '',
            recipient_ice: aiData.client_ice || '',
            recipient_address: aiData.client_address || '',
          }));

          // Match client
          if (aiData.client_name && cData) {
            const matched = cData.find((c: any) => 
               c.name.toLowerCase().includes(aiData.client_name.toLowerCase()) ||
               aiData.client_name.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matched) {
              setSelectedClient(matched);
              setFormData(prev => ({ 
                ...prev, 
                client_id: matched.id,
                recipient_name: matched.name,
                recipient_ice: matched.company_ice || '',
                recipient_address: matched.address_street || '',
              }));
            }
          }
          sessionStorage.removeItem('ai_invoice_data');
        }
      }

      if (initialData?.client_id && cData) {
        const c = cData.find(c => c.id === initialData.client_id);
        if (c) setSelectedClient(c);
      }
    };
    fetchData();
  }, [isEdit, initialData?.client_id]);

  const totals = useMemo(() => {
    return calcDocumentTotals(formData.items_json || [], formData.tva_mode || 'ht');
  }, [formData.items_json, formData.tva_mode]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      subtotal_ht: totals.subtotal_ht,
      tva_amount: totals.tva_amount,
      total_ttc: totals.total_ttc,
    }));
  }, [totals]);

  // Auto-save for brouillon
  useEffect(() => {
    if (formData.status !== 'brouillon' || !isEdit || !initialData?.id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await supabase.from('invoices').update({
        ...formData,
        updated_at: new Date().toISOString(),
        subtotal_ht: totals.subtotal_ht,
        tva_amount: totals.tva_amount,
        total_ttc: totals.total_ttc,
        recipient_name: formData.recipient_name || selectedClient?.name || '',
        recipient_ice: formData.recipient_ice || selectedClient?.company_ice || '',
        recipient_address: formData.recipient_address || selectedClient?.address_street || '',
        recipient_email: formData.recipient_email || selectedClient?.email || '',
      }).eq('id', initialData.id);
    }, 5000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [formData, totals, isEdit, initialData?.id, selectedClient]);

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setOpenClientSearch(false);
  };

  const addItemFromCatalog = (catItem: CatalogItem) => {
    const newLine: LineItem = {
      description: catItem.name + (catItem.description ? ` — ${catItem.description}` : ''),
      quantity: 1,
      unit_price: catItem.default_price,
      subtotal: catItem.default_price,
    };
    setFormData(prev => ({ ...prev, items_json: [...(prev.items_json || []), newLine] }));
    setOpenCatalogPicker(false);
  };

  const addEmptyItem = () => {
    setFormData(prev => ({ ...prev, items_json: [...(prev.items_json || []), { ...EMPTY_LINE }] }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items_json: prev.items_json?.filter((_, i) => i !== index) }));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...(formData.items_json || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].subtotal = calcLineSubtotal(newItems[index].quantity, newItems[index].unit_price);
    setFormData({ ...formData, items_json: newItems });
  };

  const handleSave = async () => {
    setSaving(true);
    const { amount_words, ...validFormData } = formData;
    const dataToSave = {
      ...validFormData,
      updated_at: new Date().toISOString(),
      subtotal_ht: totals.subtotal_ht,
      tva_amount: totals.tva_amount,
      total_ttc: totals.total_ttc,
      recipient_name: formData.recipient_name || selectedClient?.name || '',
      recipient_ice: formData.recipient_ice || selectedClient?.company_ice || '',
      recipient_address: formData.recipient_address || selectedClient?.address_street || '',
      recipient_email: formData.recipient_email || selectedClient?.email || '',
    };

    let res;
    if (isEdit && initialData?.id) {
      res = await supabase.from('invoices').update(dataToSave).eq('id', initialData.id);
    } else {
      // Legacy compatibility: fill old columns with defaults if they exist as NOT NULL
      const insertData = {
        ...dataToSave,
        invoice_type: 'commercial'
      };
      res = await supabase.from('invoices').insert([insertData]).select();
    }

    if (res.error) {
      alert('Erreur: ' + res.error.message);
    } else {
      router.push('/f-commercial');
    }
    setSaving(false);
  };

  const isLocked = formData.status !== 'brouillon' && formData.status !== 'envoyée';

  const groupedCatalog = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    catalogItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [catalogItems]);

  const categoryLabels: Record<string, string> = { chambre: 'Chambres', service: 'Services', taxe: 'Taxes', autre: 'Autres' };

  return (
    <div className="max-w-7xl mx-auto pb-40 animate-slide-up">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {isEdit ? 'Modifier la facture' : 'Nouvelle Facture Commerciale'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{formData.invoice_number}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isLocked && (
            <Badge variant="outline" className="h-9 px-4 rounded-xl text-xs font-bold text-amber-600 border-amber-200 bg-amber-50">
              <Lock className="w-3 h-3 mr-1.5" /> Document verrouillé
            </Badge>
          )}
          {!isLocked && (
            <Badge variant="outline" className="h-9 px-4 rounded-xl text-xs font-bold text-slate-400 border-slate-200">
              Brouillon
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || isLocked}
            className="h-11 px-8 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* LEFT: FORM (3 cols) */}
        <section className="lg:col-span-3 space-y-6">
          {/* CLIENT */}
          <Card className="border border-slate-100 rounded-2xl shadow-sm">
            <CardHeader className="p-6 pb-4 flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-bold text-slate-900">Partenaire</CardTitle>
              <Popover open={openClientSearch} onOpenChange={setOpenClientSearch}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9" disabled={isLocked}>
                    <PlusCircle className="w-3.5 h-3.5 mr-2" />
                    {selectedClient ? 'Changer' : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 rounded-xl shadow-lg border-slate-200" align="end">
                  <Command>
                    <CommandInput className="text-sm" placeholder="Rechercher un partenaire..." />
                    <CommandList className="max-h-[250px]">
                      <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">Aucun partenaire trouvé</CommandEmpty>
                      <CommandGroup>
                        {clients.map(client => (
                          <CommandItem key={client.id} onSelect={() => selectClient(client)} className="p-3 cursor-pointer">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{client.name}</span>
                              {client.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {selectedClient ? (
                <div className="bg-slate-50 rounded-xl p-4 space-y-1 relative group">
                  <p className="text-sm font-bold text-slate-900">{selectedClient.name}</p>
                  {selectedClient.email && <p className="text-xs text-muted-foreground">{selectedClient.email}</p>}
                  {selectedClient.company_ice && <p className="text-[10px] font-black text-indigo-500 uppercase">ICE: {selectedClient.company_ice}</p>}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-slate-900"
                    onClick={() => { setSelectedClient(null); setFormData(p => ({ ...p, client_id: undefined })); }}
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nom de l'établissement / Partenaire</Label>
                    <Input 
                      value={formData.recipient_name || ''} 
                      onChange={e => setFormData({ ...formData, recipient_name: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-10 rounded-lg text-sm"
                      placeholder="Saisir manuellement ou choisir ci-dessus..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">N° ICE</Label>
                      <Input 
                        value={formData.recipient_ice || ''} 
                        onChange={e => setFormData({ ...formData, recipient_ice: e.target.value })}
                        className="bg-slate-50 border-slate-200 h-10 rounded-lg text-sm"
                        placeholder="Ex: 001234..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adresse (facultatif)</Label>
                      <Input 
                        value={formData.recipient_address || ''} 
                        onChange={e => setFormData({ ...formData, recipient_address: e.target.value })}
                        className="bg-slate-50 border-slate-200 h-10 rounded-lg text-sm"
                        placeholder="Ville..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* DATES */}
          <Card className="border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Date d'émission</Label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    value={typeof formData.created_at === 'string' ? formData.created_at.split('T')[0] : ''} onChange={e => setFormData({ ...formData, created_at: e.target.value })} disabled={isLocked} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Date d'échéance</Label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-sm font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    value={formData.due_date || ''} onChange={e => setFormData({ ...formData, due_date: e.target.value || undefined })} disabled={isLocked} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TVA MODE */}
          <Card className="border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500">Mode de saisie des prix</Label>
                <div className="flex items-center bg-slate-50 p-1 rounded-xl">
                  <button type="button" disabled={isLocked} onClick={() => setFormData({ ...formData, tva_mode: 'ht' })}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${formData.tva_mode === 'ht' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                    Hors Taxe (HT)
                  </button>
                  <button type="button" disabled={isLocked} onClick={() => setFormData({ ...formData, tva_mode: 'ttc' })}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${formData.tva_mode === 'ttc' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                    Toutes Taxes (TTC)
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LINE ITEMS */}
          <Card className="border border-slate-100 rounded-2xl shadow-sm">
            <CardHeader className="p-6 pb-4 flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-bold text-slate-900">Prestations</CardTitle>
              <div className="flex items-center space-x-2">
                <Popover open={openCatalogPicker} onOpenChange={setOpenCatalogPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9" disabled={isLocked}>
                      <Package className="w-3.5 h-3.5 mr-2" /> Catalogue
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 rounded-xl shadow-lg border-slate-200" align="end">
                    <Command>
                      <CommandInput className="text-sm" placeholder="Rechercher un article..." />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">Aucun article trouvé</CommandEmpty>
                        {Object.entries(groupedCatalog).map(([category, items]) => (
                          <CommandGroup key={category} heading={categoryLabels[category] || category}>
                            {items.map(item => (
                              <CommandItem key={item.id} onSelect={() => addItemFromCatalog(item)} className="p-3 cursor-pointer">
                                <div className="flex justify-between w-full items-center">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  <span className="text-xs text-muted-foreground tabular-nums">{formatMAD(item.default_price)} MAD</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9" onClick={addEmptyItem} disabled={isLocked}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> Ligne vide
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {formData.items_json?.map((item, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 group hover:border-slate-200 transition-all">
                  <div className="grid grid-cols-12 gap-x-2 gap-y-4 items-end">
                    <div className="col-span-12 space-y-1">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description de la prestation</Label>
                      <Input value={item.description ?? ''} onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="bg-white border-slate-200 h-10 rounded-lg text-sm" placeholder="Nature de la prestation" disabled={isLocked} />
                    </div>
                    <div className="col-span-4 md:col-span-1 space-y-1">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qté</Label>
                      <Input type="number" value={item.quantity ?? 0} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="bg-white border-slate-200 h-10 rounded-lg text-sm text-center px-1" disabled={isLocked} />
                    </div>
                    <div className="col-span-4 md:col-span-1 space-y-1">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pax</Label>
                      <Input type="number" value={item.nb_clients ?? 0} onChange={e => updateItem(idx, 'nb_clients', parseInt(e.target.value) || 0)}
                        className="bg-white border-slate-200 h-10 rounded-lg text-sm text-center px-1" disabled={isLocked} />
                    </div>
                    <div className="col-span-4 md:col-span-3 space-y-1">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix unit. ({formData.tva_mode === 'ht' ? 'HT' : 'TTC'})</Label>
                      <Input type="number" step="0.01" value={item.unit_price ?? 0} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="bg-white border-slate-200 h-10 rounded-lg text-sm text-right" disabled={isLocked} />
                    </div>
                    <div className="col-span-12 md:col-span-2 flex items-center justify-between bg-slate-100/50 p-2 rounded-xl border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Sous-total</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums leading-none">{formatMAD(calcLineSubtotal(item.quantity, item.unit_price))}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={isLocked}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!formData.items_json || formData.items_json.length === 0) && (
                <p className="text-sm text-muted-foreground italic text-center py-8">Aucune prestation ajoutée</p>
              )}
            </CardContent>
          </Card>

          {/* AMOUNT WORDS + NOTES */}
          <Card className="border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Montant en toutes lettres</Label>
                <Input value={formData.amount_words || ''} onChange={e => setFormData({ ...formData, amount_words: e.target.value })}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm italic" placeholder="Arrêté la présente facture à la somme de..." disabled={isLocked} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Notes</Label>
                <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notes internes..." disabled={isLocked} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* RIGHT: PREVIEW (2 cols) */}
        <aside className="lg:col-span-2 sticky top-20">
          <Card className="border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <span className="text-xs font-bold">Aperçu en direct</span>
              <Badge className="bg-white/10 text-white border-none text-[10px] font-bold rounded-lg">FACTURE</Badge>
            </div>
            <div className="p-6 bg-white">
              <div className="border border-slate-100 rounded-xl p-6 space-y-5 text-[11px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-sm text-slate-900">{formData.invoice_number}</p>
                    <p className="text-muted-foreground mt-0.5">FACTURE</p>
                  </div>
                  <div className="text-right text-muted-foreground">
                    <p>{formData.created_at ? format(new Date(formData.created_at), 'dd/MM/yyyy') : '-'}</p>
                    {formData.due_date && <p>Échéance: {format(new Date(formData.due_date), 'dd/MM/yyyy')}</p>}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="font-bold text-slate-900">{selectedClient?.name || '—'}</p>
                  {selectedClient?.email && <p className="text-muted-foreground">{selectedClient.email}</p>}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="grid grid-cols-12 font-bold text-muted-foreground border-b border-slate-100 pb-2">
                    <span className="col-span-6">Description</span>
                    <span className="col-span-2 text-center">Qté</span>
                    <span className="col-span-2 text-right">P.U.</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  {formData.items_json?.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 py-1.5">
                      <span className="col-span-6 truncate font-medium">{item.description || '...'}</span>
                      <span className="col-span-2 text-center tabular-nums">{item.quantity}</span>
                      <span className="col-span-2 text-right tabular-nums">{formatMAD(item.unit_price)}</span>
                      <span className="col-span-2 text-right tabular-nums font-bold">{formatMAD(calcLineSubtotal(item.quantity, item.unit_price))}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2 text-right">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span className="font-bold tabular-nums">{formatMAD(totals.subtotal_ht)} MAD</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TVA (10%)</span><span className="font-bold tabular-nums">{formatMAD(totals.tva_amount)} MAD</span></div>
                  <div className="flex justify-between text-base bg-slate-900 text-white rounded-xl p-4 -mx-2">
                    <span className="font-bold">Total TTC</span><span className="font-black tabular-nums">{formatMAD(totals.total_ttc)} MAD</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button onClick={handleSave} disabled={saving || isLocked} className="w-full h-11 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer la facture
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
