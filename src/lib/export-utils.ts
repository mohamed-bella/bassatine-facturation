/**
 * Utility to convert an array of objects to a CSV string.
 */
export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : row[header];
      
      // If it's an object or array (like items_json), stringify it
      if (typeof cell === 'object') {
        cell = JSON.stringify(cell);
      }
      
      // Escape double quotes and wrap in quotes if contains comma, newline or quotes
      const cellStr = String(cell);
      const escaped = cellStr.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger a browser download of a CSV file.
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to a styled Excel file.
 */
export async function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const ExcelJS = (await import('exceljs')).default;
  const saveAs = (await import('file-saver')).saveAs;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Format headers for display (Title Case, no underscores)
  const displayHeaders = headers.map(h => 
    h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, ' ')
  );

  // Set columns
  worksheet.columns = headers.map((h, i) => ({
    header: displayHeaders[i],
    key: h,
    width: Math.max(15, displayHeaders[i].length + 5)
  }));

  // Add rows
  data.forEach(item => {
    const rowData: any = {};
    headers.forEach(h => {
      let val = item[h];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      rowData[h] = val;
    });
    worksheet.addRow(rowData);
  });

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate-800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Style all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'middle' };
      
      // Auto-center numeric or specific column types
      if (typeof cell.value === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });

    if (rowNumber > 1) {
      // Alternate row backgrounds (Zebra)
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Slate-50
        };
      }
    }
  });

  // Specific Formatting for known columns
  headers.forEach((h, i) => {
    const col = worksheet.getColumn(i + 1);
    if (h.includes('total') || h.includes('amount') || h.includes('price') || h.includes('_ht') || h.includes('_ttc')) {
      col.numFmt = '#,##0.00 "DH"';
    }
    if (h.includes('date') || h.includes('_at')) {
      col.numFmt = 'dd/mm/yyyy hh:mm';
    }
  });

  // Filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
}

/**
 * Import data from an Excel file.
 * Returns an array of objects mapped by headers.
 */
export async function importFromExcel(file: File): Promise<any[]> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) return [];

  const data: any[] = [];
  const headers: string[] = [];

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    // Map display header back to original key (e.g., "Invoice Number" -> "invoice_number")
    const header = cell.text.toLowerCase().replace(/ /g, '_');
    headers[colNumber] = header;
  });

  // Get data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rowData: any = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        let val = cell.value;
        
        // Handle ExcelJS cell value objects
        if (val && typeof val === 'object' && 'result' in val) {
          val = val.result;
        }
        if (val && typeof val === 'object' && 'text' in val) {
           val = val.text;
        }

        // Try to parse JSON if it looks like one (for items_json etc)
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try {
            val = JSON.parse(val);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
        
        rowData[header] = val;
      }
    });
    data.push(rowData);
  });

  return data;
}


