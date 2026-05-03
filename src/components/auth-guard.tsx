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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-4 font-sans">
        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in zoom-in duration-500">
          {/* LOGO & HEADER */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
              <img 
                src="https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png" 
                alt="Logo"
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Espace Facturation</h1>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Bassatine Skoura</p>
            </div>
          </div>

          {/* LOGIN CARD */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email</label>
                  <Input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@bassatine.com"
                    className="h-12 bg-slate-50/50 border-slate-100 rounded-xl text-sm focus:ring-0 focus:border-slate-300 transition-all placeholder:text-slate-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Mot de passe</label>
                  <Input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-slate-50/50 border-slate-100 rounded-xl text-sm focus:ring-0 focus:border-slate-300 transition-all placeholder:text-slate-300"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="py-3 px-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight text-center">{errorMsg}</p>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={authLoading}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </div>

          {/* FOOTER */}
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
              Administration Sécurisée v4.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
