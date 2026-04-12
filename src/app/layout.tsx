import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LayoutShell } from "@/components/LayoutShell";

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
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full font-sans antialiased text-slate-900 overflow-x-hidden selection:bg-orange-600 selection:text-white", jakarta.variable)}>
      <body className={`${jakarta.className} min-h-screen bg-background text-slate-900`}>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

