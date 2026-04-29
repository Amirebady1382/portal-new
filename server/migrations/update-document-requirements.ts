import { db } from "../db";

export async function updateDocumentRequirements() {
  try {
    console.log("🔄 بروزرسانی document_requirements...");
    
    // Add access_type column if it doesn't exist
    try {
      await db.execute(`ALTER TABLE document_requirements ADD COLUMN access_type TEXT NOT NULL DEFAULT 'all'`);
      console.log("✅ access_type column اضافه شد");
    } catch (error) {
      // Column might already exist
      console.log("🔍 access_type column احتمالاً از قبل وجود دارد");
    }

    // Add national_id column to users if it doesn't exist
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN national_id TEXT`);
      console.log("✅ national_id column اضافه شد");
    } catch (error) {
      console.log("🔍 national_id column احتمالاً از قبل وجود دارد");
    }

    // Add profile_image column to users if it doesn't exist
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN profile_image TEXT`);
      console.log("✅ profile_image column اضافه شد");
    } catch (error) {
      console.log("🔍 profile_image column احتمالاً از قبل وجود دارد");
    }

    // Create document_requirement_access table if it doesn't exist
    await db.execute(`CREATE TABLE IF NOT EXISTS document_requirement_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (requirement_id) REFERENCES document_requirements(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )`);
    console.log("✅ document_requirement_access table آماده شد");

    // Create contract_form_data table if it doesn't exist
    await db.execute(`CREATE TABLE IF NOT EXISTS contract_form_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      form_type TEXT NOT NULL,
      form_data TEXT NOT NULL,
      is_complete INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      created_by INTEGER NOT NULL,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES contract_templates(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )`);
    console.log("✅ contract_form_data table آماده شد");

    // Create system_settings table if it doesn't exist
    await db.execute(`CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_editable INTEGER NOT NULL DEFAULT 1,
      data_type TEXT NOT NULL DEFAULT 'text',
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )`);
    console.log("✅ system_settings table آماده شد");

    console.log("✅ بروزرسانی جداول مدیریت مدارک کامل شد");
  } catch (error) {
    console.error("❌ خطا در بروزرسانی document_requirements:", error);
    throw error;
  }
} 