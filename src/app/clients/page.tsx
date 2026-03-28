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
  MapPin, 
  TrendingUp, 
  Trash2, 
  Edit,
  Loader2,
  CheckCircle2,
  Zap,
  X,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', ice: '', email: '', phone: '', address: '' });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await supabase.from('clients').update(form).eq('id', editingClient.id);
    } else {
      await supabase.from('clients').insert([form]);
    }
    setForm({ name: '', ice: '', email: '', phone: '', address: '' });
    setEditingClient(null);
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer ce client ?')) return;
    await supabase.from('clients').delete().eq('id', id);
    fetchData();
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
    </div>
  );

  return (
    <div className="px-10 pb-20">
      <header className="flex justify-between items-end mb-16">
        <div className="flex-1">
           <div className="flex items-center space-x-4 mb-2">
             <div className="w-6 h-1 bg-orange-600 rounded-full"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Client Operations</span>
           </div>
           <motion.h1 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="text-5xl font-black tracking-tighter text-slate-900 uppercase"
           >
             Authority Directory
           </motion.h1>
        </div>
        <button 
          onClick={() => { setForm({ name: '', ice: '', email: '', phone: '', address: '' }); setEditingClient(null); setShowModal(true); }}
          className="bg-slate-900 text-white h-20 px-10 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-orange-600 transition-all flex items-center space-x-3 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          <span>Onboard New</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">
        <div className="lg:col-span-2 relative group">
           <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
            type="text" 
            placeholder="Search by Identity or Access Points..."
            className="w-full bg-white border border-slate-100 p-8 pl-16 rounded-[2.5rem] text-sm font-black uppercase tracking-widest focus:ring-1 focus:ring-slate-900 shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
           />
        </div>
        <div className="spatial-card bg-slate-900 p-8 flex items-center justify-between text-white">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Global Base</span>
              <span className="text-4xl font-black tracking-tighter text-orange-600">{clients.length} <span className="text-xs text-white/10 uppercase">Authorities</span></span>
           </div>
           <Users className="w-10 h-10 text-white/5 stroke-[3px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filtered.map((client, i) => (
            <motion.div 
              key={client.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="spatial-card bg-white p-10 hover:border-orange-600/20 group cursor-pointer transition-all duration-700"
            >
              <div className="flex justify-between items-start mb-10">
                 <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 transition-all">
                    <Building className="w-6 h-6 text-slate-300 group-hover:text-white" />
                 </div>
                 <div className="flex items-center space-x-1">
                    <button onClick={() => { setForm(client as any); setEditingClient(client); setShowModal(true); }} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all text-slate-300">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all text-slate-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div className="space-y-6">
                 <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase truncate group-hover:text-orange-600 transition-colors">{client.name}</h3>
                 <div className="space-y-4">
                    <div className="flex items-center space-x-4 opacity-40 group-hover:opacity-100 transition-opacity">
                       <Zap className="w-3.5 h-3.5 text-orange-600" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none">ICE : {client.ice || '---'}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center space-x-4 opacity-40 group-hover:opacity-100 transition-opacity">
                         <Mail className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-black uppercase tracking-widest leading-none truncate">{client.email}</span>
                      </div>
                    )}
                 </div>
              </div>

              <div className="mt-10 pt-10 border-t border-slate-50 flex justify-between items-center overflow-hidden">
                 <span className="text-[9px] font-black uppercase text-slate-200 tracking-widest group-hover:text-slate-400">Authority Synchronised</span>
                 <CheckCircle2 className="w-4 h-4 text-emerald-500/20 group-hover:text-emerald-500 transition-colors" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL SYSTEM */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[3rem] shadow-2xl p-16 max-w-2xl w-full border border-white"
            >
              <form onSubmit={handleSave} className="space-y-10">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{editingClient ? "Modifier l'autorité" : 'Nouvelle Autorité'}</h3>
                  <button type="button" onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 hover:text-slate-900 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                   <div className="group">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-3 group-focus-within:text-orange-600 transition-colors">Nom / Raison Sociale</label>
                      <input 
                        type="text" required
                        className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-1 focus:ring-slate-900 placeholder:text-slate-200 shadow-inner"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="group">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-3">Identifiant ICE</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner"
                          value={form.ice}
                          onChange={e => setForm({...form, ice: e.target.value})}
                        />
                      </div>
                      <div className="group">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-3">Email de contact</label>
                        <input 
                          type="email" 
                          className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner"
                          value={form.email}
                          onChange={e => setForm({...form, email: e.target.value})}
                        />
                      </div>
                   </div>
                   <div className="group">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-3">Adresse de Résidence / Siège</label>
                      <textarea 
                        rows={3}
                        className="w-full bg-slate-50 border-none p-5 rounded-2xl text-[11px] font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner"
                        value={form.address}
                        onChange={e => setForm({...form, address: e.target.value})}
                      />
                   </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-slate-900 text-white h-20 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-orange-600 transition-all flex items-center justify-center space-x-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Confirmer Registry</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
