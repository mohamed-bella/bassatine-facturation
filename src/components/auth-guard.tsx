'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Lock, Loader2, Sparkles, Key } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'DH1999';

  useEffect(() => {
    // Check localStorage for session
    const session = localStorage.getItem('app_session');
    if (session === APP_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, [APP_PASSWORD]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      localStorage.setItem('app_session', APP_PASSWORD);
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6 selection:bg-orange-600 selection:text-white">
        <div className="max-w-md w-full animate-slide-up">
          {/* LOGO AREA */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 border border-slate-100 rotate-12 group hover:rotate-0 transition-all duration-500">
               <Lock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">BASSATINE</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground pl-1">Facturation Studio</p>
          </div>

          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-indigo-600 w-full" />
            <CardHeader className="p-8 pb-4 text-center">
              <CardTitle className="text-xl font-bold">Sécurité d'accès</CardTitle>
              <CardDescription className="text-xs italic">Veuillez saisir votre mot de passe pour continuer.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <div className="relative group">
                     <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                     <Input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`h-14 pl-12 bg-slate-50 border-slate-100 rounded-2xl text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${error ? 'border-rose-300 ring-4 ring-rose-300/10' : ''}`}
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-widest animate-shake">Mot de passe incorrect</p>}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-slate-900 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold transition-all shadow-xl hover:shadow-orange-200 active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  <span>DÉVERROUILLER LE DASHBOARD</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Bassatine Skoura • © 2026 Admin Panel
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
