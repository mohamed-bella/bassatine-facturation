'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { convertToCSV, downloadCSV, exportToExcel, importFromExcel } from '@/lib/export-utils';
import {
  Download,
  Database,
  Table,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronLeft,
  Loader2,
  FileSpreadsheet,
  Link2,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const GOOGLE_APPS_SCRIPT = `/**
 * Google Apps Script for BASSATINE FACTURATION Sync
 * ------------------------------------------------
 * This script pulls data from your Supabase DB into this Spreadsheet.
 * 1. Open Google Sheets
 * 2. Extensions > Apps Script
 * 3. Paste this code and save.
 * 4. Run the 'syncFromSupabase' function.
 */

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";

const TABLES = ["clients", "invoices", "proformas", "payments", "product_catalog"];

function syncFromSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  TABLES.forEach(tableName => {
    try {
      const url = \`\${SUPABASE_URL}/rest/v1/\${tableName}?select=*\`;
      const options = {
        method: "get",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        }
      };
      
      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response.getContentText());
      
      if (data && data.length > 0) {
        let sheet = ss.getSheetByName(tableName);
        if (!sheet) {
          sheet = ss.insertSheet(tableName);
        } else {
          sheet.clear();
        }
        
        const headers = Object.keys(data[0]);
        const rows = data.map(item => headers.map(h => {
          const val = item[h];
          return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
        }));
        
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f3f4f6");
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        sheet.setFrozenRows(1);
      }
    } catch (e) {
      Logger.log("Error syncing " + tableName + ": " + e.message);
    }
  });
  
  Browser.msgBox("Synchronisation terminée ! Vos données sont à jour.");
}`;

const TABLES_CONFIG = [
  { id: 'clients', label: 'Liste des Partenaires', icon: <Table className="w-4 h-4" /> },
  { id: 'invoices', label: 'Factures Commerciales', icon: <Table className="w-4 h-4" /> },
  { id: 'proformas', label: 'Factures Proforma', icon: <Table className="w-4 h-4" /> },
  { id: 'payments', label: 'Journal des Paiements', icon: <Table className="w-4 h-4" /> },
  { id: 'product_catalog', label: 'Catalogue de Services', icon: <Table className="w-4 h-4" /> },
];

export default function BackupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [importingTable, setImportingTable] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const exportTable = async (tableName: string, fileName: string, type: 'csv' | 'excel' = 'csv') => {
    setLoading(`${tableName}_${type}`);
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        if (type === 'excel') {
          await exportToExcel(data, `${fileName}_${new Date().toISOString().split('T')[0]}`, tableName);
        } else {
          const csv = convertToCSV(data);
          downloadCSV(csv, `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
        }
      } else {
        alert("Aucune donnée à exporter pour cette table.");
      }
    } catch (err: any) {
      alert("Erreur lors de l'export: " + err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleImportClick = (tableName: string) => {
    setImportingTable(tableName);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importingTable) return;

    setLoading(`import_${importingTable}`);
    try {
      const data = await importFromExcel(file);
      if (data.length === 0) throw new Error("Le fichier Excel est vide ou invalide.");

      const { error } = await supabase.from(importingTable).upsert(data);
      if (error) throw error;

      alert(`Importation réussie : ${data.length} enregistrements traités dans '${importingTable}'.`);
    } catch (err: any) {
      alert("Erreur lors de l'importation: " + err.message);
    } finally {
      setLoading(null);
      setImportingTable(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyScript = () => {
    const finalScript = GOOGLE_APPS_SCRIPT
      .replace("YOUR_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL || "")
      .replace("YOUR_SUPABASE_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
    
    navigator.clipboard.writeText(finalScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto pb-40 animate-slide-up">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Sauvegarde & Synchronisation</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Gardez vos données en sécurité et connectez-les à vos outils.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Base de données sécurisée
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CSV EXPORTS */}
        <section className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-8">
            <CardHeader className="p-0 mb-8">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-black">Exports CSV Locaux</CardTitle>
              <CardDescription>Téléchargez vos données instantanément au format compatible Excel.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {TABLES_CONFIG.map((table) => (
                <div key={table.id} className="group flex flex-col p-5 bg-slate-50 hover:bg-slate-100 rounded-[2rem] border border-slate-100 transition-all space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-all shadow-sm">
                        {table.icon}
                      </div>
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{table.label}</span>
                    </div>
                    <Badge variant="outline" className="bg-white/50 text-[9px] font-bold py-0.5 px-2 rounded-lg border-slate-200 uppercase tracking-widest text-slate-400">Stable</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => exportTable(table.id, table.id, 'excel')}
                      disabled={loading === `${table.id}_excel`}
                      className="h-10 rounded-xl bg-slate-900 hover:bg-orange-600 text-white text-[10px] font-black uppercase transition-all shadow-lg shadow-slate-900/10"
                    >
                      {loading === `${table.id}_excel` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />}
                      Export Excel
                    </Button>
                    <Button
                      onClick={() => handleImportClick(table.id)}
                      disabled={loading === `import_${table.id}`}
                      variant="outline"
                      className="h-10 rounded-xl bg-white hover:bg-emerald-50 hover:text-emerald-600 border-slate-200 text-slate-600 text-[10px] font-black uppercase transition-all"
                    >
                      {loading === `import_${table.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                      Import Excel
                    </Button>
                  </div>
                  
                  <div className="flex justify-center">
                    <button 
                      onClick={() => exportTable(table.id, table.id, 'csv')}
                      disabled={loading === `${table.id}_csv`}
                      className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                    >
                      Télécharger CSV simple
                    </button>
                  </div>
                </div>
              ))}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls" 
                onChange={handleFileUpload}
              />
            </CardContent>

          </Card>

          <Card className="border border-orange-100 rounded-[2.5rem] bg-orange-50/30 p-8">
             <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Rappel de Sécurité</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vos fichiers CSV contiennent des informations sensibles sur vos clients et vos revenus. 
                    Ne partagez ces fichiers qu'avec des personnes de confiance.
                  </p>
                </div>
             </div>
          </Card>
        </section>

        {/* GOOGLE SHEETS SYNC */}
        <section className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden p-8">
            <CardHeader className="p-0 mb-8">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-black text-white">Synchronisation Google Sheets</CardTitle>
              <CardDescription className="text-white/40">Connectez votre base de données en temps réel à un tableau Google.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-8">
              <div className="space-y-4">
                 {[
                   { step: '1', text: 'Ouvrez un nouveau Google Spreadsheet.' },
                   { step: '2', text: 'Allez dans Extensions > Apps Script.' },
                   { step: '3', text: 'Copiez le code ci-dessous et collez-le.' },
                   { step: '4', text: "Enregistrez et exécutez la fonction 'syncFromSupabase'." },
                 ].map((s) => (
                   <div key={s.step} className="flex items-center space-x-4">
                     <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black border border-white/10">{s.step}</span>
                     <p className="text-xs text-white/70 font-medium">{s.text}</p>
                   </div>
                 ))}
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center">
                      <Link2 className="w-3.5 h-3.5 mr-2" /> Script de Sync Pré-configuré
                    </span>
                    <Button 
                      onClick={copyScript} 
                      className={cn(
                        "h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black transition-all",
                        copied && "bg-white text-emerald-600"
                      )}
                    >
                      {copied ? <CheckCircle2 className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                      {copied ? "Copié !" : "Copier le code"}
                    </Button>
                  </div>
                  <pre className="text-[10px] text-white/30 font-mono overflow-x-auto h-32 scrollbar-hide py-2">
                    {GOOGLE_APPS_SCRIPT.substring(0, 300)}...
                  </pre>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <p className="text-[11px] text-white/50 leading-relaxed italic">
                  💡 Ce script utilise votre clé de lecture sécurisée pour importer automatiquement chaque table dans son propre onglet. 
                  Vous n'avez pas besoin de télécharger des fichiers manuellement.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
