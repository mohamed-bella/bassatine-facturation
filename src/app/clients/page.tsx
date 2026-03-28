'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Building,
  Trash2,
  Edit,
  Loader2,
  Save,
  MoreVertical,
  MapPin,
  StickyNote,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company_ice: '',
    address_street: '', address_city: '', address_country: 'Maroc',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let error;
    if (editingClient) {
      const { error: updErr } = await supabase.from('clients').update(form).eq('id', editingClient.id);
      error = updErr;
    } else {
      const { error: insErr } = await supabase.from('clients').insert([form]);
      error = insErr;
    }

    if (error) {
       alert('Erreur lors de la sauvegarde du client : ' + error.message);
    } else {
       resetForm();
       fetchData();
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', company_ice: '', address_street: '', address_city: '', address_country: 'Maroc', notes: '' });
    setEditingClient(null);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteError('');
    // Check for linked proformas
    const { count: pCount } = await supabase
      .from('proformas')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);
    // Check for linked invoices
    const { count: iCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);

    if ((pCount || 0) > 0 || (iCount || 0) > 0) {
      setDeleteError(`Ce partenaire a ${(pCount || 0)} proforma(s) et ${(iCount || 0)} facture(s) associées. Suppression impossible.`);
      return;
    }

    if (!confirm('Voulez-vous supprimer ce partenaire ?')) return;
    await supabase.from('clients').delete().eq('id', id);
    fetchData();
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement des partenaires...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-slide-up">
      {/* HEADER */}
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Gestion</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Répertoire Partenaires</h1>
        </div>

        <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau partenaire
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl p-8 border-none shadow-2xl bg-white">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
                {editingClient ? 'Modifier le partenaire' : 'Nouveau partenaire'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Remplissez les informations du partenaire
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Nom / Raison sociale *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                  required
                  placeholder="Ex: Hôtel Atlas"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                    placeholder="contact@hotel.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Téléphone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                    placeholder="06 XX XX XX XX"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Numéro ICE / Identification</Label>
                  <Input
                    value={form.company_ice}
                    onChange={e => setForm({ ...form, company_ice: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm font-mono"
                    placeholder="Ex: 002092692000010"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Adresse</Label>
                  <Input
                    value={form.address_street}
                    onChange={e => setForm({ ...form, address_street: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                    placeholder="Rue / Avenue"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Ville</Label>
                  <Input
                    value={form.address_city}
                    onChange={e => setForm({ ...form, address_city: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                    placeholder="Ouarzazate"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Pays</Label>
                  <Input
                    value={form.address_country}
                    onChange={e => setForm({ ...form, address_country: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Notes</Label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes internes sur ce partenaire..."
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-11 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all">
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* DELETE ERROR */}
      {deleteError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-700 font-medium">{deleteError}</p>
          <Button variant="ghost" size="sm" onClick={() => setDeleteError('')} className="ml-auto text-rose-500 hover:text-rose-700">Fermer</Button>
        </div>
      )}

      {/* SEARCH + COUNT */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou téléphone..."
            className="pl-11 h-11 bg-white border-slate-200 rounded-xl text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="bg-slate-900 text-white rounded-xl h-11 px-5 flex items-center space-x-2">
          <Users className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-black tabular-nums">{clients.length}</span>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <AnimatePresence>
          {filtered.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-white group h-full">
                <CardHeader className="p-5 pb-3 flex flex-row justify-between items-start">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-orange-50 transition-colors">
                    <Building className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl p-1 border-slate-200 shadow-lg bg-white w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setForm({
                            name: client.name,
                            email: client.email || '',
                            phone: client.phone || '',
                            company_ice: client.company_ice || '',
                            address_street: client.address_street || '',
                            address_city: client.address_city || '',
                            address_country: client.address_country || 'Maroc',
                            notes: client.notes || '',
                          });
                          setEditingClient(client);
                          setShowModal(true);
                        }}
                        className="p-2 rounded-lg cursor-pointer text-sm"
                      >
                        <Edit className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-100 mx-1" />
                      <DropdownMenuItem
                        onClick={() => handleDelete(client.id)}
                        className="p-2 rounded-lg cursor-pointer text-sm text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="p-5 pt-2 space-y-3">
                  <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-orange-600 transition-colors">
                    {client.name}
                  </h3>
                  <div className="space-y-1.5">
                    {client.email && (
                      <div className="flex items-center space-x-2 text-slate-400">
                        <Mail className="w-3 h-3" />
                        <span className="text-xs truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center space-x-2 text-slate-400">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{client.phone}</span>
                      </div>
                    )}
                    {client.address_city && (
                      <div className="flex items-center space-x-2 text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{client.address_city}{client.address_country ? `, ${client.address_country}` : ''}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                {client.notes && (
                  <CardFooter className="p-5 pt-0">
                    <div className="flex items-start space-x-2 text-slate-300 w-full">
                      <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] leading-relaxed line-clamp-2">{client.notes}</p>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
