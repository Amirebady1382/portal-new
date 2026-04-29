import { db } from "../db";

export async function addSystemSettings() {
  console.log("🔄 Adding System Settings table...");
  
  // Create system_settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_editable BOOLEAN NOT NULL DEFAULT true,
      data_type TEXT NOT NULL DEFAULT 'text',
      updated_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  console.log("✅ System Settings table created successfully");
  
  // Insert Gilan Fund information
  console.log("🔄 Inserting Gilan Fund settings...");
  
  const fundSettings = [
    // Fund Basic Info
    { key: 'fund_name', value: 'صندوق پژوهش و فناوری غیردولتی گیلان', category: 'fund_info', description: 'نام صندوق' },
    { key: 'fund_ceo_name', value: 'دانیال صابر سمیعی', category: 'fund_info', description: 'نام مدیرعامل صندوق' },
    { key: 'fund_chairman_name', value: 'حامد میرزائی فلاح‌آبادی', category: 'fund_info', description: 'نام رئیس هیئت مدیره' },
    { key: 'fund_vice_chairman_name', value: 'عنایت‌اله همائی‌راد', category: 'fund_info', description: 'نام نائب رئیس هیئت مدیره' },
    
    // Fund Registration Info
    { key: 'fund_registration_number', value: '21789', category: 'fund_info', description: 'شماره ثبت صندوق' },
    { key: 'fund_national_id', value: '14008402290', category: 'fund_info', description: 'شناسه ملی صندوق' },
    { key: 'fund_economic_code', value: '411653383379', category: 'fund_info', description: 'کد اقتصادی صندوق' },
    
    // Fund Contact Info
    { key: 'fund_address', value: 'استان گیلان، شهرستان رشت، بلوار معلم، ساختمان ۱۱۰، طبقه ۶، واحد ۱۸', category: 'fund_info', description: 'آدرس صندوق' },
    { key: 'fund_postal_code', value: '4153655314', category: 'fund_info', description: 'کد پستی صندوق' },
    { key: 'fund_phone', value: '01333232620', category: 'fund_info', description: 'تلفن صندوق' },
    { key: 'fund_email', value: 'info@gilanfund.ir', category: 'fund_info', description: 'ایمیل صندوق' },
    
    // Fund Management Info
    { key: 'manager_name', value: 'مدیر فند', category: 'fund_info', description: 'نام مدیر' },
    { key: 'manager_position', value: 'مدیر عامل', category: 'fund_info', description: 'سمت مدیر' },
    { key: 'fund_manager_signature', value: 'امضا مدیر فند', category: 'fund_info', description: 'امضا مدیر صندوق' },
    { key: 'company_manager_signature', value: 'امضا مدیر شرکت', category: 'fund_info', description: 'امضا مدیر شرکت' },
    
    // Contract Default Values
    { key: 'default_commission_rate', value: '2', category: 'contract_defaults', description: 'نرخ کمیسیون پیش‌فرض (درصد)', data_type: 'number' },
    { key: 'default_annual_fee_rate', value: '0.02', category: 'contract_defaults', description: 'نرخ کارمزد سالانه پیش‌فرض', data_type: 'number' },
    { key: 'default_company_postal_code', value: '4193619849', category: 'contract_defaults', description: 'کد پستی پیش‌فرض شرکت‌ها' },
    { key: 'default_company_email', value: 'info@company.com', category: 'contract_defaults', description: 'ایمیل پیش‌فرض شرکت‌ها' },
    { key: 'default_registration_number', value: '12345', category: 'contract_defaults', description: 'شماره ثبت پیش‌فرض شرکت‌ها' },
    
    // Default Representative Info (برای شرکت‌هایی که اطلاعات ندارند)
    { key: 'default_representative_name', value: 'علی احمدی', category: 'contract_defaults', description: 'نام نماینده پیش‌فرض شرکت' },
    { key: 'default_representative_father_name', value: 'محمد', category: 'contract_defaults', description: 'نام پدر نماینده پیش‌فرض' },
    { key: 'default_representative_birth_date', value: '1370/01/01', category: 'contract_defaults', description: 'تاریخ تولد نماینده پیش‌فرض' },
    { key: 'default_representative_birth_place', value: 'رشت', category: 'contract_defaults', description: 'محل تولد نماینده پیش‌فرض' },
    { key: 'default_representative_national_id', value: '1234567890', category: 'contract_defaults', description: 'کد ملی نماینده پیش‌فرض' },
    { key: 'default_representative_position', value: 'مدیرعامل', category: 'contract_defaults', description: 'سمت نماینده پیش‌فرض' },
    
    // Default Gazette Info
    { key: 'default_gazette_page', value: '12', category: 'contract_defaults', description: 'صفحه روزنامه رسمی پیش‌فرض' },
    { key: 'default_gazette_number', value: '25678', category: 'contract_defaults', description: 'شماره روزنامه رسمی پیش‌فرض' },
    { key: 'default_gazette_date', value: '1403/08/15', category: 'contract_defaults', description: 'تاریخ روزنامه رسمی پیش‌فرض' },
    
    // Default Guarantor Info (برای شرکت‌هایی که ضامن ندارند)
    { key: 'default_guarantor_name', value: 'احمد محمدی', category: 'contract_defaults', description: 'نام ضامن پیش‌فرض' },
    { key: 'default_guarantor_father_name', value: 'حسن', category: 'contract_defaults', description: 'نام پدر ضامن پیش‌فرض' },
    { key: 'default_guarantor_birth_date', value: '1350/05/15', category: 'contract_defaults', description: 'تاریخ تولد ضامن پیش‌فرض' },
    { key: 'default_guarantor_birth_place', value: 'رشت', category: 'contract_defaults', description: 'محل تولد ضامن پیش‌فرض' },
    { key: 'default_guarantor_certificate_number', value: '123456', category: 'contract_defaults', description: 'شماره شناسنامه ضامن پیش‌فرض' },
    { key: 'default_guarantor_national_id', value: '0987654321', category: 'contract_defaults', description: 'کد ملی ضامن پیش‌فرض' },
    { key: 'default_guarantor_address', value: 'استان گیلان، شهرستان رشت، خیابان شهدا، پلاک ۵', category: 'contract_defaults', description: 'آدرس ضامن پیش‌فرض' },
    { key: 'default_guarantor_postal_code', value: '4193619849', category: 'contract_defaults', description: 'کد پستی ضامن پیش‌فرض' },
    { key: 'default_guarantor_mobile', value: '09131234567', category: 'contract_defaults', description: 'موبایل ضامن پیش‌فرض' },
    
    // Default Financial Info
    { key: 'default_sepas_code', value: '67890', category: 'contract_defaults', description: 'کد سپاس پیش‌فرض' },
    { key: 'default_beneficiary_name', value: 'شرکت بهره‌بردار', category: 'contract_defaults', description: 'نام ذی‌نفع پیش‌فرض' },
    { key: 'default_fund_representative', value: 'نماینده فند', category: 'contract_defaults', description: 'نماینده صندوق پیش‌فرض' },
    { key: 'default_company_check_amount', value: '0', category: 'contract_defaults', description: 'مبلغ چک شرکت پیش‌فرض' },
    { key: 'default_company_check_amount_words', value: 'صفر ریال', category: 'contract_defaults', description: 'مبلغ چک شرکت پیش‌فرض به حروف' },
    { key: 'default_personal_check_amount', value: '0', category: 'contract_defaults', description: 'مبلغ چک شخصی پیش‌فرض' },
    { key: 'default_personal_check_amount_words', value: 'صفر ریال', category: 'contract_defaults', description: 'مبلغ چک شخصی پیش‌فرض به حروف' },
    { key: 'default_bill_amount', value: '0', category: 'contract_defaults', description: 'مبلغ قبض پیش‌فرض' },
    { key: 'default_bill_amount_words', value: 'صفر ریال', category: 'contract_defaults', description: 'مبلغ قبض پیش‌فرض به حروف' }
  ];
  
  for (const setting of fundSettings) {
    try {
      await db.execute(`
        INSERT OR IGNORE INTO system_settings (key, value, category, description, data_type)
        VALUES (?, ?, ?, ?, ?)
      `, [
        setting.key,
        setting.value,
        setting.category,
        setting.description,
        setting.data_type || 'text'
      ]);
      console.log(`📝 Added setting: ${setting.key} = ${setting.value}`);
    } catch (error) {
      console.error(`❌ Error adding setting ${setting.key}:`, error);
    }
  }
  
  console.log("✅ All system settings added successfully");
} 