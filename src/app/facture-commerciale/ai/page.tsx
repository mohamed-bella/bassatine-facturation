'use client';

import { useState, useRef, useEffect } from 'react';
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
  MessageSquare,
  Send
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';

import { chatInvoiceAi } from '@/app/actions/ai-actions';
import { formatMAD, calcLineSubtotal, calcDocumentTotals } from '@/lib/calculations';

// Generic A4 preview mimicking the real PDF layout
function AiPreviewDoc({ data, isProforma }: { data: any, isProforma: boolean }) {
  const docTitle = isProforma ? 'FACTURE PROFORMA' : 'FACTURE COMMERCIALE';
  const docNum = isProforma ? '202X/00X (Aperçu)' : '202X/00X (Aperçu)';
  const dateStr = format(new Date(), 'dd/MM/yyyy');

  const items = data.items || [];
  const emptyRowCount = Math.max(0, 8 - items.length);

  const subtotalHt = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price) / 1.1, 0);
  const totalTtc = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0);
  const tvaAmount = totalTtc - subtotalHt;

  return (
    <div
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12.5px',
        color: '#000',
        background: '#fff',
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 10mm',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        transform: 'scale(0.55)',
        transformOrigin: 'top center',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
        <div>
          <div style={{ width: '70px', height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '6px' }} />
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '8px' }}>BOUMHCHAD SARL AU</div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>BASSATINE SKOURA</div>
          <div style={{ fontSize: '11px', color: '#444' }}>Douar Boumhchad Skoura – Ouarzazate</div>
          <div style={{ fontSize: '11px', color: '#444' }}>06 23 34 99 51 – 06 61 70 99 20</div>
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
          <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '15px' }}>{data.client_name || '—'}</span>
        </div>
        {(data.client_ice) && (
          <div>
            <span style={{ color: '#2563eb', fontWeight: 'bold' }}>ICE :</span>
            <span style={{ fontWeight: 'bold', marginLeft: '20px' }}>{data.client_ice}</span>
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '12.5px' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'left', width: '40%' }}>DÉSIGNATION</th>
            <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center', width: '12%' }}>NB CHAMBRES/QTE</th>
            <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center', width: '12%' }}>NB CLIENTS</th>
            <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center', width: '18%' }}>P.U (DH)</th>
            <th style={{ border: '1.5px solid #000', padding: '8px 5px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center', width: '18%' }}>TOTAL TTC</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => {
            const qty = item.quantity || 1;
            const price = item.unit_price || 0;
            const nbClients = item.nb_clients || '';
            const total = qty * price;
            return (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '5px 7px' }}>{item.description}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>{qty || ''}</td>
                <td style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>{nbClients}</td>
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
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: 'bold' }}>TOTAL TTC</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatMAD(totalTtc)} DH</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>TOTAL HT</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right' }}>{formatMAD(subtotalHt)} DH</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>DONT TVA 10%</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right' }}>{formatMAD(tvaAmount)} DH</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '8mm', fontSize: '11px' }}>
        <div style={{ marginBottom: '3px' }}>Arrête la présente facture à la somme de :</div>
        <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '12px', textTransform: 'uppercase' }}>
          {data.amount_words || '{MONTANT EN TOUTES LETTRES}'}
        </div>
      </div>
    </div>
  );
}

export default function AiInvoiceCreatorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [docType, setDocType] = useState<'invoice' | 'proforma'>('invoice');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputVal.trim()) return;

    const newMessages = [...messages, { role: 'user', content: inputVal }];
    setMessages(newMessages);
    setInputVal('');
    setLoading(true);

    try {
      const response = await chatInvoiceAi(newMessages);
      
      if (response.type === 'data') {
        setResult(response.data);
        setMessages(m => [...m, { role: 'assistant', content: '✅ Formidable ! J\'ai toutes les informations nécessaires. Voici la prévisualisation complète de votre facture.' }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', content: response.message || '' }]);
        setResult(null); // Clear preview if AI reverted to chat due to confusing follow-up
      }
    } catch (err: any) {
      setMessages(m => [...m, { role: 'assistant', content: "❌ Erreur de génération : " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    sessionStorage.setItem('ai_invoice_data', JSON.stringify(result));
    if (docType === 'invoice') {
      router.push('/facture-commerciale/new?source=ai');
    } else {
      router.push('/proforma/new?source=ai');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-slide-up pb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6 lg:sticky lg:top-8">
        <header className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center">
              <Sparkles className="w-8 h-8 mr-3 text-orange-600 animate-pulse" />
              Générateur IA
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Chat interactif</p>
          </div>
        </header>

        <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-2">
          <button 
            onClick={() => setDocType('invoice')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${docType === 'invoice' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            Facture Commerciale
          </button>
          <button 
            onClick={() => setDocType('proforma')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${docType === 'proforma' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            Facture Proforma
          </button>
        </div>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 overflow-hidden flex flex-col h-[500px]">
          <CardHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-white flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-400" />
                Assistant Bassatine
              </CardTitle>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-none text-[8px] font-black uppercase tracking-widest">GPT-4o Mini</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm mt-10 space-y-2">
                  <p>Salutations ! 👋</p>
                  <p>Que dois-je facturer aujourd'hui ?</p>
                  <p className="text-[10px] opacity-60 mt-4 uppercase font-bold tracking-widest">Ex: Hôtel de la Ville, 3 chambres doubles à 600dhs TTC</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${m.role === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl rounded-bl-none p-4 w-16 flex justify-center border border-slate-700">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              <div className="relative">
                <Input 
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                  disabled={loading}
                  placeholder="Écrivez votre message..." 
                  className="w-full bg-slate-800 border-slate-700 text-white h-14 rounded-2xl pl-5 pr-14 focus-visible:ring-indigo-500"
                />
                <Button 
                  onClick={handleSend}
                  disabled={loading || !inputVal.trim()}
                  size="icon" 
                  className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 pt-12 lg:pt-20">
        {!result ? (
          <div className="min-h-[400px] md:h-[550px] flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
              <TableIcon className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aucun aperçu disponible</p>
            <p className="text-xs text-slate-400 mt-2 max-w-[200px] italic leading-relaxed">Communiquez avec l'IA pour générer le visuel de la facture.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up relative">
            <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-4">
               <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Aperçu Réel</h3>
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Document Généré</p>
               </div>
               <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm">Prêt</Badge>
            </div>
            
            <div className="rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-200 flex items-start justify-center pt-8 border border-slate-300 relative h-[500px] md:h-[600px]">
                <div className="scale-[0.4] sm:scale-[0.55] origin-top">
                  <AiPreviewDoc data={result} isProforma={docType === 'proforma'} />
                </div>
            </div>
 
            <Button 
              onClick={handleConfirm}
              className="w-full h-16 shadow-xl bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all"
            >
              Envoyer vers le formulaire <ArrowRight className="w-5 h-5 ml-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
