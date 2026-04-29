import { db } from '../db';

export async function addContractVariablesTables() {
  try {
    console.log("🔧 Creating contract variables tables...");

    // Contract Variables table
    await db.execute(`
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
        created_by INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Contract Variable Mappings table
    await db.execute(`
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
    await db.execute(`
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
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_contract_variables_name ON contract_variables(name);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_contract_variables_category ON contract_variables(category);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_contract_variables_source ON contract_variables(source);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_contract_variable_mappings_template_id ON contract_variable_mappings(template_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_contract_variable_mappings_variable_id ON contract_variable_mappings(variable_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_bale_employee_mappings_employee_id ON bale_employee_mappings(employee_id);
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_bale_employee_mappings_chat_id ON bale_employee_mappings(bale_chat_id);
    `);

    console.log("✅ Contract variables tables created successfully!");

    // Insert default contract variables
    console.log("📝 Inserting default contract variables...");

    // Get first admin user ID - با بررسی وجود جدول users
    let adminId = 1; // پیش‌فرض
    try {
      const adminUser = await db.execute(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
      if (adminUser.rows[0]) {
        adminId = (adminUser.rows[0] as any).id;
      }
    } catch (error) {
      console.log('⚠️ Users table not ready yet, using default ID');
    }

    const defaultVariables = [
      // ===========================================
      // متغیرهای رسمیو (Rasmio) - خودکار از API
      // ===========================================
      {
        name: 'company_name',
        label: 'نام شرکت',
        description: 'نام کامل شرکت از سامانه رسمیو',
        source: 'rasmio',
        category: 'company',
        isRequired: 1
      },
      {
        name: 'company_national_id',
        label: 'شناسه ملی شرکت',
        description: 'شناسه ملی 11 رقمی شرکت',
        source: 'rasmio',
        category: 'company',
        isRequired: 1
      },
      {
        name: 'national_id',
        label: 'شناسه ملی',
        description: 'شناسه ملی شرکت (alias)',
        source: 'rasmio',
        category: 'company',
        isRequired: 1
      },
      {
        name: 'company_registration_number',
        label: 'شماره ثبت شرکت',
        description: 'شماره ثبت شرکت در اداره ثبت شرکت‌ها',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'registration_number',
        label: 'شماره ثبت',
        description: 'شماره ثبت (alias)',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'company_address',
        label: 'آدرس شرکت',
        description: 'آدرس کامل شرکت',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'address',
        label: 'آدرس',
        description: 'آدرس (alias)',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'company_phone',
        label: 'تلفن شرکت',
        description: 'شماره تلفن ثابت شرکت',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'phone',
        label: 'تلفن',
        description: 'تلفن (alias)',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'company_email',
        label: 'ایمیل شرکت',
        description: 'آدرس ایمیل شرکت',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'capital',
        label: 'سرمایه شرکت',
        description: 'میزان سرمایه ثبت شده شرکت',
        dataType: 'currency',
        source: 'rasmio',
        category: 'financial'
      },
      
      // ===========================================
      // متغیرهای فرم (Form) - از فرم‌های موجود سامانه
      // ===========================================
      {
        name: 'company_representative_name',
        label: 'نام نماینده شرکت',
        description: 'نام نماینده قانونی - از فرم‌های موجود',
        source: 'form',
        category: 'personal',
        placeholder: 'نام نماینده'
      },
      {
        name: 'company_representative_national_id',
        label: 'کد ملی نماینده',
        description: 'کد ملی نماینده - از فرم‌های موجود',
        source: 'form',
        category: 'personal',
        placeholder: '1234567890'
      },
      {
        name: 'company_representative_father_name',
        label: 'نام پدر نماینده',
        description: 'نام پدر نماینده - از فرم‌های موجود',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'company_representative_birth_date',
        label: 'تاریخ تولد نماینده',
        description: 'تاریخ تولد نماینده - از فرم‌های موجود',
        dataType: 'date',
        source: 'form',
        category: 'personal'
      },
      
      // ===========================================
      // متغیرهای فرم (Form) - کارمند هنگام تولید قرارداد وارد می‌کند
      // ===========================================
      {
        name: 'contract_type',
        label: 'نوع قرارداد',
        description: 'نوع قرارداد - کارمند تعیین می‌کند',
        source: 'form',
        category: 'legal',
        isRequired: 1,
        placeholder: 'ضمانت‌نامه / سرمایه‌گذاری'
      },
      {
        name: 'contract_subject',
        label: 'موضوع قرارداد',
        description: 'موضوع قرارداد - کارمند وارد می‌کند',
        dataType: 'textarea',
        source: 'form',
        category: 'legal',
        isRequired: 1,
        placeholder: 'موضوع قرارداد'
      },
      {
        name: 'total_amount',
        label: 'مبلغ کل قرارداد',
        description: 'مبلغ کل - کارمند وارد می‌کند',
        dataType: 'currency',
        source: 'form',
        category: 'financial',
        isRequired: 1,
        placeholder: '0'
      },
      {
        name: 'guarantee_amount',
        label: 'مبلغ ضمانت‌نامه',
        description: 'مبلغ ضمانت - کارمند وارد می‌کند',
        dataType: 'currency',
        source: 'form',
        category: 'financial',
        placeholder: '0'
      },
      {
        name: 'start_date',
        label: 'تاریخ شروع قرارداد',
        description: 'تاریخ شروع - کارمند تعیین می‌کند',
        dataType: 'date',
        source: 'form',
        category: 'dates',
        isRequired: 1
      },
      {
        name: 'end_date',
        label: 'تاریخ پایان قرارداد',
        description: 'تاریخ پایان - کارمند تعیین می‌کند',
        dataType: 'date',
        source: 'form',
        category: 'dates',
        isRequired: 1
      },
      {
        name: 'duration_days',
        label: 'مدت قرارداد (روز)',
        description: 'مدت قرارداد - محاسبه خودکار یا ورود کارمند',
        dataType: 'number',
        source: 'calculated',
        category: 'dates',
        placeholder: '365'
      },
      {
        name: 'commission_rate',
        label: 'نرخ کمیسیون / سود',
        description: 'نرخ کمیسیون یا سود - کارمند تعیین می‌کند',
        dataType: 'percentage',
        source: 'form',
        category: 'financial',
        placeholder: '2',
        isRequired: 1
      },
      {
        name: 'profit_percentage',
        label: 'درصد سود',
        description: 'درصد سود قرارداد - کارمند تعیین می‌کند',
        dataType: 'percentage',
        source: 'form',
        category: 'financial',
        placeholder: '15'
      },
      {
        name: 'cash_deposit_amount',
        label: 'مبلغ سپرده نقدی',
        description: 'سپرده نقدی - کارمند وارد می‌کند',
        dataType: 'currency',
        source: 'form',
        category: 'financial',
        placeholder: '0'
      },
      
      // ===========================================
      // متغیرهای فرم کارمند (Form) - اطلاعات تکمیلی
      // ===========================================
      {
        name: 'employee_notes',
        label: 'یادداشت کارشناس',
        description: 'یادداشت‌های کارشناس',
        dataType: 'textarea',
        source: 'form',
        category: 'other',
        placeholder: 'یادداشت‌های خود را وارد کنید'
      },
      {
        name: 'internal_reference_number',
        label: 'شماره مرجع داخلی',
        description: 'شماره مرجع داخلی صندوق',
        source: 'form',
        category: 'technical',
        placeholder: 'REF-...'
      },
      {
        name: 'risk_assessment',
        label: 'ارزیابی ریسک',
        description: 'ارزیابی ریسک توسط کارشناس',
        dataType: 'textarea',
        source: 'form',
        category: 'other',
        placeholder: 'ارزیابی ریسک...'
      },
      {
        name: 'expert_recommendation',
        label: 'توصیه کارشناس',
        description: 'توصیه کارشناس',
        dataType: 'textarea',
        source: 'form',
        category: 'other',
        placeholder: 'توصیه می‌شود...'
      },
      {
        name: 'approval_status',
        label: 'وضعیت تأیید',
        description: 'وضعیت تأیید توسط کارشناس',
        source: 'form',
        category: 'technical',
        placeholder: 'تأیید / رد / نیاز به بررسی'
      },
      
      // ===========================================
      // متغیرهای محاسباتی (Calculated) - خودکار
      // ===========================================
      {
        name: 'total_amount_words',
        label: 'مبلغ به حروف',
        description: 'مبلغ کل به حروف (محاسبه خودکار)',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'guarantee_amount_words',
        label: 'مبلغ ضمانت به حروف',
        description: 'مبلغ ضمانت‌نامه به حروف (محاسبه خودکار)',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'annual_fee_numbers',
        label: 'هزینه سالانه (عدد)',
        description: 'هزینه سالانه به عدد (محاسبه خودکار)',
        dataType: 'currency',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'annual_fee_words',
        label: 'هزینه سالانه (حروف)',
        description: 'هزینه سالانه به حروف (محاسبه خودکار)',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'commission_amount',
        label: 'مبلغ کمیسیون (عدد)',
        description: 'مبلغ کمیسیون به عدد (محاسبه خودکار)',
        dataType: 'currency',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'commission_amount_words',
        label: 'مبلغ کمیسیون (حروف)',
        description: 'مبلغ کمیسیون به حروف (محاسبه خودکار)',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'cash_deposit_amount_words',
        label: 'سپرده نقدی (حروف)',
        description: 'مبلغ سپرده نقدی به حروف (محاسبه خودکار)',
        source: 'calculated',
        category: 'financial'
      },
      {
        name: 'cash_deposit_percentage',
        label: 'درصد سپرده نقدی',
        description: 'درصد سپرده نقدی از مبلغ کل (محاسبه خودکار)',
        dataType: 'percentage',
        source: 'calculated',
        category: 'financial'
      },
      
      // ===========================================
      // متغیرهای سیستمی (System) - خودکار
      // ===========================================
      {
        name: 'contract_number',
        label: 'شماره قرارداد',
        description: 'شماره یکتای قرارداد (تولید خودکار)',
        source: 'system',
        category: 'legal'
      },
      {
        name: 'contract_date',
        label: 'تاریخ قرارداد',
        description: 'تاریخ تنظیم قرارداد (تولید خودکار)',
        dataType: 'date',
        source: 'system',
        category: 'dates'
      },
      {
        name: 'current_date',
        label: 'تاریخ جاری',
        description: 'تاریخ جاری سیستم',
        dataType: 'date',
        source: 'system',
        category: 'dates'
      },
      
      // ===========================================
      // متغیرهای صندوق (Fund) - از تنظیمات سیستم
      // ===========================================
      {
        name: 'fund_name',
        label: 'نام صندوق',
        description: 'نام کامل صندوق (از تنظیمات سیستم)',
        source: 'system',
        category: 'company'
      },
      {
        name: 'fund_address',
        label: 'آدرس صندوق',
        description: 'آدرس کامل صندوق (از تنظیمات)',
        source: 'system',
        category: 'company'
      },
      {
        name: 'fund_phone',
        label: 'تلفن صندوق',
        description: 'شماره تلفن صندوق (از تنظیمات)',
        source: 'system',
        category: 'company'
      },
      {
        name: 'fund_email',
        label: 'ایمیل صندوق',
        description: 'آدرس ایمیل صندوق (از تنظیمات)',
        source: 'system',
        category: 'company'
      },
      {
        name: 'fund_registration_number',
        label: 'شماره ثبت صندوق',
        description: 'شماره ثبت رسمی صندوق (از تنظیمات)',
        source: 'system',
        category: 'company'
      },
      {
        name: 'fund_national_id',
        label: 'شناسه ملی صندوق',
        description: 'شناسه ملی صندوق (از تنظیمات)',
        source: 'system',
        category: 'company'
      },
      {
        name: 'fund_representative_name',
        label: 'نام نماینده صندوق',
        description: 'نام نماینده یا مدیر صندوق (از تنظیمات)',
        source: 'system',
        category: 'personal'
      },
      {
        name: 'fund_representative_position',
        label: 'سمت نماینده صندوق',
        description: 'سمت نماینده صندوق (از تنظیمات)',
        source: 'system',
        category: 'personal'
      },

      // ===========================================
      // متغیرهای حق امضاداران (Signatories) - فرم شرکت
      // ===========================================
      {
        name: 'signatory_1_name',
        label: 'نام حق امضای اول',
        description: 'نام کامل حق امضای اول شرکت',
        source: 'form',
        category: 'personal',
        placeholder: 'نام حق امضا'
      },
      {
        name: 'signatory_1_national_id',
        label: 'کد ملی حق امضای اول',
        description: 'کد ملی حق امضای اول',
        source: 'form',
        category: 'personal',
        placeholder: '1234567890'
      },
      {
        name: 'signatory_1_position',
        label: 'سمت حق امضای اول',
        description: 'سمت یا نقش حق امضای اول',
        source: 'form',
        category: 'personal',
        placeholder: 'مدیرعامل'
      },
      {
        name: 'signatory_2_name',
        label: 'نام حق امضای دوم',
        description: 'نام کامل حق امضای دوم شرکت (اختیاری)',
        source: 'form',
        category: 'personal',
        placeholder: 'نام حق امضا'
      },
      {
        name: 'signatory_2_national_id',
        label: 'کد ملی حق امضای دوم',
        description: 'کد ملی حق امضای دوم (اختیاری)',
        source: 'form',
        category: 'personal',
        placeholder: '1234567890'
      },
      {
        name: 'signatory_2_position',
        label: 'سمت حق امضای دوم',
        description: 'سمت یا نقش حق امضای دوم (اختیاری)',
        source: 'form',
        category: 'personal',
        placeholder: 'عضو هیئت مدیره'
      },

      // ===========================================
      // متغیرهای خروجی روزنامه رسمی (Rasmio)
      // ===========================================
      {
        name: 'last_gazette_number',
        label: 'شماره آخرین آگهی روزنامه رسمی',
        description: 'شماره آخرین آگهی ثبت شده در روزنامه رسمی',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'last_gazette_date',
        label: 'تاریخ آخرین آگهی روزنامه رسمی',
        description: 'تاریخ ثبت آخرین آگهی در روزنامه رسمی',
        dataType: 'date',
        source: 'rasmio',
        category: 'dates'
      },

      // ===========================================
      // متغیرهای اعضای تیم (Team Members) - فرم شرکت
      // ===========================================
      {
        name: 'team_member_1_name',
        label: 'نام عضو اول تیم',
        description: 'نام عضو اول تیم شرکت',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_1_position',
        label: 'نقش عضو اول تیم',
        description: 'نقش یا سمت عضو اول تیم',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_2_name',
        label: 'نام عضو دوم تیم',
        description: 'نام عضو دوم تیم شرکت',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_2_position',
        label: 'نقش عضو دوم تیم',
        description: 'نقش یا سمت عضو دوم تیم',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_3_name',
        label: 'نام عضو سوم تیم',
        description: 'نام عضو سوم تیم شرکت',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_3_position',
        label: 'نقش عضو سوم تیم',
        description: 'نقش یا سمت عضو سوم تیم',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_4_name',
        label: 'نام عضو چهارم تیم',
        description: 'نام عضو چهارم تیم شرکت',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_4_position',
        label: 'نقش عضو چهارم تیم',
        description: 'نقش یا سمت عضو چهارم تیم',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_5_name',
        label: 'نام عضو پنجم تیم',
        description: 'نام عضو پنجم تیم شرکت',
        source: 'form',
        category: 'personal'
      },
      {
        name: 'team_member_5_position',
        label: 'نقش عضو پنجم تیم',
        description: 'نقش یا سمت عضو پنجم تیم',
        source: 'form',
        category: 'personal'
      },

      // ===========================================
      // متغیرهای اعضای هیئت مدیره (Board Members) - Rasmio
      // ===========================================
      {
        name: 'board_member_1_name',
        label: 'نام عضو اول هیئت مدیره',
        description: 'نام عضو اول هیئت مدیره (از رسمیو)',
        source: 'rasmio',
        category: 'personal'
      },
      {
        name: 'board_member_2_name',
        label: 'نام عضو دوم هیئت مدیره',
        description: 'نام عضو دوم هیئت مدیره (از رسمیو)',
        source: 'rasmio',
        category: 'personal'
      },
      {
        name: 'board_member_3_name',
        label: 'نام عضو سوم هیئت مدیره',
        description: 'نام عضو سوم هیئت مدیره (از رسمیو)',
        source: 'rasmio',
        category: 'personal'
      },
      {
        name: 'board_members_list',
        label: 'لیست کامل اعضای هیئت مدیره',
        description: 'لیست کامل اعضای هیئت مدیره با جداکننده (از رسمیو)',
        dataType: 'textarea',
        source: 'rasmio',
        category: 'personal'
      },
      {
        name: 'board_members_count',
        label: 'تعداد اعضای هیئت مدیره',
        description: 'تعداد کل اعضای هیئت مدیره (از رسمیو)',
        dataType: 'number',
        source: 'rasmio',
        category: 'company'
      },

      // ===========================================
      // متغیرهای تکمیلی شرکت (Company Extra) - Rasmio/System
      // ===========================================
      {
        name: 'company_type',
        label: 'نوع شرکت',
        description: 'نوع شرکت (خصوصی، سهامی، تعاونی و...)',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'registration_date',
        label: 'تاریخ ثبت شرکت',
        description: 'تاریخ ثبت رسمی شرکت',
        dataType: 'date',
        source: 'rasmio',
        category: 'dates'
      },
      {
        name: 'postal_code',
        label: 'کد پستی',
        description: 'کد پستی آدرس شرکت',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'city',
        label: 'شهر',
        description: 'شهر محل استقرار شرکت',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'established_year',
        label: 'سال تاسیس',
        description: 'سال تاسیس شرکت',
        dataType: 'number',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'website',
        label: 'وبسایت',
        description: 'آدرس وبسایت شرکت',
        source: 'rasmio',
        category: 'company'
      },
      {
        name: 'employee_count',
        label: 'تعداد کارکنان',
        description: 'تعداد کل کارکنان شرکت',
        dataType: 'number',
        source: 'form',
        category: 'company'
      }
    ];

    for (let i = 0; i < defaultVariables.length; i++) {
      const variable = defaultVariables[i];
      
      try {
        await db.execute(`
          INSERT OR IGNORE INTO contract_variables (
            name, label, description, data_type, source, category, 
            is_required, placeholder, sort_order, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          variable.name,
          variable.label,
          variable.description || null,
          variable.dataType || 'text',
          variable.source,
          variable.category,
          variable.isRequired || 0,
          variable.placeholder || null,
          i + 1,
          adminId
        ]);
      } catch (error) {
        console.warn(`⚠️ Could not insert variable ${variable.name}:`, error);
      }
    }

    console.log(`✅ Inserted ${defaultVariables.length} default contract variables`);

  } catch (error) {
    console.error("❌ Error creating contract variables tables:", error);
    // Don't throw error to prevent system startup failure
  }
}
