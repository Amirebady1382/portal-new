import { db } from "../db";

/**
 * Migration: Add Company Services Mapping
 * Purpose: ایجاد جدول اختصاص خدمات به شرکت‌ها
 * 
 * این migration جدول company_services را ایجاد می‌کند که:
 * - اختصاص خدمات به شرکت‌های خاص را مدیریت می‌کند
 * - شرکت‌ها فقط خدماتی را می‌بینند که کارمند به آنها اختصاص داده است
 * - تاریخچه فعال‌سازی خدمات را ذخیره می‌کند
 */
export async function addCompanyServicesMapping(): Promise<void> {
  console.log("🔧 Adding Company Services Mapping table...");
  
  try {
    // ایجاد جدول company_services
    await db.execute(`
      CREATE TABLE IF NOT EXISTS company_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        activated_by INTEGER NOT NULL REFERENCES users(id),
        activated_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_active INTEGER DEFAULT 1 NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(company_id, service_id)
      )
    `);

    console.log("✅ Company Services Mapping table created");

    // ایجاد index برای جستجوی سریع‌تر
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_company_services_company 
      ON company_services(company_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_company_services_service 
      ON company_services(service_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_company_services_active 
      ON company_services(is_active)
    `);

    console.log("✅ Company Services indexes created");
    console.log("✨ Company Services Mapping migration completed successfully!");

  } catch (error) {
    console.error("❌ Error in Company Services Mapping migration:", error);
    throw error;
  }
}

