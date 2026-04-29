import { Database } from "sqlite3";
import { open } from "sqlite";

/**
 * Migration: Add Contract Management Tables
 * - contract_variables: مدیریت متغیرهای قرارداد
 * - contract_variable_mappings: mapping متغیرها به قالب‌های قرارداد  
 * - bale_employee_mappings: mapping chat ID های بله به کارمندان
 */

const up = async () => {
  const db = await open({
    filename: process.env.DATABASE_PATH || "./database.sqlite",
    driver: Database,
  });

  console.log("🔧 Creating contract management tables...");

  try {
    // Contract Variables table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS contract_variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        data_type TEXT NOT NULL DEFAULT 'text',
        source TEXT NOT NULL DEFAULT 'form',
        default_value TEXT,
        is_required INTEGER NOT NULL DEFAULT 0,
        validation_rules TEXT,
        placeholder TEXT,
        category TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Contract Variable Mappings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS contract_variable_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
        variable_id INTEGER NOT NULL REFERENCES contract_variables(id) ON DELETE CASCADE,
        is_required INTEGER NOT NULL DEFAULT 0,
        default_value TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(template_id, variable_id)
      );
    `);

    // Bale Employee Mappings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bale_employee_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bale_chat_id TEXT NOT NULL UNIQUE,
        bale_user_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_contract_variables_name ON contract_variables(name);
      CREATE INDEX IF NOT EXISTS idx_contract_variables_category ON contract_variables(category);
      CREATE INDEX IF NOT EXISTS idx_contract_variables_source ON contract_variables(source);
      CREATE INDEX IF NOT EXISTS idx_contract_variable_mappings_template_id ON contract_variable_mappings(template_id);
      CREATE INDEX IF NOT EXISTS idx_contract_variable_mappings_variable_id ON contract_variable_mappings(variable_id);
      CREATE INDEX IF NOT EXISTS idx_bale_employee_mappings_employee_id ON bale_employee_mappings(employee_id);
      CREATE INDEX IF NOT EXISTS idx_bale_employee_mappings_chat_id ON bale_employee_mappings(bale_chat_id);
    `);

    // Insert some default contract variables
    console.log("📝 Inserting default contract variables...");
    
    // Get admin user ID (first admin user)
    const adminUser = await db.get(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminUser?.id || 1;

    const defaultVariables = [
      // Company Info Variables (Rasmio source)
      {
        name: 'company_name',
        label: 'نام شرکت',
        description: 'نام کامل شرکت از سامانه رسمیو',
        source: 'rasmio',
        category: 'company_info',
        isRequired: 1
      },
      {
        name: 'company_national_id',
        label: 'شناسه ملی شرکت',
        description: 'شناسه ملی 11 رقمی شرکت',
        source: 'rasmio',
        category: 'company_info',
        isRequired: 1
      },
      {
        name: 'company_registration_number',
        label: 'شماره ثبت شرکت',
        description: 'شماره ثبت شرکت در اداره ثبت شرکت‌ها',
        source: 'rasmio',
        category: 'company_info'
      },
      {
        name: 'company_address',
        label: 'آدرس شرکت',
        description: 'آدرس کامل شرکت',
        source: 'rasmio',
        category: 'company_info'
      },
      {
        name: 'company_phone',
        label: 'تلفن شرکت',
        description: 'شماره تلفن ثابت شرکت',
        source: 'rasmio',
        category: 'company_info'
      },
      
      // Form Variables (User input)
      {
        name: 'contract_type',
        label: 'نوع قرارداد',
        description: 'نوع قرارداد (ضمانت‌نامه، سرمایه‌گذاری، ...)',
        source: 'form',
        category: 'contract_info',
        isRequired: 1,
        placeholder: 'نوع قرارداد را انتخاب کنید'
      },
      {
        name: 'contract_subject',
        label: 'موضوع قرارداد',
        description: 'توضیح کامل موضوع قرارداد',
        source: 'form',
        category: 'contract_info',
        isRequired: 1,
        placeholder: 'موضوع قرارداد را وارد کنید'
      },
      {
        name: 'total_amount',
        label: 'مبلغ کل',
        description: 'مبلغ کل قرارداد به ریال',
        dataType: 'number',
        source: 'form',
        category: 'financial',
        isRequired: 1,
        placeholder: '0'
      },
      {
        name: 'start_date',
        label: 'تاریخ شروع',
        description: 'تاریخ شروع قرارداد',
        dataType: 'date',
        source: 'form',
        category: 'dates',
        isRequired: 1
      },
      {
        name: 'end_date',
        label: 'تاریخ پایان',
        description: 'تاریخ پایان قرارداد',
        dataType: 'date',
        source: 'form',
        category: 'dates',
        isRequired: 1
      },
      
      // Calculated Variables
      {
        name: 'total_amount_words',
        label: 'مبلغ به حروف',
        description: 'مبلغ کل قرارداد به حروف (محاسبه خودکار)',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'duration_days',
        label: 'مدت قرارداد (روز)',
        description: 'مدت قرارداد برحسب روز (محاسبه خودکار)',
        dataType: 'number',
        source: 'calculated',
        category: 'dates'
      },
      {
        name: 'contract_number',
        label: 'شماره قرارداد',
        description: 'شماره یکتای قرارداد (تولید خودکار)',
        source: 'system',
        category: 'contract_info'
      }
    ];

    for (let i = 0; i < defaultVariables.length; i++) {
      const variable = defaultVariables[i];
      await db.run(`
        INSERT OR REPLACE INTO contract_variables (
          name, label, description, data_type, source, category, 
          is_required, placeholder, sort_order, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        variable.name,
        variable.label,
        variable.description,
        variable.dataType || 'text',
        variable.source,
        variable.category,
        variable.isRequired || 0,
        variable.placeholder || null,
        i + 1,
        adminId
      ]);
    }

    console.log("✅ Contract management tables created successfully!");
    console.log(`📊 Inserted ${defaultVariables.length} default contract variables`);

  } catch (error) {
    console.error("❌ Error creating contract management tables:", error);
    throw error;
  } finally {
    await db.close();
  }
};

const down = async () => {
  const db = await open({
    filename: process.env.DATABASE_PATH || "./database.sqlite",
    driver: Database,
  });

  console.log("🔧 Dropping contract management tables...");

  try {
    await db.exec(`DROP INDEX IF EXISTS idx_contract_variables_name;`);
    await db.exec(`DROP INDEX IF EXISTS idx_contract_variables_category;`);
    await db.exec(`DROP INDEX IF EXISTS idx_contract_variables_source;`);
    await db.exec(`DROP INDEX IF EXISTS idx_contract_variable_mappings_template_id;`);
    await db.exec(`DROP INDEX IF EXISTS idx_contract_variable_mappings_variable_id;`);
    await db.exec(`DROP INDEX IF EXISTS idx_bale_employee_mappings_employee_id;`);
    await db.exec(`DROP INDEX IF EXISTS idx_bale_employee_mappings_chat_id;`);
    
    await db.exec(`DROP TABLE IF EXISTS bale_employee_mappings;`);
    await db.exec(`DROP TABLE IF EXISTS contract_variable_mappings;`);
    await db.exec(`DROP TABLE IF EXISTS contract_variables;`);

    console.log("✅ Contract management tables dropped successfully!");
  } catch (error) {
    console.error("❌ Error dropping contract management tables:", error);
    throw error;
  } finally {
    await db.close();
  }
};

export { up, down };
