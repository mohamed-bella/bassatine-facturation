'use client';

import { useState, useEffect } from 'react';
import { login, getSession } from '@/app/actions/auth-actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Loader2, Sparkles, Mail, Key, Zap } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const authenticated = await getSession();
      setIsAuthenticated(authenticated);
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMsg(null);

    const result = await login(email, password);

    if (result.success) {
      setIsAuthenticated(true);
    } else {
      setErrorMsg(result.error || "Identifiants incorrects. Veuillez réessayer.");
    }
    
    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authentification...</span>
         </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex bg-white selection:bg-orange-600 selection:text-white overflow-hidden font-sans relative">
        {/* MOBILE BACKGROUND (Hidden on Desktop) */}
        <div className="absolute inset-0 lg:hidden pointer-events-none">
           <div 
             className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
             style={{ backgroundImage: "url('https://bassatine-skoura.com/wp-content/uploads/2025/01/3fea9338-cc5b-4a5d-aa54-f7b20ec1880c.jpg')" }}
           />
           <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white" />
        </div>

        {/* LEFT SIDE: IMMERSIVE IMAGE (Desktop Only) */}
        <div className="hidden lg:flex lg:w-3/5 xl:w-[65%] relative overflow-hidden bg-slate-900">
           <div 
             className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-slow-zoom"
             style={{ backgroundImage: "url('https://bassatine-skoura.com/wp-content/uploads/2025/01/3fea9338-cc5b-4a5d-aa54-f7b20ec1880c.jpg')" }}
           />
           {/* IMAGE OVERLAY GRADIENT */}
           <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
           
           {/* IMAGE CONTENT OVERLAY */}
           <div className="absolute inset-0 p-20 flex flex-col justify-between text-white z-10">
              <div className="flex items-center gap-4">
                 <div className="w-24 h-24 bg-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-6 border border-white/20 rotate-6 group hover:rotate-0 transition-all duration-700 overflow-hidden relative p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img 
                      src="https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png" 
                      alt="Logo"
                      className="w-full h-auto object-contain relative z-10"
                    />
                 </div>
              </div>
              
              <div className="max-w-xl">
                 <h2 className="text-6xl font-black tracking-tighter leading-[0.9] mb-8">
                    Gestion de la <br/> 
                    <span className="text-orange-500">Facturation Luxe.</span>
                 </h2>
                 <p className="text-lg font-medium text-slate-300 leading-relaxed">
                    Le portail administratif privé pour le contrôle des transactions, 
                    la génération de proformas et le suivi des agences partenaires.
                 </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-white/40">
                 <div className="w-10 h-[1px] bg-white/20"></div>
                 <span>Propelled by AI Integration</span>
              </div>
           </div>
        </div>

        {/* RIGHT SIDE: SOLID LOGIN INTERFACE */}
        <div className="flex-1 lg:w-2/5 xl:w-[35%] flex flex-col justify-center items-center p-8 md:p-20 relative bg-white border-l border-slate-50">
           
           <div className="w-full max-w-sm animate-fade-in space-y-12">
              
              <div className="space-y-6">
                 <img 
                   src="https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png" 
                   alt="Logo"
                   className="h-12 w-auto object-contain mb-8"
                 />
                 <h3 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Bienvenue.</h3>
                 <p className="text-sm font-bold text-slate-400">Accédez à votre espace de travail sécurisé.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
                 <div className="space-y-5">
                    <div className="space-y-3 group">
                       <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 group-focus-within:text-orange-600 transition-colors">Identifiant Email</label>
                       <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-600 transition-all z-10" />
                          <Input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="votre@email.com"
                            className="h-14 pl-12 bg-white border-2 border-slate-200 rounded-2xl text-base font-black focus-visible:ring-4 focus-visible:ring-orange-500/10 focus:border-orange-500 transition-all placeholder:text-slate-300 shadow-sm"
                            required
                          />
                       </div>
                    </div>

                    <div className="space-y-3 group">
                       <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 group-focus-within:text-orange-600 transition-colors">Mot de passe</label>
                       <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-600 transition-all z-10" />
                          <Input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-14 pl-12 bg-white border-2 border-slate-200 rounded-2xl text-base font-black focus-visible:ring-4 focus-visible:ring-orange-500/10 focus:border-orange-500 transition-all placeholder:text-slate-300 shadow-sm"
                            required
                          />
                       </div>
                    </div>
                 </div>

                 {errorMsg && (
                   <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-2xl animate-shake">
                      <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest text-center">{errorMsg}</p>
                   </div>
                 )}

                 <Button 
                   type="submit" 
                   disabled={authLoading}
                   className="w-full h-16 bg-slate-900 border-2 border-slate-900 hover:bg-orange-600 hover:border-orange-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-orange-500/40 active:scale-[0.98] flex items-center justify-center space-x-2"
                 >
                   {authLoading ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <>
                        <span>DÉVERROUILLER L'ACCÈS</span>
                        <Zap className="w-4 h-4 ml-2 fill-current" />
                     </>
                   )}
                 </Button>
              </form>

              <div className="pt-20 border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                 <span>Bassatine Skoura v4.0</span>
                 <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
