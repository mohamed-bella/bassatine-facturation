'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthGuard from '@/components/auth-guard';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Print routes: render completely bare — no sidebar, no header, no auth guard
  if (pathname.startsWith('/print/')) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <AuthGuard>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="bg-transparent overflow-x-hidden">
            {/* HEADER */}
            <header className="h-16 flex items-center no-print z-40 sticky top-0 bg-white/60 backdrop-blur-md border-b border-white/20 px-4 md:px-6">
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
  );
}
