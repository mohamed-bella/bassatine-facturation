'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Zap, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Table as TableIcon, 
  User, 
  Plus, 
  ChevronLeft,
  Key,
  MessageSquare
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { generateInvoiceFromJson } from '@/app/actions/ai-actions';

export default function AiInvoiceCreatorPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [docType, setDocType] = useState<'invoice' | 'proforma'>('invoice');

  const handleGenerate = async () => {
    if (!prompt) {
      alert("Veuillez décrire la facture à générer.");
      return;
    }

    setLoading(true);
    try {
      const content = await generateInvoiceFromJson(prompt);
      setResult(content);
    } catch (err: any) {
      alert("Erreur lors de la génération : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    sessionStorage.setItem('ai_invoice_data', JSON.stringify(result));
    if (docType === 'invoice') {
      router.push('/facture-commerciale/new?source=ai');
    } else {
      router.push('/proforma/new?source=ai');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-slide-up pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center">
              <Sparkles className="w-8 h-8 mr-3 text-orange-600 animate-pulse" />
              Générateur IA
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Créez vos documents en langage naturel</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* INPUT SECTION */}
        <div className="space-y-6">
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-2">
            <button 
              onClick={() => setDocType('invoice')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${docType === 'invoice' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              F. Commercialle
            </button>
            <button 
              onClick={() => setDocType('proforma')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${docType === 'proforma' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              F. Proforma
            </button>
          </div>

          <Card className="border-none shadow-sm rounded-[2.5rem] bg-indigo-900 text-white overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest px-1 flex items-center">
                    <MessageSquare className="w-3 h-3 mr-2" /> 
                    Description de la facture
                  </label>
                  <Badge className="bg-white/10 text-white border-none text-[8px] font-black tracking-widest uppercase">GPT-4o Mini</Badge>
                </div>
                <Textarea 
                  placeholder="Ex: Facture pour client Hotel Relax, ICE 00123. 2 chambres doubles à 450 MAD TTC par nuit..."
                  className="min-h-[220px] bg-white/5 border-white/10 rounded-2xl text-sm leading-relaxed focus:bg-white/10 transition-all placeholder:text-white/20"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full h-14 bg-white hover:bg-orange-600 text-indigo-900 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Zap className="w-5 h-5 mr-3 fill-current" />}
                {loading ? 'Analyse en cours...' : 'Générer la structure'}
              </Button>
            </CardContent>
          </Card>
          
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Astuce Pro</h4>
             <p className="text-xs text-slate-500 leading-relaxed italic">
               "Mentionnez directement le prix TTC, le nom du client et l'ICE si vous le connaissez. L'IA s'occupe de tout structurer !"
             </p>
          </div>
        </div>

        {/* PREVIEW SECTION */}
        <div className="space-y-6">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                <TableIcon className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">En attente de génération</p>
              <p className="text-xs text-slate-300 mt-2 max-w-[200px] italic leading-relaxed">Décrivez votre facture à gauche pour voir le résultat ici.</p>
            </div>
          ) : (
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden animate-slide-up">
              <CardHeader className="p-8 border-b border-slate-50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Prévisualisation</CardTitle>
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5 italic">Généré par IA</p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest">Analysé</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Client Info */}
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Partenaire détecté</p>
                    <p className="font-black text-slate-900 text-lg">{result.client_name || '—'}</p>
                    {result.client_ice && (
                      <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">ICE: {result.client_ice}</p>
                    )}
                  </div>
                </div>

                <Separator className="bg-slate-50" />

                {/* Items Table */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Articles</p>
                  <div className="space-y-3">
                    {result.items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.description}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                            {item.quantity} x {item.unit_price} MAD
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 tabular-nums">{(item.quantity * item.unit_price).toFixed(2)}</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase">TTC</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer confirm */}
                <div className="pt-6 border-t border-slate-50 mt-4">
                   <Button 
                    onClick={handleConfirm}
                    className="w-full h-14 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Valider & Créer la facture <ArrowRight className="w-4 h-4 ml-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
