import XLSX from 'xlsx';
import fs from 'fs';

try {
  const workbook = XLSX.readFile('gozarewsh.xlsx', { cellFormula: true });
  console.log('Sheet Names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- SHEET: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    
    data.slice(0, 100).forEach((row, rowIndex) => {
      if (row.length > 0) console.log(`Row ${rowIndex}:`, row);
    });

    Object.keys(worksheet).forEach(cell => {
      if (worksheet[cell] && worksheet[cell].f) {
        console.log(`${cell}: ${worksheet[cell].f} (Value: ${worksheet[cell].v})`);
      }
    });
  });
} catch (error) {
  console.error('Error reading excel:', error);
}
