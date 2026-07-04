import { db } from '../db';

/**
 * Migration: Add admin management tables
 * - contract_variables: Global contract variables management
 * - employee_bale_settings: Map employees to Bale chat IDs
 */

export async function addAdminManagementTables() {
      console.log('🔄 Adding admin management tables...');

  try {
    // First ensure we have an admin user (required for foreign keys)
    try {
      const adminExists = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminExists.rows.length === 0) {
        console.log('📝 Creating default admin user...');
        await db.execute(`
          INSERT INTO users (username, password, role, full_name, is_active)
          VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'مدیر سیستم', 1)
        `);
        console.log('✅ Default admin user created');
      }
    } catch (userError) {
      console.log('⚠️ Could not create admin user:', userError);
    }
    // Create contract_variables table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "contract_variables" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "label" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL DEFAULT 'text',
        "default_value" TEXT,
        "is_required" INTEGER NOT NULL DEFAULT 0,
        "source" TEXT NOT NULL DEFAULT 'form',
        "placeholder" TEXT,
        "validation" TEXT,
        "category" TEXT DEFAULT 'general',
        "is_active" INTEGER NOT NULL DEFAULT 1,
        "created_by" INTEGER NOT NULL,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("created_by") REFERENCES "users" ("id")
      )
    `);

    // Create employee_bale_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "employee_bale_settings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "employee_id" INTEGER NOT NULL,
        "bale_chat_id" TEXT UNIQUE,
        "bale_user_id" TEXT,
        "is_active" INTEGER NOT NULL DEFAULT 1,
        "notifications_enabled" INTEGER NOT NULL DEFAULT 1,
        "department_filter" TEXT,
        "last_activity" TEXT,
        "created_by" INTEGER NOT NULL,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("employee_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("created_by") REFERENCES "users" ("id")
      )
    `);

    // Insert default contract variables
    await db.execute(`
      INSERT OR IGNORE INTO "contract_variables" 
      ("name", "label", "description", "type", "is_required", "source", "category", "created_by") 
      VALUES 
      ('company_name', 'نام شرکت', 'نام رسمی شرکت', 'text', 1, 'rasmio', 'company', 1),
      ('company_national_id', 'شناسه ملی شرکت', 'شناسه ملی 11 رقمی شرکت', 'text', 1, 'rasmio', 'company', 1),
      ('company_registration_number', 'شماره ثبت', 'شماره ثبت در اداره ثبت شرکت‌ها', 'text', 1, 'rasmio', 'company', 1),
      ('company_address', 'آدرس شرکت', 'آدرس کامل محل فعالیت شرکت', 'text', 1, 'rasmio', 'company', 1),
      ('company_phone', 'تلفن شرکت', 'شماره تلفن ثابت شرکت', 'text', 0, 'rasmio', 'company', 1),
      ('company_email', 'ایمیل شرکت', 'آدرس ایمیل رسمی شرکت', 'text', 0, 'rasmio', 'company', 1),
      
      ('contract_type', 'نوع قرارداد', 'نوع قرارداد (ضمانت‌نامه، سرمایه‌گذاری، ...)', 'text', 1, 'form', 'general', 1),
      ('contract_subject', 'موضوع قرارداد', 'شرح موضوع و هدف قرارداد', 'text', 1, 'form', 'general', 1),
      ('contract_number', 'شماره قرارداد', 'شماره یکتا قرارداد', 'text', 1, 'calculated', 'general', 1),
      ('total_amount', 'مبلغ کل', 'مبلغ کل قرارداد به ریال', 'currency', 1, 'form', 'financial', 1),
      ('total_amount_words', 'مبلغ به حروف', 'مبلغ کل به حروف فارسی', 'text', 0, 'calculated', 'financial', 1),
      
      ('start_date', 'تاریخ شروع', 'تاریخ آغاز قرارداد', 'date', 1, 'form', 'dates', 1),
      ('end_date', 'تاریخ پایان', 'تاریخ خاتمه قرارداد', 'date', 1, 'form', 'dates', 1),
      ('duration_days', 'مدت قرارداد (روز)', 'مدت قرارداد بر حسب روز', 'number', 0, 'calculated', 'dates', 1),
      
      ('special_conditions', 'شرایط خاص', 'شرایط و توافقات خاص', 'text', 0, 'form', 'general', 1),
      ('guarantor_name', 'نام ضامن', 'نام کامل ضامن', 'text', 0, 'form', 'company', 1),
      ('guarantor_national_id', 'شناسه ملی ضامن', 'کد ملی ضامن', 'text', 0, 'form', 'company', 1)
    `);

    console.log('✅ Admin management tables created successfully');
  } catch (error) {
    console.error('❌ Failed to create admin management tables:', error);
    throw error;
  }
}

// Run migration if called directly
addAdminManagementTables().catch(console.error);
