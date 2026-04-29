import { db } from "../db";

export async function addFinancialSummary() {
  console.log("🔄 Adding financial summary fields to companies...");

  try {
    // Check if columns already exist
    const tableInfo = await db.execute(`PRAGMA table_info(companies)`);
    const columns = tableInfo.rows.map((row: any) => row.name);
    
    if (columns.includes('financial_summary_data')) {
      console.log("✅ Financial summary fields already exist");
      return;
    }

    // Add financial summary columns
    await db.execute(`
      ALTER TABLE companies ADD COLUMN financial_summary_data TEXT
    `);
    
    await db.execute(`
      ALTER TABLE companies ADD COLUMN tax_declaration_document_id INTEGER REFERENCES documents(id)
    `);
    
    await db.execute(`
      ALTER TABLE companies ADD COLUMN financial_summary_status TEXT DEFAULT 'pending'
    `);
    
    await db.execute(`
      ALTER TABLE companies ADD COLUMN financial_summary_last_updated TEXT
    `);
    
    await db.execute(`
      ALTER TABLE companies ADD COLUMN financial_summary_error TEXT
    `);

    // Create indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_companies_financial_status 
      ON companies(financial_summary_status)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_companies_tax_declaration 
      ON companies(tax_declaration_document_id)
    `);

    console.log("✅ Financial summary fields added successfully");
  } catch (error: any) {
    console.error("❌ Error adding financial summary fields:", error.message);
    throw error;
  }
}

