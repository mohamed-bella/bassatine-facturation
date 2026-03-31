import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/auth-guard";


const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Bassatine Facturation | Suite Professionnelle",
  description: "Gestion de facturation et proformas pour l'hôtellerie de luxe.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bassatine",
  },
};

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs for mobile app feel
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full font-sans antialiased text-slate-900 overflow-x-hidden selection:bg-orange-600 selection:text-white", jakarta.variable)}>
      <body className={`${jakarta.className} min-h-screen flex text-slate-900 bg-background`}>
        <TooltipProvider>
          <AuthGuard>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="bg-slate-100/80">
                {/* HEADER */}
                <header className="h-14 flex items-center no-print z-40 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-sidebar-border px-4 md:px-6">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="h-4 mr-2" />
                    <img 
                      src="https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png" 
                      alt="Logo"
                      className="h-5 md:h-6 w-auto opacity-80"
                    />
                  </div>
                </header>
 
                {/* PAGE CONTENT */}
                <div className="flex-1 py-6 md:py-8 px-4 md:px-6 relative pointer-events-auto max-w-[1600px] mx-auto w-full">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </AuthGuard>
        </TooltipProvider>
      </body>
    </html>
  );
}

