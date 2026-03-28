'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CatalogItem, CatalogCategory } from '@/types';
import { formatMAD } from '@/lib/calculations';
import {
  Plus,
  Loader2,
  Save,
  Trash2,
  Package,
  Bed,
  UtensilsCrossed,
  Receipt,
  MoreHorizontal,
  Edit,
  Power,
  PowerOff,
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_CONFIG: Record<CatalogCategory, { label: string; icon: typeof Package; color: string }> = {
  chambre: { label: 'Chambre', icon: Bed, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  service: { label: 'Service', icon: UtensilsCrossed, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  taxe: { label: 'Taxe', icon: Receipt, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  autre: { label: 'Autre', icon: Package, color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({
    name: '',
    description: '',
    default_price: '',
    category: 'chambre' as CatalogCategory,
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_catalog')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', default_price: '', category: 'chambre' });
    setEditingItem(null);
    setShowModal(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || null,
      default_price: parseFloat(form.default_price) || 0,
      category: form.category,
    };

    if (editingItem) {
      await supabase.from('product_catalog').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('product_catalog').insert([payload]);
    }
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article du catalogue ?')) return;
    await supabase.from('product_catalog').delete().eq('id', id);
    fetchData();
  };

  const toggleActive = async (item: CatalogItem) => {
    await supabase.from('product_catalog').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData();
  };

  const filtered = items.filter(i => filter === 'all' || i.category === filter);

  const stats = {
    total: items.length,
    active: items.filter(i => i.is_active).length,
    chambres: items.filter(i => i.category === 'chambre').length,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement du catalogue...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-slide-up">
      {/* HEADER */}
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Configuration</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Catalogue de Prestations</h1>
          <p className="text-sm text-muted-foreground mt-1">Définissez les types de chambres, services et taxes à utiliser dans vos documents.</p>
        </div>

        <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un article
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl p-8 border-none shadow-2xl bg-white">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
                {editingItem ? 'Modifier l\'article' : 'Nouvel article'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cet article sera disponible dans le sélecteur de prestations
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Nom de l'article *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                  required
                  placeholder="Ex: Chambre Double"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Description</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                  placeholder="Description optionnelle"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Prix par défaut (MAD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.default_price}
                    onChange={e => setForm({ ...form, default_price: e.target.value })}
                    className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Catégorie *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as CatalogCategory })}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="chambre">Chambre</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="taxe">Taxe</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

      {/* STATS ROW */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="px-4 py-2 rounded-xl text-xs font-bold">{stats.total} articles</Badge>
        <Badge variant="secondary" className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-600 bg-emerald-50">{stats.active} actifs</Badge>
        <Badge variant="secondary" className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50">{stats.chambres} chambres</Badge>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-xl w-fit">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'chambre', label: 'Chambres' },
          { key: 'service', label: 'Services' },
          { key: 'taxe', label: 'Taxes' },
          { key: 'autre', label: 'Autres' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filter === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <Card className="border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500">Article</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500">Catégorie</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-right">Prix par défaut</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-center">Statut</TableHead>
              <TableHead className="py-4 px-6 text-xs font-bold text-slate-500 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-muted-foreground">Aucun article trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => {
                const cat = CATEGORY_CONFIG[item.category];
                const Icon = cat.icon;
                return (
                  <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{item.name}</span>
                        {item.description && <span className="text-xs text-muted-foreground mt-0.5">{item.description}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge variant="outline" className={`rounded-lg text-[11px] font-bold border ${cat.color}`}>
                        <Icon className="w-3 h-3 mr-1.5" />
                        {cat.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{formatMAD(item.default_price)}</span>
                      <span className="text-xs text-muted-foreground ml-1">MAD</span>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      {item.is_active ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 border rounded-lg text-[11px] font-bold">Actif</Badge>
                      ) : (
                        <Badge className="bg-slate-50 text-slate-400 border-slate-200 border rounded-lg text-[11px] font-bold">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl p-1 border-slate-200 shadow-lg bg-white w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setForm({
                                name: item.name,
                                description: item.description || '',
                                default_price: String(item.default_price),
                                category: item.category,
                              });
                              setEditingItem(item);
                              setShowModal(true);
                            }}
                            className="p-2 rounded-lg cursor-pointer text-sm"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-slate-400" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive(item)}
                            className="p-2 rounded-lg cursor-pointer text-sm"
                          >
                            {item.is_active ? (
                              <><PowerOff className="w-3.5 h-3.5 mr-2 text-slate-400" /> Désactiver</>
                            ) : (
                              <><Power className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Activer</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100 mx-1" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg cursor-pointer text-sm text-rose-600 focus:bg-rose-50"
                          >
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
