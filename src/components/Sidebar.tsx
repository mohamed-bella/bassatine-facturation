'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  History, 
  LayoutDashboard,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const menuItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/invoices', label: 'Documents', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/analytics', label: 'Insights', icon: BarChart3 },
  { href: '/trash', label: 'Archive', icon: Trash2 },
  { href: '/settings', label: 'Configure', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 h-screen fixed left-0 top-0 p-8 flex flex-col no-print z-50">
      <div className="glass-dark h-full rounded-[2.5rem] flex flex-col p-8 border-slate-800/50 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-3 mb-16 pl-2">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter text-white leading-none">BASSATINE</span>
            <span className="text-[9px] font-black tracking-[0.2em] text-orange-600 opacity-80 uppercase pt-1">v2.0 SPATIAL</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={twMerge(
                  clsx(
                    "flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    isActive ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-orange-600/10 border-l-4 border-orange-600 rounded-r-none rounded-2xl pointer-events-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={clsx("w-5 h-5", isActive ? "text-orange-600" : "group-hover:text-white transition-colors")} />
                <span className="text-[11px] font-black uppercase tracking-widest leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-8 border-t border-white/5">
          <Link 
            href="/invoice/new" 
            className="w-full bg-orange-600 border border-orange-400 hover:bg-orange-700 text-white rounded-2xl py-4 flex items-center justify-center space-x-3 transition-all duration-500 shadow-[0_20px_40px_-10px_rgba(249,115,22,0.3)] group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
            <Plus className="w-4 h-4 translate-y-[1px]" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">New Doc</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
