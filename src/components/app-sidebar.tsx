"use client"

import * as React from "react"
import {
  BarChart3,
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
      title: "Principal",
      items: [
        {
          title: "Vue d'ensemble",
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Catalogue",
          url: "/catalog",
          icon: Package,
        },
      ],
    },
    {
      title: "Documents",
      items: [
        {
          title: "Proformas",
          url: "/proformas",
          icon: Receipt,
        },
        {
          title: "F. COMMERCIAL",
          url: "/f-commercial",
          icon: FileText,
        },
        {
          title: "Paiements",
          url: "/payments",
          icon: CreditCard,
        },
      ],
    },
    {
      title: "Gestion",
      items: [
        {
          title: "Générateur IA",
          url: "/facture-commerciale/ai",
          icon: Sparkles,
        },
        {
          title: "Partenaires",
          url: "/clients",
          icon: Users,
        },
      ],
    },
    {
      title: "Configuration",
      items: [
        {
          title: "Paramètres",
          url: "/settings",
          icon: Settings,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-orange-600 text-sidebar-primary-foreground">
                  <Zap className="size-4 fill-white" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-black text-sm tracking-tighter">BASSATINE</span>
                  <span className="text-[10px] text-muted-foreground font-bold opacity-60">FACTURATION</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        tooltip={item.title}
                        className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                      >
                        <Link href={item.url}>
                          <item.icon className={isActive ? "text-orange-600" : ""} />
                          <span className="font-bold text-xs">{item.title}</span>
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
      <SidebarFooter>
        <div className="p-2 space-y-2">
            <Link 
              href="/facture-commerciale/new" 
              className="flex items-center justify-center space-x-2 w-full bg-slate-900 hover:bg-orange-600 text-white py-3 rounded-xl transition-all shadow-xl group"
            >
               <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest">Facture Commerciale</span>
            </Link>
            <Link 
              href="/proforma/new" 
              className="flex items-center justify-center space-x-2 w-full bg-white hover:bg-orange-50 text-slate-900 py-3 rounded-xl transition-all border border-slate-200 group"
            >
               <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest">Facture Proforma</span>
            </Link>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
