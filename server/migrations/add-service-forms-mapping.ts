import { db } from "../db";

/**
 * Migration: Add Service Forms Mapping
 * Purpose: ایجاد جدول اتصال many-to-many فرم‌ها به خدمات
 * 
 * این migration:
 * - جدول service_document_requirements را ایجاد می‌کند (many-to-many mapping)
 * - فیلد service_id را از جدول document_requirements حذف می‌کند
 * - امکان اتصال یک فرم به چند خدمت مختلف را فراهم می‌کند
 * - تفکیک فرم‌ها بر اساس واحد (سرمایه‌گذاری/اداری) برای هر خدمت
 */
export async function addServiceFormsMapping(): Promise<void> {
  console.log("🔧 Adding Service Forms Mapping table...");
  
  try {
    // ایجاد جدول service_document_requirements
    await db.execute(`
      CREATE TABLE IF NOT EXISTS service_document_requirements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        document_requirement_id INTEGER NOT NULL REFERENCES document_requirements(id) ON DELETE CASCADE,
        department TEXT NOT NULL,
        is_required INTEGER DEFAULT 1 NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(service_id, document_requirement_id, department)
      )
    `);

    console.log("✅ Service Document Requirements mapping table created");

    // ایجاد index برای جستجوی سریع‌تر
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_doc_req_service 
      ON service_document_requirements(service_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_doc_req_document 
      ON service_document_requirements(document_requirement_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_doc_req_department 
      ON service_document_requirements(department)
    `);

    console.log("✅ Service Document Requirements indexes created");

    // مهاجرت داده‌های موجود (اگر فیلد service_id در document_requirements وجود داشته باشد)
    // بررسی وجود فیلد service_id
    const checkColumn = await db.execute(`
      PRAGMA table_info(document_requirements)
    `);
    
    const hasServiceIdColumn = checkColumn.rows.some((row: any) => row.name === 'service_id');
    
    if (hasServiceIdColumn) {
      console.log("📦 Migrating existing service_id relationships...");
      
      // کپی کردن رابطه‌های موجود به جدول جدید
      await db.execute(`
        INSERT INTO service_document_requirements (
          service_id, 
          document_requirement_id, 
          department, 
          is_required, 
          sort_order, 
          created_by,
          created_at
        )
        SELECT 
          dr.service_id,
          dr.id,
          dr.department,
          dr.is_required,
          dr.order,
          COALESCE(dr.created_by, 1),
          dr.created_at
        FROM document_requirements dr
        WHERE dr.service_id IS NOT NULL
      `);

      console.log("✅ Existing relationships migrated");

      // ایجاد جدول جدید document_requirements بدون فیلد service_id
      await db.execute(`
        CREATE TABLE document_requirements_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          department TEXT NOT NULL,
          category TEXT,
          description TEXT NOT NULL,
          fields TEXT NOT NULL DEFAULT '[]',
          is_required INTEGER DEFAULT 1 NOT NULL,
          "order" INTEGER DEFAULT 0 NOT NULL,
          is_active INTEGER DEFAULT 1 NOT NULL,
          access_type TEXT NOT NULL DEFAULT 'all',
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      // کپی کردن داده‌ها به جدول جدید
      await db.execute(`
        INSERT INTO document_requirements_new (
          id, title, department, category, description, fields, 
          is_required, "order", is_active, access_type, created_by, created_at, updated_at
        )
        SELECT 
          id, title, department, category, description, fields,
          is_required, "order", is_active, access_type, created_by, created_at, updated_at
        FROM document_requirements
      `);

      // حذف جدول قدیمی و تغییر نام جدول جدید
      await db.execute(`DROP TABLE document_requirements`);
      await db.execute(`ALTER TABLE document_requirements_new RENAME TO document_requirements`);

      console.log("✅ document_requirements table restructured (service_id removed)");
    } else {
      console.log("ℹ️ service_id column doesn't exist, skipping migration");
    }

    console.log("✨ Service Forms Mapping migration completed successfully!");

  } catch (error) {
    console.error("❌ Error in Service Forms Mapping migration:", error);
    throw error;
  }
}

