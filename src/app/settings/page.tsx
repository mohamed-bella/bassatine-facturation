'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings } from '@/types';
import {
  Save,
  Loader2,
  Building2,
  Image as ImageIcon,
  Phone,
  MapPin,
  Hash,
  FileText,
  CheckCircle2,
  Upload,
  Stamp,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  logo_url: '',
  stamp_url: '',
  company_name: 'BOUMHCHAD SARL AU',
  company_sub_name: 'BASSATINE SKOURA',
  company_email: 'contact@bassatine-skoura.com',
  company_address: 'Douar Boumhchad Skoura – Ouarzazate',
  company_phone: '06 23 34 99 51 – 06 61 70 99 20',
  company_ice: '002092692000010',
  company_rc: '7755/Ouarzazate',
  company_tp: '47165021',
  company_if: '25287521',
  company_cnss: '1093803',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 'global').single();
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('settings').upsert(settings, { onConflict: 'id' });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert('Erreur lors de la sauvegarde : ' + error.message);
    }
  };

  const set = (field: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement...</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-slide-up pb-20">
      {/* HEADER */}
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Configuration</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Paramètres Hôtel</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 px-8 rounded-xl text-xs font-bold transition-all bg-slate-900 hover:bg-orange-600 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? 'Sauvegardé !' : 'Sauvegarder'}
        </Button>
      </header>

      {/* IDENTITY */}
      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">Identité de l'établissement</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Ces informations apparaissent sur tous vos documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Raison sociale</Label>
            <Input value={settings.company_name || ''} onChange={e => set('company_name', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm font-bold" placeholder="BOUMHCHAD SARL AU" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500">Nom de l'hôtel / Sous-titre</Label>
            <Input value={settings.company_sub_name || ''} onChange={e => set('company_sub_name', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm" placeholder="BASSATINE SKOURA" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-bold text-slate-500 flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5" /> Adresse</Label>
            <Input value={settings.company_address || ''} onChange={e => set('company_address', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm" placeholder="Douar Boumhchad Skoura – Ouarzazate" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5" /> Téléphone(s)</Label>
            <Input value={settings.company_phone || ''} onChange={e => set('company_phone', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm" placeholder="06 23 34 99 51 – 06 61 70 99 20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 flex items-center">Email</Label>
            <Input value={settings.company_email || ''} onChange={e => set('company_email', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm" placeholder="contact@bassatine.com" />
          </div>
        </CardContent>
      </Card>

      {/* FISCAL */}
      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Hash className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">Identification fiscale</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Numéros légaux affichés en pied de documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: 'company_ice', label: 'ICE', placeholder: '002092692000010' },
            { key: 'company_rc', label: 'RC', placeholder: '7755/Ouarzazate' },
            { key: 'company_tp', label: 'T.P', placeholder: '47165021' },
            { key: 'company_if', label: 'IF', placeholder: '25287521' },
            { key: 'company_cnss', label: 'CNSS', placeholder: '1093803' },
          ].map(field => (
            <div key={field.key} className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">{field.label}</Label>
              <Input
                value={(settings as any)[field.key] || ''}
                onChange={e => set(field.key as keyof Settings, e.target.value)}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm font-mono"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* MEDIA */}
      <Card className="border border-slate-100 rounded-2xl shadow-sm">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">Médias & Visuels</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Logo et cachet apposés automatiquement sur les factures</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6">
          {/* LOGO */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center"><ImageIcon className="w-3.5 h-3.5 mr-1.5" /> URL du Logo</Label>
            <Input value={settings.logo_url || ''} onChange={e => set('logo_url', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm font-mono text-xs" placeholder="https://..." />
            {settings.logo_url && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center space-x-4">
                <img src={settings.logo_url} alt="Logo preview" className="max-h-16 max-w-[200px] object-contain rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aperçu du logo</p>
              </div>
            )}
          </div>

          <Separator className="bg-slate-100" />

          {/* STAMP */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center"><Stamp className="w-3.5 h-3.5 mr-1.5" /> URL du Cachet / Tampon</Label>
            <p className="text-[11px] text-muted-foreground italic">Le cachet sera automatiquement affiché sur les <strong>Factures Commerciales</strong> (non sur les proformas).</p>
            <Input value={settings.stamp_url || ''} onChange={e => set('stamp_url', e.target.value)}
              className="h-11 bg-slate-50 border-slate-200 rounded-xl text-sm font-mono text-xs" placeholder="https://..." />
            {settings.stamp_url && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center space-x-4">
                <img src={settings.stamp_url} alt="Cachet preview" className="max-h-24 max-w-[200px] object-contain rounded opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aperçu du cachet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PREVIEW */}
      <Card className="border-2 border-dashed border-slate-100 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
            <FileText className="w-4 h-4 mr-2 text-orange-600" /> Aperçu entête de facture
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="border border-slate-100 rounded-xl p-8 bg-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-16 mb-3 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 rounded-xl mb-3 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                <p className="font-black text-base">{settings.company_name}</p>
                <p className="text-xs font-bold text-slate-500">{settings.company_sub_name}</p>
                <p className="text-xs text-slate-400">{settings.company_address}</p>
                <p className="text-xs text-slate-400">{settings.company_phone}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold text-slate-700">OUARZAZATE LE : <strong>{new Date().toLocaleDateString('fr-FR')}</strong></p>
              </div>
            </div>
            <p className="text-base font-black mb-2">FACTURE COMMERCIALE N° : XXX</p>
            <p className="text-sm"><span className="text-[#2563eb] font-bold">DOIT :</span> <strong>NOM DU CLIENT</strong></p>
            <p className="text-sm"><span className="text-[#2563eb] font-bold">ICE :</span> <strong>000000000000000</strong></p>
          </div>
        </CardContent>
      </Card>

      {/* SAVE FOOTER */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="h-13 px-10 rounded-xl text-sm font-black transition-all bg-slate-900 hover:bg-orange-600 text-white shadow-2xl shadow-slate-900/10"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : saved ? <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-400" /> : <Save className="w-5 h-5 mr-3" />}
          {saved ? 'Configuration sauvegardée !' : 'Sauvegarder la configuration'}
        </Button>
      </div>
    </div>
  );
}
