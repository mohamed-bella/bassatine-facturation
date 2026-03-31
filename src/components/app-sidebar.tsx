"use client"

import * as React from "react"
import {
  FileText,
  LayoutDashboard,
  Users,
  Plus,
  Zap,
  Sparkles,
  Receipt,
  CreditCard,
  Package,
  Settings,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const data = {
  navMain: [
    {
      title: "Navigation",
      items: [
        {
          title: "Vue d'ensemble",
          url: "/",
          icon: LayoutDashboard,
          color: "text-orange-500",
          activeBg: "bg-orange-50",
        },
        {
          title: "Catalogue",
          url: "/catalog",
          icon: Package,
          color: "text-cyan-500",
          activeBg: "bg-cyan-50",
        },
      ],
    },
    {
      title: "Gestion Commerciale",
      items: [
        {
          title: "Factures Commerciales",
          url: "/f-commercial",
          icon: FileText,
          color: "text-blue-500",
          activeBg: "bg-blue-50",
        },
        {
          title: "Factures Proformas",
          url: "/proformas",
          icon: Receipt,
          color: "text-emerald-500",
          activeBg: "bg-emerald-50",
        },
        {
          title: "Paiements & Encaissements",
          url: "/payments",
          icon: CreditCard,
          color: "text-rose-500",
          activeBg: "bg-rose-50",
        },
      ],
    },
    {
      title: "Outils & Relations",
      items: [
        {
          title: "Générateur IA",
          url: "/facture-commerciale/ai",
          icon: Sparkles,
          color: "text-indigo-500",
          activeBg: "bg-indigo-50",
        },
        {
          title: "Partenaires & Agences",
          url: "/clients",
          icon: Users,
          color: "text-pink-500",
          activeBg: "bg-pink-50",
        },
      ],
    },
    {
      title: "Système",
      items: [
        {
          title: "Paramètres",
          url: "/settings",
          icon: Settings,
          color: "text-slate-500",
          activeBg: "bg-slate-100",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r-slate-100" {...props}>
      <SidebarHeader className="pt-8 pb-4 px-6 flex flex-col items-center border-b border-slate-50 mb-4">
        <SidebarMenu>
          <SidebarMenuItem>
              <Link href="/" className="flex flex-col items-center gap-4 w-full group">
                <div className="relative group-hover:scale-105 transition-all duration-500 shrink-0">
                  <img 
                    src="https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png" 
                    alt="Bassatine Logo"
                    className="h-10 w-auto object-contain group-data-[state=collapsed]:h-6 transition-all duration-300"
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5 leading-none group-data-[state=collapsed]:hidden">
                  <span className="font-black text-[11px] tracking-[0.2em] text-slate-900 group-hover:text-orange-600 transition-colors uppercase">Skoura Group</span>
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em]">Billing Hub</span>
                </div>
              </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 gap-6">
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title} className="px-2">
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2 px-2">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        tooltip={item.title}
                        className={`h-11 px-3 rounded-xl transition-all duration-300 ${isActive ? `${item.activeBg} font-black` : "hover:bg-slate-50 text-slate-500 font-bold hover:text-slate-900"}`}
                      >
                        <Link href={item.url} className="flex items-center">
                          <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? item.color : "text-slate-400"}`} />
                          <span className={`${isActive ? "text-slate-900" : ""}`}>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-6 space-y-4">
        <div className="space-y-3">
            <Link 
              href="/facture-commerciale/new" 
              className="flex items-center justify-center space-x-2 w-full bg-slate-900 hover:bg-orange-600 text-white h-12 rounded-[1rem] transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-orange-600/20 hover:-translate-y-1 group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none"></div>
               <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest relative z-10">Créer Commerciale</span>
            </Link>
            <Link 
              href="/proforma/new" 
              className="flex items-center justify-center space-x-2 w-full bg-white hover:bg-slate-50 text-slate-700 h-10 rounded-[0.8rem] transition-all duration-300 border border-slate-200 shadow-sm group"
            >
               <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
               <span className="text-[10px] font-black uppercase tracking-widest">Créer Proforma</span>
            </Link>
        </div>
        
        <button 
          onClick={() => {
            if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
              import('@/lib/supabase').then(({ supabase }) => supabase.auth.signOut());
            }
          }}
          className="flex items-center justify-center space-x-2 w-full text-slate-400 hover:text-rose-600 py-2 rounded-lg transition-colors text-[9px] font-black uppercase tracking-widest mt-2 border border-transparent hover:border-rose-100 hover:bg-rose-50"
        >
          <span>Déconnexion sécurisée</span>
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
