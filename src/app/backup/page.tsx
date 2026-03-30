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

const GOOGLE_APPS_SCRIPT = `// ============================================================
// BASSATINE SKOURA — Supabase Sync + Facture Generator
// ============================================================
// SETUP:
//   1. Open Google Sheets → Extensions → Apps Script
//   2. Paste this entire script and Save
//   3. Run syncFromSupabase() to pull your data
//   4. Use the "BASSATINE" menu to generate invoices
// ============================================================

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";

const TABLE_COLORS = {
  header_bg:   "#1e293b",
  header_fg:   "#ffffff",
  even_bg:     "#f8fafc",
  odd_bg:      "#ffffff",
  border:      "#e2e8f0",
  accent:      "#f97316",
};

const TABLES = ["clients", "invoices", "proformas", "payments", "product_catalog"];

function syncTable_(ss, tableName) {
  const url = SUPABASE_URL + "/rest/v1/" + tableName + "?select=*&order=created_at.desc";
  const options = {
    method: "get",
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);
  else sheet.clear();

  if (!data || data.length === 0) {
    sheet.getRange(1, 1).setValue("Aucune donnée");
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(function(item) {
    return headers.map(function(h) {
      const val = item[h];
      if (val === null || val === undefined) return "";
      return (typeof val === "object") ? JSON.stringify(val) : val;
    });
  });

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers.map(function(h) {
    return h.toUpperCase().replace(/_/g, " ");
  })]);
  headerRange.setFontWeight("bold")
             .setFontColor(TABLE_COLORS.header_fg)
             .setBackground(TABLE_COLORS.header_bg)
             .setHorizontalAlignment("center")
             .setBorder(true, true, true, true, true, true, TABLE_COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

  const dataRange = sheet.getRange(2, 1, rows.length, headers.length);
  dataRange.setValues(rows);

  for (let r = 2; r <= rows.length + 1; r++) {
    const rowRange = sheet.getRange(r, 1, 1, headers.length);
    rowRange.setBackground(r % 2 === 0 ? TABLE_COLORS.even_bg : TABLE_COLORS.odd_bg);
    rowRange.setBorder(false, false, true, false, false, false, TABLE_COLORS.border, SpreadsheetApp.BorderStyle.SOLID_THIN);
  }

  dataRange.setFontFamily("Arial").setFontSize(10).setVerticalAlignment("middle");

  for (let c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
    const currentWidth = sheet.getColumnWidth(c);
    sheet.setColumnWidth(c, Math.max(currentWidth + 10, 80));
  }

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  headers.forEach(function(h, i) {
    const col = i + 1;
    if (h.includes("total") || h.includes("amount") || h.includes("price") ||
        h.includes("_ht") || h.includes("_ttc") || h.includes("subtotal")) {
      if (rows.length > 0) sheet.getRange(2, col, rows.length).setNumberFormat('#,##0.00 "DH"');
    }
    if (h === "created_at" || h === "updated_at" || h === "payment_date" || h === "due_date") {
      if (rows.length > 0) sheet.getRange(2, col, rows.length).setNumberFormat("dd/MM/yyyy");
    }
  });

  sheet.setTabColor(TABLE_COLORS.accent);
}

function syncFromSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Synchronisation en cours...", "BASSATINE", -1);

  TABLES.forEach(function(tableName) {
    try { syncTable_(ss, tableName); } 
    catch (e) { Logger.log("Erreur sur " + tableName + " : " + e.message); }
  });

  setupGeneratorSheet_(ss);
  ss.setActiveSheet(ss.getSheetByName("⚡ Générateur") || ss.getSheets()[0]);
  ss.toast("Terminé ! Utilisez le menu BASSATINE.", "✅ Sync OK", 5);
}

function setupGeneratorSheet_(ss) {
  const SHEET_NAME = "⚡ Générateur";
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) sheet.clear();
  else sheet = ss.insertSheet(SHEET_NAME, 0);

  sheet.setTabColor("#f97316");

  sheet.getRange("A1:G1").merge()
    .setValue("BASSATINE SKOURA — Générateur de Facture / Proforma")
    .setFontSize(16).setFontWeight("bold").setFontColor("#ffffff")
    .setBackground("#1e293b").setHorizontalAlignment("center");
  sheet.setRowHeight(1, 40);

  sheet.getRange("A3").setValue("TYPE DE DOCUMENT :")
    .setFontWeight("bold").setFontColor("#64748b").setFontSize(10);
  const typeCell = sheet.getRange("B3");
  typeCell.setValue("FACTURE PROFORMA").setFontWeight("bold").setFontSize(12)
    .setBackground("#fff7ed").setFontColor("#f97316");
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["FACTURE PROFORMA", "FACTURE COMMERCIALE"], true).build();
  typeCell.setDataValidation(rule);

  sheet.getRange("A5:G5").merge().setValue("📋  INFORMATIONS CLIENT")
    .setFontWeight("bold").setFontColor("#ffffff").setBackground("#334155")
    .setFontSize(11).setHorizontalAlignment("left");
  sheet.setRowHeight(5, 30);

  const clientFields = [
    ["Nom / Raison Sociale :", "B6"],
    ["ICE :", "B7"],
    ["Adresse :", "B8"],
    ["Date du document :", "B9"],
  ];
  clientFields.forEach(function(field) {
    sheet.getRange("A" + field[1].charAt(1)).setValue(field[0])
      .setFontWeight("bold").setFontColor("#475569").setFontSize(10);
    sheet.getRange(field[1]).setBackground("#f8fafc")
      .setBorder(false, false, true, false, false, false, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  });
  sheet.getRange("B9").setValue(Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy"));

  sheet.getRange("A11:G11").merge().setValue("📦  LIGNES DE FACTURATION")
    .setFontWeight("bold").setFontColor("#ffffff").setBackground("#334155")
    .setFontSize(11).setHorizontalAlignment("left");
  sheet.setRowHeight(11, 30);

  const colHeaders = ["DÉSIGNATION", "NB CHAMBRES", "NB CLIENTS", "PRIX UNITAIRE (DH)", "TOTAL TTC"];
  const colCols    = [1, 2, 3, 4, 5];
  const colWidths  = [280, 120, 110, 160, 140];
  colHeaders.forEach(function(h, i) {
    const cell = sheet.getRange(12, colCols[i]);
    cell.setValue(h).setFontWeight("bold").setFontColor("#ffffff")
      .setBackground("#1e293b").setHorizontalAlignment("center")
      .setFontSize(9);
    sheet.setColumnWidth(colCols[i], colWidths[i]);
  });
  sheet.setRowHeight(12, 28);

  for (let r = 13; r <= 20; r++) {
    const bg = (r % 2 === 0) ? "#f8fafc" : "#ffffff";
    sheet.getRange(r, 1).setBackground(bg);
    sheet.getRange(r, 2).setBackground(bg).setHorizontalAlignment("center").setNumberFormat("0");
    sheet.getRange(r, 3).setBackground(bg).setHorizontalAlignment("center").setNumberFormat("0");
    sheet.getRange(r, 4).setBackground(bg).setHorizontalAlignment("right").setNumberFormat('#,##0.00 "DH"');
    sheet.getRange(r, 5).setFormula("=IF(B" + r + "*D" + r + "=0,\\"\\",B" + r + "*D" + r + ")")
      .setBackground(bg).setHorizontalAlignment("right")
      .setNumberFormat('#,##0.00 "DH"').setFontWeight("bold");
    sheet.setRowHeight(r, 26);
  }

  sheet.getRange("A22:G22").merge().setValue("").setBackground("#f1f5f9");

  const totalsData = [
    ["TOTAL HT :", "=SUMPRODUCT((B13:B20*D13:D20)/1.1)"],
    ["TVA 10% :", "=SUMPRODUCT((B13:B20*D13:D20)/1.1*0.1)"],
    ["TOTAL TTC :", "=SUMPRODUCT(B13:B20*D13:D20)"],
  ];
  totalsData.forEach(function(row, i) {
    const r = 23 + i;
    sheet.getRange(r, 4).setValue(row[0]).setFontWeight("bold")
      .setHorizontalAlignment("right").setFontColor("#475569").setFontSize(10);
    sheet.getRange(r, 5).setFormula(row[1]).setFontWeight("bold")
      .setNumberFormat('#,##0.00 "DH"').setHorizontalAlignment("right")
      .setBackground(i === 2 ? "#1e293b" : "#f8fafc")
      .setFontColor(i === 2 ? "#ffffff" : "#0f172a").setFontSize(i === 2 ? 13 : 10);
    if (i === 2) sheet.setRowHeight(r, 32);
  });

  sheet.getRange("A27").setValue("📝  NOTES / CONDITIONS")
    .setFontWeight("bold").setFontColor("#64748b").setFontSize(10);
  sheet.getRange("A28:G29").merge().setBackground("#f8fafc")
    .setBorder(true, true, true, true, false, false, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange("A31:G31").merge()
    .setValue("⬇  Utilisez le menu BASSATINE → Enregistrer dans Supabase pour sauvegarder.")
    .setFontStyle("italic").setFontColor("#94a3b8").setFontSize(9)
    .setHorizontalAlignment("center").setBackground("#f8fafc");

  sheet.setColumnWidth(6, 20);
  sheet.setColumnWidth(7, 20);
  sheet.hideColumns(6, 2);
}

function getNextDocNumber(ss, tableName, numField, currentYear) {
  let max = 0;
  const sheet = ss.getSheetByName(tableName);
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length > 0) {
      const colIdx = data[0].indexOf(numField);
      if (colIdx >= 0) {
        for (let i = 1; i < data.length; i++) {
          const val = data[i][colIdx];
          if (typeof val === 'string' && val.startsWith(currentYear + "/")) {
            const parts = val.split("/");
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num) && num > max) max = num;
            }
          }
        }
      }
    }
  }
  let generated = max + 1;
  return currentYear + "/" + (generated < 10 ? '0' + generated : generated);
}

function saveToSupabase() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const sh  = ss.getSheetByName("⚡ Générateur");
  if (!sh) { Browser.msgBox("Feuille Générateur introuvable."); return; }

  const docType   = sh.getRange("B3").getValue();
  const clientName= sh.getRange("B6").getValue();
  const ice       = sh.getRange("B7").getValue();
  const address   = sh.getRange("B8").getValue();
  const notes     = sh.getRange("A28").getValue();

  const items = [];
  let totalTtc = 0;
  for (let r = 13; r <= 20; r++) {
    const desc  = sh.getRange(r, 1).getValue();
    const qty   = Number(sh.getRange(r, 2).getValue()) || 0;
    const nbCl  = Number(sh.getRange(r, 3).getValue()) || 0;
    const price = Number(sh.getRange(r, 4).getValue()) || 0;
    if (!desc && qty === 0) continue;
    const subtotal = qty * price;
    totalTtc += subtotal;
    items.push({ description: String(desc), quantity: qty, nb_clients: nbCl, unit_price: price, subtotal: subtotal });
  }

  if (items.length === 0) { Browser.msgBox("Ajoutez au moins une ligne."); return; }

  const tvaAmount   = Math.round((totalTtc / 1.1 * 0.1) * 100) / 100;
  const subtotalHt  = Math.round((totalTtc / 1.1) * 100) / 100;
  const now         = new Date().toISOString();
  
  const currentYear = new Date().getFullYear().toString();
  const table       = docType === "FACTURE COMMERCIALE" ? "invoices" : "proformas";
  const numField    = docType === "FACTURE COMMERCIALE" ? "invoice_number" : "proforma_number";
  
  const docNumber   = getNextDocNumber(ss, table, numField, currentYear);

  const payload = {};
  payload[numField]            = docNumber;
  payload["recipient_name"]    = clientName;
  payload["recipient_ice"]     = ice;
  payload["recipient_address"] = address;
  payload["status"]            = "brouillon";
  payload["items_json"]        = items;
  payload["tva_mode"]          = "ttc";
  payload["subtotal_ht"]       = subtotalHt;
  payload["tva_amount"]        = tvaAmount;
  payload["total_ttc"]         = totalTtc;
  payload["notes"]             = notes;
  payload["created_at"]        = now;
  payload["updated_at"]        = now;

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": "return=representation"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/" + table, options);
  if (res.getResponseCode() === 201) {
    Browser.msgBox("✅ " + docType + " enregistrée avec succès !\\nNuméro : " + docNumber);
    syncFromSupabase();
  } else {
    Browser.msgBox("❌ Erreur : " + res.getContentText());
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚡ BASSATINE")
    .addItem("🔄 Synchroniser depuis Supabase", "syncFromSupabase")
    .addSeparator()
    .addItem("💾 Enregistrer dans Supabase", "saveToSupabase")
    .addToUi();
}
`;

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
