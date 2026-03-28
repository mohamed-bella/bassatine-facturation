import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Sidebar from '@/components/Sidebar';
import { Search, Bell, User, MessageCircle, MoreHorizontal } from 'lucide-react';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bassatine Facturation | Professional Suite",
  description: "Next-gen invoicing and financial orchestration for luxury hospitality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full bg-slate-50 font-sans antialiased text-slate-900 overflow-x-hidden selection:bg-orange-600 selection:text-white", "font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen flex text-slate-900 bg-slate-50/10`}>
        {/* SIDEBAR NAVIGATION */}
        <Sidebar aria-hidden="false" />

        {/* MAIN STAGE */}
        <main className="flex-1 ml-[400px] mr-10 min-h-screen flex flex-col pointer-events-auto">
          {/* HEADER LAYER */}
          <header className="h-28 flex items-center justify-between no-print z-40 sticky top-0 bg-white/2 backdrop-blur-sm px-4">
            <div className="flex flex-col group cursor-crosshair">
               <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] group-hover:text-orange-600 transition-colors">Workspace Overview</span>
               <div className="flex items-center space-x-3 mt-1 underline decoration-slate-100 underline-offset-8">
                  <h1 className="text-2xl font-black tracking-tighter text-slate-900">Bassatine Skoura Dashboard</h1>
                  <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none ring-1 ring-emerald-500/10 shadow-[0_4px_10px_rgba(16,185,129,0.1)]">Sync Live</span>
               </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-orange-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Universal Search..." 
                  className="bg-white border-none pl-12 pr-6 py-4 rounded-2xl w-80 text-xs font-black uppercase tracking-widest focus:ring-1 focus:ring-slate-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] placeholder-slate-200 transition-all font-sans"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-20 pointer-events-none pr-1">
                   <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-black">⌘</span>
                   <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-black">K</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="w-14 h-14 bg-white hover:bg-slate-50 rounded-2xl flex items-center justify-center transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-100 relative group overflow-hidden">
                  <Bell className="w-5 h-5 text-slate-300 group-hover:text-slate-900 group-hover:rotate-12 transition-all" />
                  <span className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full border-2 border-white ring-2 ring-rose-500/10 group-hover:scale-150 transition-transform"></span>
                </button>
                <button className="w-14 h-14 bg-white hover:bg-slate-50 rounded-2xl flex items-center justify-center transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-100 group">
                  <MessageCircle className="w-5 h-5 text-slate-300 group-hover:text-slate-900 group-hover:-translate-y-1 transition-all" />
                </button>
                <div className="w-14 h-14 bg-slate-900 overflow-hidden shadow-2xl relative cursor-pointer hover:scale-105 transition-transform group rounded-2xl ml-4">
                  <div className="absolute inset-0 bg-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <img src="https://ui-avatars.com/api/?name=Antigravity+AI&background=0f172a&color=fff&bold=true" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT LAYER */}
          <div className="flex-1 py-10 relative pointer-events-auto">
            {children}
          </div>

          {/* BACKGROUND SPATIAL DECORATIONS */}
          <div className="no-print fixed top-[-100px] right-[-100px] w-96 h-96 bg-orange-100/10 blur-[150px] pointer-events-none select-none z-[-1]" />
          <div className="no-print fixed bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-slate-200/20 blur-[150px] pointer-events-none select-none z-[-1]" />
        </main>
      </body>
    </html>
  );
}
