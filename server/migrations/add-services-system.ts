import { db } from "../db";

export async function addServicesSystem(): Promise<void> {
  console.log("🔧 Adding Services System tables...");
  
  try {
    // ایجاد جدول services
    await db.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        department TEXT NOT NULL,
        category TEXT,
        icon TEXT,
        estimated_days INTEGER,
        requirements TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // ایجاد جدول service_requests
    await db.execute(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER NOT NULL REFERENCES services(id),
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'normal',
        assigned_to INTEGER REFERENCES users(id),
        request_data TEXT,
        rejection_reason TEXT,
        completed_at TEXT,
        due_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // ایجاد جدول request_status_history
    await db.execute(`
      CREATE TABLE IF NOT EXISTS request_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER NOT NULL REFERENCES users(id),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // اضافه کردن فیلدهای جدید به document_requirements
    await db.execute(`
      ALTER TABLE document_requirements 
      ADD COLUMN service_id INTEGER REFERENCES services(id) ON DELETE CASCADE
    `);
    
    await db.execute(`
      ALTER TABLE document_requirements 
      ADD COLUMN created_by INTEGER REFERENCES users(id)
    `);

    // ایجاد indexes برای بهبود performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_services_department ON services(department)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_company ON service_requests(company_id)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_user ON service_requests(user_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_document_requirements_service ON document_requirements(service_id)
    `);

    // Insert default services برای شروع
    await db.execute(`
      INSERT OR IGNORE INTO services (id, title, description, department, category, icon, estimated_days, created_by)
      SELECT 1, 'بررسی طرح کسب و کار', 'بررسی و ارزیابی طرح کسب و کار شرکت', 'investment', 'evaluation', 'FileText', 7, 
             (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 1)
    `);

    await db.execute(`
      INSERT OR IGNORE INTO services (id, title, description, department, category, icon, estimated_days, created_by)
      SELECT 2, 'تایید اسناد اداری', 'بررسی و تایید مدارک و اسناد اداری شرکت', 'administrative', 'verification', 'Shield', 5,
             (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 2)
    `);

    await db.execute(`
      INSERT OR IGNORE INTO services (id, title, description, department, category, icon, estimated_days, created_by)
      SELECT 3, 'تحلیل مالی', 'تحلیل وضعیت مالی و سودآوری شرکت', 'investment', 'financial', 'TrendingUp', 10,
             (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 3)
    `);

    await db.execute(`
      INSERT OR IGNORE INTO services (id, title, description, department, category, icon, estimated_days, created_by)
      SELECT 4, 'ثبت تغییرات شرکت', 'ثبت تغییرات اساسنامه و اطلاعات شرکت', 'administrative', 'registration', 'Edit', 14,
             (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 4)
    `);

    console.log("✅ Services System tables created successfully");
  } catch (error) {
    console.error("❌ Error creating Services System tables:", error);
    throw error;
  }
}
