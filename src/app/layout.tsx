import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";


const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bassatine Facturation | Suite Professionnelle",
  description: "Gestion de facturation et proformas pour l'hôtellerie de luxe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full font-sans antialiased text-slate-900 overflow-x-hidden selection:bg-orange-600 selection:text-white", "font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen flex text-slate-900 bg-background`}>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-slate-50/10">
              {/* HEADER */}
              <header className="h-14 flex items-center no-print z-40 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-sidebar-border px-6">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="h-4 mr-2" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Bassatine Facturation</span>
                </div>
              </header>

              {/* PAGE CONTENT */}
              <div className="flex-1 py-8 px-6 relative pointer-events-auto max-w-[1600px] mx-auto w-full">
                {children}
              </div>

              {/* BACKGROUND DECORATION */}
              <div className="no-print fixed top-[-100px] right-[-100px] w-96 h-96 bg-orange-100/5 blur-[150px] pointer-events-none select-none z-[-1]" />
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

