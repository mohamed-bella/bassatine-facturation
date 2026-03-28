'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings } from '@/types';
import { 
  Loader2, 
  Save, 
  Image as ImageIcon, 
  Building, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Globe, 
  Zap, 
  ShieldCheck, 
  Smartphone,
  Server,
  X,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'communication' | 'advanced'>('branding');

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
      } else {
        setSettings(data);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSuccess(false);

    const { error } = await supabase
      .from('settings')
      .update(settings)
      .eq('id', 'global');

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-10 pb-40 animate-slide-up">
      <header className="mb-20">
         <div className="flex items-center space-x-4 mb-2">
            <div className="w-6 h-1 bg-orange-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">System Nucleus</span>
         </div>
         <motion.h1 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="text-5xl font-black tracking-tighter text-slate-900 uppercase"
         >
           Settings Studio
         </motion.h1>
      </header>

      <div className="flex flex-col lg:flex-row gap-16">
         {/* TABS NAVIGATION */}
         <aside className="lg:w-80 space-y-4">
            {[
              { id: 'branding', label: 'Identity Architecture', icon: Building },
              { id: 'communication', label: 'Messaging Flow', icon: Mail },
              { id: 'advanced', label: 'System Reality', icon: Server },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full p-8 rounded-[2rem] flex items-center space-x-6 transition-all duration-500 border relative group ${activeTab === tab.id ? 'bg-slate-900 border-slate-900 shadow-2xl scale-105' : 'bg-white border-slate-100 hover:border-orange-600/20'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeTab === tab.id ? 'bg-white/10 text-orange-600' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white'}`}>
                   <tab.icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest text-left ${activeTab === tab.id ? 'text-white' : 'text-slate-300 group-hover:text-slate-900'}`}>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div layoutId="tab-active" className="absolute right-6 w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                )}
              </button>
            ))}
         </aside>

         {/* MAIN CONFIGURATION STAGE */}
         <div className="flex-1">
            <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
               <div className="lg:col-span-2 space-y-10">
                  <AnimatePresence mode="wait">
                    {activeTab === 'branding' && (
                      <motion.section 
                        key="branding"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="spatial-card bg-white p-14 space-y-12"
                      >
                         <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase flex items-center">
                            <Zap className="w-5 h-5 text-orange-600 mr-4" />
                            Visual Identity
                         </h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="group">
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4 group-focus-within:text-orange-600">Offical Company Identity</label>
                               <input 
                                type="text" 
                                className="w-full bg-slate-50 border-none p-5 rounded-2xl text-xs font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner"
                                value={settings?.company_name}
                                onChange={e => setSettings(prev => prev ? {...prev, company_name: e.target.value} : null)}
                               />
                            </div>
                            <div className="group">
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4">Official ICE Identifier</label>
                               <input 
                                type="text" 
                                className="w-full bg-slate-50 border-none p-5 rounded-2xl text-xs font-black focus:ring-1 focus:ring-slate-900 shadow-inner"
                                value={settings?.company_ice || ''}
                                onChange={e => setSettings(prev => prev ? {...prev, company_ice: e.target.value} : null)}
                               />
                            </div>
                         </div>

                         <div className="group">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4">Master Logo URL (High DPI)</label>
                            <div className="flex items-center space-x-6">
                               <input 
                                type="text" 
                                className="flex-1 bg-slate-50 border-none p-5 rounded-2xl text-xs font-black focus:ring-1 focus:ring-slate-900 shadow-inner"
                                value={settings?.logo_url}
                                onChange={e => setSettings(prev => prev ? {...prev, logo_url: e.target.value} : null)}
                               />
                               {settings?.logo_url && (
                                <div className="w-20 h-20 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-center grayscale group-hover:grayscale-0 transition-all duration-700">
                                   <img src={settings.logo_url} className="max-w-full max-h-full" alt="Logo" />
                                </div>
                               )}
                            </div>
                         </div>

                         <div className="group">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4">Document Legal Signature (Footer Details)</label>
                            <textarea 
                              rows={5}
                              className="w-full bg-slate-50 border-none p-6 rounded-[2.5rem] text-xs font-bold leading-relaxed focus:ring-1 focus:ring-slate-900 shadow-inner"
                              value={settings?.company_details}
                              onChange={e => setSettings(prev => prev ? {...prev, company_details: e.target.value} : null)}
                            />
                         </div>
                      </motion.section>
                    )}

                    {activeTab === 'communication' && (
                      <motion.section 
                        key="comm"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="spatial-card bg-white p-14 space-y-12"
                      >
                         <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase flex items-center">
                            <Mail className="w-5 h-5 text-emerald-500 mr-4" />
                            Messaging Orchestration
                         </h3>

                         <div className="group">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4">Global Subject Architecture</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-50 border-none p-5 rounded-2xl text-xs font-black uppercase focus:ring-1 focus:ring-slate-900 shadow-inner"
                              value={settings?.email_subject}
                              onChange={e => setSettings(prev => prev ? {...prev, email_subject: e.target.value} : null)}
                            />
                         </div>

                         <div className="group">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4">Master Email Reality (Template)</label>
                            <textarea 
                              rows={10}
                              className="w-full bg-slate-50 border-none p-8 rounded-[3rem] text-xs font-bold leading-relaxed focus:ring-1 focus:ring-slate-900 shadow-inner"
                              value={settings?.email_template}
                              onChange={e => setSettings(prev => prev ? {...prev, email_template: e.target.value} : null)}
                              placeholder="Utilisez les tags : {client_name}, {invoice_number}"
                            />
                            <div className="mt-6 flex items-center space-x-6">
                               <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{"{client_name}"} available</span>
                               </div>
                               <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{"{invoice_number}"} available</span>
                               </div>
                            </div>
                         </div>
                      </motion.section>
                    )}

                    {activeTab === 'advanced' && (
                      <motion.section 
                        key="advanced"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="spatial-card bg-slate-900 p-14 text-white space-y-12"
                      >
                         <h3 className="text-xl font-black tracking-tighter uppercase flex items-center">
                            <ShieldCheck className="w-5 h-5 text-orange-600 mr-4 shadow-sm" />
                            System Reality
                         </h3>

                         <div className="group">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-4">Default Tax Architecture (%)</label>
                            <input 
                              type="number" step="0.01"
                              className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl text-xs font-black focus:ring-1 focus:ring-orange-600 shadow-inner text-white"
                              value={settings?.default_tax_rate}
                              onChange={e => setSettings(prev => prev ? {...prev, default_tax_rate: parseFloat(e.target.value)} : null)}
                            />
                         </div>

                         <div className="flex flex-col space-y-6 pt-10 border-t border-white/5">
                            <div className="flex items-center justify-between opacity-30 hover:opacity-100 transition-opacity">
                               <div className="flex items-center space-x-4">
                                  <Smartphone className="w-5 h-5" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mobile Sync Architecture</span>
                               </div>
                               <span className="text-[8px] font-black bg-white/10 px-2 py-1 rounded">DEPRECATED</span>
                            </div>
                            <div className="flex items-center justify-between opacity-30 hover:opacity-100 transition-opacity">
                               <div className="flex items-center space-x-4">
                                  <Globe className="w-5 h-5" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Multilingual Realities</span>
                               </div>
                               <span className="text-[8px] font-black bg-white/10 px-2 py-1 rounded">BETA</span>
                            </div>
                         </div>
                      </motion.section>
                    )}
                  </AnimatePresence>
               </div>

               <div className="space-y-8 sticky top-32">
                  <div className="spatial-card bg-white p-10 space-y-10 border-slate-100/50 shadow-2xl relative overflow-hidden group">
                     <div className="flex items-center space-x-4 relative z-10">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronized State</span>
                     </div>

                     <button 
                       type="submit" 
                       disabled={saving}
                       className={`w-full h-20 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center space-x-3 shadow-2xl relative overflow-hidden z-10 ${success ? 'bg-emerald-500 shadow-emerald-500/20 text-white' : 'bg-slate-900 hover:bg-orange-600 text-white shadow-slate-900/10'}`}
                     >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                         success ? <CheckCircle2 className="w-5 h-5 animate-bounce" /> : (
                         <>
                           <Save className="w-4 h-4 translate-y-[1px]" />
                           <span>Save Nucles</span>
                         </>
                        )}
                     </button>

                     <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center relative z-10 px-4">
                       Les modifications impacteront tous les documents futurs générés par la suite.
                     </div>

                     <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-orange-600/5 blur-3xl pointer-events-none group-hover:bg-orange-600/10 transition-colors" />
                  </div>

                  <div className="spatial-card p-10 bg-slate-50 border-slate-100 group">
                     <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6 block">Quick Recovery</h4>
                     <button type="button" onClick={() => location.reload()} className="flex items-center space-x-4 text-[11px] font-black uppercase text-slate-900 tracking-widest hover:text-orange-600 transition-colors">
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                        <span>Force Sync State</span>
                     </button>
                  </div>
               </div>
            </form>
         </div>
      </div>
    </div>
  );
}
