/**
 * Migration: Investment Reports System
 * 
 * ایجاد جداول برای سیستم تولید گزارش ارزیابی هوشمند
 * مشابه سیستم تولید قرارداد هوشمند
 */

import { db } from '../db';

export async function addInvestmentReportsSystem() {
  console.log('🔄 Running migration: add-investment-reports-system');

  try {
    // 1. جدول قالب‌های گزارش ارزیابی
    await db.execute(`
      CREATE TABLE IF NOT EXISTS investment_report_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT DEFAULT 'general',
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        variables TEXT, -- JSON array of variables
        sections TEXT, -- JSON array of report sections
        chart_configs TEXT, -- JSON config for charts/graphs
        version TEXT DEFAULT '1.0',
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Created table: investment_report_templates');

    // 2. جدول متغیرهای گزارش ارزیابی
    await db.execute(`
      CREATE TABLE IF NOT EXISTS investment_report_variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        data_type TEXT DEFAULT 'text', -- text, number, date, currency, percentage, rating, chart
        source TEXT DEFAULT 'form', -- form, ai_analysis, company_data, calculated, system
        category TEXT DEFAULT 'other', -- company, financial, team, product, market, risk
        default_value TEXT,
        is_required BOOLEAN DEFAULT 0,
        validation_rules TEXT, -- JSON
        placeholder TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Created table: investment_report_variables');

    // 3. جدول نگاشت متغیرها به قالب‌ها
    await db.execute(`
      CREATE TABLE IF NOT EXISTS investment_report_template_variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        variable_id INTEGER NOT NULL,
        is_required BOOLEAN DEFAULT 0,
        default_value TEXT,
        sort_order INTEGER DEFAULT 0,
        section TEXT, -- بخش گزارش که این متغیر در آن قرار دارد
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES investment_report_templates(id) ON DELETE CASCADE,
        FOREIGN KEY (variable_id) REFERENCES investment_report_variables(id) ON DELETE CASCADE,
        UNIQUE(template_id, variable_id)
      )
    `);
    console.log('✅ Created table: investment_report_template_variables');

    // 4. جدول داده‌های فرم گزارش (ذخیره اطلاعات واردشده)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS investment_report_form_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        form_type TEXT DEFAULT 'evaluation_form',
        form_data TEXT NOT NULL, -- JSON
        ai_analysis_id INTEGER, -- ارجاع به تحلیل AI موجود
        is_complete BOOLEAN DEFAULT 0,
        last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES investment_report_templates(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id),
        UNIQUE(company_id, template_id)
      )
    `);
    console.log('✅ Created table: investment_report_form_data');

    // 5. جدول گزارش‌های تولید شده
    await db.execute(`
      CREATE TABLE IF NOT EXISTS generated_investment_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        report_number TEXT UNIQUE NOT NULL,
        report_type TEXT DEFAULT 'evaluation', -- evaluation, progress, final, risk_assessment
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        file_format TEXT DEFAULT 'docx', -- docx, pdf
        report_data TEXT, -- JSON snapshot of data used
        scores TEXT, -- JSON object with all scores
        recommendations TEXT, -- JSON array of recommendations
        charts_data TEXT, -- JSON data for charts
        status TEXT DEFAULT 'draft', -- draft, finalized, approved, rejected
        approved_by INTEGER,
        approved_at DATETIME,
        approval_notes TEXT,
        version INTEGER DEFAULT 1,
        parent_report_id INTEGER, -- برای versioning
        generated_by INTEGER,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verification_hash TEXT UNIQUE,
        is_public BOOLEAN DEFAULT 0,
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (template_id) REFERENCES investment_report_templates(id),
        FOREIGN KEY (generated_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id),
        FOREIGN KEY (parent_report_id) REFERENCES generated_investment_reports(id)
      )
    `);
    console.log('✅ Created table: generated_investment_reports');

    // 6. جدول بخش‌های گزارش (sections)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS investment_report_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        section_type TEXT DEFAULT 'text', -- text, chart, table, mixed
        variables TEXT, -- JSON array of variable names for this section
        chart_config TEXT, -- JSON config if section_type is chart
        is_required BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES investment_report_templates(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created table: investment_report_sections');

    // 7. جدول نظرات و توصیه‌های کارشناس
    await db.execute(`
      CREATE TABLE IF NOT EXISTS investment_expert_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        section TEXT, -- بخشی از گزارش که نظر به آن مربوط است
        expert_id INTEGER NOT NULL,
        comment_type TEXT DEFAULT 'observation', -- observation, recommendation, concern, approval
        comment TEXT NOT NULL,
        severity TEXT DEFAULT 'info', -- info, warning, critical
        is_resolved BOOLEAN DEFAULT 0,
        resolved_by INTEGER,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES generated_investment_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (expert_id) REFERENCES users(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Created table: investment_expert_comments');

    // 7.5 Add columns if missing (verification_hash, is_public)
    try {
      await db.execute(`ALTER TABLE generated_investment_reports ADD COLUMN verification_hash TEXT UNIQUE`);
      console.log('✅ Added column: verification_hash');
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.execute(`ALTER TABLE generated_investment_reports ADD COLUMN is_public BOOLEAN DEFAULT 0`);
      console.log('✅ Added column: is_public');
    } catch (e) {
      // Column might already exist
    }

    // 8. Indexes برای بهینه‌سازی
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_investment_reports_company ON generated_investment_reports(company_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_investment_reports_status ON generated_investment_reports(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_investment_reports_type ON generated_investment_reports(report_type)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_investment_templates_active ON investment_report_templates(is_active)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_investment_variables_source ON investment_report_variables(source)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_investment_form_data_company ON investment_report_form_data(company_id)`);
    console.log('✅ Created indexes for investment reports');

    // 9. درج متغیرهای پیش‌فرض
    await insertDefaultReportVariables();

    // 10. درج قالب پیش‌فرض
    await insertDefaultReportTemplate();

    // 11. درج فرمول‌های محاسباتی (33 فرمول)
    await insertFinancialFormulas();

    console.log('✅ Migration completed: add-investment-reports-system');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * درج متغیرهای پیش‌فرض برای گزارش ارزیابی
 */
async function insertDefaultReportVariables() {
  const defaultVariables = [
    // ===========================================
    // دسته 1: اطلاعات شرکت و ارزیابی (4 متغیر)
    // ===========================================
    { 
      name: 'company_name', 
      label: 'نام شرکت', 
      description: 'نام کامل شرکت',
      category: 'company', 
      source: 'company_data', 
      data_type: 'text', 
      is_required: true,
      sort_order: 1
    },
    { 
      name: 'company_national_id', 
      label: 'شناسه ملی شرکت', 
      description: 'شناسه ملی 11 رقمی شرکت',
      category: 'company', 
      source: 'company_data', 
      data_type: 'text', 
      is_required: true,
      validation_rules: JSON.stringify({ length: 11, numeric: true }),
      sort_order: 2
    },
    { 
      name: 'evaluation_year', 
      label: 'سال مالی ارزیابی', 
      description: 'سال مالی مورد ارزیابی (شمسی)',
      category: 'financial', 
      source: 'form', 
      data_type: 'number', 
      is_required: true,
      validation_rules: JSON.stringify({ min: 1390, max: 1450 }),
      placeholder: 'مثال: 1401',
      sort_order: 3
    },
    { 
      name: 'evaluation_period', 
      label: 'دوره مالی', 
      description: 'دوره زمانی گزارش',
      category: 'financial', 
      source: 'form', 
      data_type: 'text', 
      is_required: true,
      placeholder: 'مثال: 12 ماهه، 9 ماهه، 6 ماهه',
      sort_order: 4
    },

    // ===========================================
    // دسته 2: صورت سود و زیان - ورودی (9 متغیر)
    // ===========================================
    {
      name: 'revenue',
      label: 'درآمد عملیاتی',
      description: 'کل درآمد حاصل از فروش کالا و خدمات',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      is_required: true,
      placeholder: 'مثال: 2078896',
      validation_rules: JSON.stringify({ min: 0 }),
      sort_order: 10
    },
    {
      name: 'cost_of_goods_sold',
      label: 'بهای تمام شده درآمد عملیاتی',
      description: 'هزینه مستقیم تولید کالا یا ارائه خدمات (عدد منفی)',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      is_required: true,
      placeholder: 'مثال: -1883671',
      validation_rules: JSON.stringify({ max: 0 }),
      sort_order: 11
    },
    {
      name: 'admin_selling_expenses',
      label: 'هزینه اداری، فروش و عمومی',
      description: 'هزینه‌های غیرمستقیم عملیاتی (عدد منفی)',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      is_required: true,
      placeholder: 'مثال: -43192',
      validation_rules: JSON.stringify({ max: 0 }),
      sort_order: 12
    },
    {
      name: 'other_income',
      label: 'سایر درآمدها',
      description: 'درآمدهای غیرعملیاتی',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      placeholder: 'مثال: 1655',
      default_value: '0',
      sort_order: 13
    },
    {
      name: 'other_expenses',
      label: 'سایر هزینه‌ها',
      description: 'هزینه‌های غیرعملیاتی (عدد منفی)',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      placeholder: 'مثال: -3489',
      default_value: '0',
      sort_order: 14
    },
    {
      name: 'financial_expenses',
      label: 'هزینه مالی',
      description: 'هزینه بهره و تسهیلات (عدد منفی)',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      is_required: true,
      placeholder: 'مثال: -104145',
      validation_rules: JSON.stringify({ max: 0 }),
      sort_order: 15
    },
    {
      name: 'non_operating_income_expense',
      label: 'سایر درآمدها و هزینه‌های غیرعملیاتی',
      description: 'درآمد یا هزینه‌های غیرعملیاتی خالص',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      placeholder: 'مثال: 3728',
      default_value: '0',
      sort_order: 16
    },
    {
      name: 'tax_expense',
      label: 'هزینه مالیات بر درآمد',
      description: 'مالیات قابل پرداخت (عدد منفی)',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      is_required: true,
      placeholder: 'مثال: -13602',
      validation_rules: JSON.stringify({ max: 0 }),
      sort_order: 17
    },
    {
      name: 'depreciation',
      label: 'استهلاک',
      description: 'استهلاک دارایی‌های ثابت',
      data_type: 'currency',
      source: 'form',
      category: 'income_statement',
      is_required: true,
      placeholder: 'مثال: 22489',
      validation_rules: JSON.stringify({ min: 0 }),
      sort_order: 18
    },

    // ===========================================
    // دسته 3: صورت سود و زیان - محاسباتی (9 متغیر)
    // ===========================================
    {
      name: 'gross_profit',
      label: 'سود ناخالص',
      description: 'درآمد منهای بهای تمام شده',
      data_type: 'currency',
      source: 'calculated',
      category: 'income_statement',
      sort_order: 20
    },
    {
      name: 'gross_margin',
      label: 'حاشیه سود ناخالص',
      description: 'نسبت سود ناخالص به درآمد',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 21
    },
    {
      name: 'operating_profit',
      label: 'سود عملیاتی',
      description: 'سود حاصل از عملیات اصلی کسب‌وکار',
      data_type: 'currency',
      source: 'calculated',
      category: 'income_statement',
      sort_order: 22
    },
    {
      name: 'operating_margin',
      label: 'حاشیه سود عملیاتی',
      description: 'نسبت سود عملیاتی به درآمد',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 23
    },
    {
      name: 'profit_before_tax',
      label: 'سود قبل از کسر مالیات',
      description: 'سود قبل از کسر مالیات',
      data_type: 'currency',
      source: 'calculated',
      category: 'income_statement',
      sort_order: 24
    },
    {
      name: 'net_profit',
      label: 'سود خالص',
      description: 'سود نهایی پس از کسر همه هزینه‌ها',
      data_type: 'currency',
      source: 'calculated',
      category: 'income_statement',
      sort_order: 25
    },
    {
      name: 'net_margin',
      label: 'حاشیه سود خالص',
      description: 'نسبت سود خالص به درآمد',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 26
    },
    {
      name: 'ebitda',
      label: 'EBITDA',
      description: 'سود قبل از بهره، مالیات، استهلاک',
      data_type: 'currency',
      source: 'calculated',
      category: 'income_statement',
      sort_order: 27
    },
    {
      name: 'ebitda_margin',
      label: 'حاشیه EBITDA',
      description: 'نسبت EBITDA به درآمد',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 28
    },

    // ===========================================
    // دسته 4: ترازنامه - دارایی‌ها ورودی (7 متغیر)
    // ===========================================
    {
      name: 'tangible_fixed_assets',
      label: 'دارایی ثابت مشهود',
      description: 'زمین، ساختمان، ماشین‌آلات',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 1146119',
      sort_order: 30
    },
    {
      name: 'intangible_fixed_assets',
      label: 'دارایی ثابت نامشهود',
      description: 'حق اختراع، نرم‌افزار، سرقفلی',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      placeholder: 'مثال: 629',
      default_value: '0',
      sort_order: 31
    },
    {
      name: 'long_term_investments',
      label: 'سرمایه‌گذاری‌های بلندمدت',
      description: 'سهام، اوراق، املاک',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      placeholder: 'مثال: 70',
      default_value: '0',
      sort_order: 32
    },
    {
      name: 'prepayments',
      label: 'پیش‌پرداخت‌ها',
      description: 'پیش‌پرداخت به تأمین‌کنندگان',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 211056',
      sort_order: 33
    },
    {
      name: 'inventory',
      label: 'موجودی مواد و کالا',
      description: 'مواد اولیه، کالای نیمه‌ساخته، محصول نهایی',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 1372562',
      sort_order: 34
    },
    {
      name: 'accounts_receivable',
      label: 'دریافتنی‌های تجاری و سایر دریافتنی‌ها',
      description: 'طلب از مشتریان',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 366912',
      sort_order: 35
    },
    {
      name: 'cash',
      label: 'موجودی نقد',
      description: 'وجه نقد و بانک',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 828',
      sort_order: 36
    },

    // ===========================================
    // دسته 5: ترازنامه - حقوق و بدهی‌ها ورودی (9 متغیر)
    // ===========================================
    {
      name: 'capital',
      label: 'سرمایه',
      description: 'سرمایه ثبت شده شرکت',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 450000',
      sort_order: 40
    },
    {
      name: 'legal_reserve',
      label: 'اندوخته قانونی',
      description: 'اندوخته قانونی 5% سود',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      placeholder: 'مثال: 5731',
      default_value: '0',
      sort_order: 41
    },
    {
      name: 'retained_earnings',
      label: 'سود (زیان) انباشته',
      description: 'سود انباشته از سال‌های قبل',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 129824',
      sort_order: 42
    },
    {
      name: 'long_term_payables',
      label: 'پرداختنی‌های بلندمدت',
      description: 'وام و تسهیلات بلندمدت',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 750000',
      sort_order: 43
    },
    {
      name: 'employee_benefits_reserve',
      label: 'ذخیره مزایای پایان خدمت کارکنان',
      description: 'ذخیره پایان کار کارکنان',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      placeholder: 'مثال: 12728',
      default_value: '0',
      sort_order: 44
    },
    {
      name: 'accounts_payable',
      label: 'پرداختنی‌های تجاری و سایر پرداختنی‌ها',
      description: 'بدهی به تأمین‌کنندگان',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 1079069',
      sort_order: 45
    },
    {
      name: 'short_term_facilities',
      label: 'تسهیلات مالی کوتاه‌مدت',
      description: 'وام و تسهیلات کوتاه‌مدت',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      is_required: true,
      placeholder: 'مثال: 500835',
      sort_order: 46
    },
    {
      name: 'tax_payable',
      label: 'مالیات پرداختنی',
      description: 'مالیات تعلق گرفته',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      placeholder: 'مثال: 13931',
      default_value: '0',
      sort_order: 47
    },
    {
      name: 'advance_receipts',
      label: 'پیش‌دریافت‌ها',
      description: 'پیش‌دریافت از مشتریان',
      data_type: 'currency',
      source: 'form',
      category: 'balance_sheet',
      placeholder: 'مثال: 156056',
      default_value: '0',
      sort_order: 48
    },

    // ===========================================
    // دسته 6: ترازنامه - محاسباتی (8 متغیر)
    // ===========================================
    {
      name: 'total_non_current_assets',
      label: 'جمع دارایی‌های غیرجاری',
      description: 'جمع دارایی‌های ثابت',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 50
    },
    {
      name: 'total_current_assets',
      label: 'جمع دارایی‌های جاری',
      description: 'جمع دارایی‌های نقدشونده',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 51
    },
    {
      name: 'total_assets',
      label: 'جمع دارایی‌ها',
      description: 'جمع کل دارایی‌ها',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 52
    },
    {
      name: 'total_equity',
      label: 'جمع حقوق مالکانه',
      description: 'سرمایه + اندوخته + سود',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 53
    },
    {
      name: 'total_non_current_liabilities',
      label: 'جمع بدهی‌های غیرجاری',
      description: 'جمع بدهی‌های بلندمدت',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 54
    },
    {
      name: 'total_current_liabilities',
      label: 'جمع بدهی‌های جاری',
      description: 'جمع بدهی‌های کوتاه‌مدت',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 55
    },
    {
      name: 'total_liabilities',
      label: 'جمع بدهی‌ها',
      description: 'جمع کل بدهی‌ها',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 56
    },
    {
      name: 'total_equity_and_liabilities',
      label: 'جمع حقوق مالکانه و بدهی‌ها',
      description: 'باید با جمع دارایی‌ها برابر باشد',
      data_type: 'currency',
      source: 'calculated',
      category: 'balance_sheet',
      sort_order: 57
    },

    // ===========================================
    // دسته 7: نسبت‌های مالی - محاسباتی (16 متغیر)
    // ===========================================
    {
      name: 'interest_coverage_ratio',
      label: 'نسبت پوشش بهره (Interest Coverage Ratio)',
      description: 'توانایی شرکت در پرداخت هزینه‌های مالی از محل سود عملیاتی',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 60
    },
    {
      name: 'debt_to_equity_ratio',
      label: 'نسبت اهرمی (Debt to Equity)',
      description: 'میزان بدهی به ازای هر واحد حقوق مالکانه',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 61
    },
    {
      name: 'current_ratio',
      label: 'نسبت جاری (Current Ratio)',
      description: 'توانایی پرداخت بدهی‌های کوتاه‌مدت',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 62
    },
    {
      name: 'quick_ratio',
      label: 'نسبت آنی (Quick Ratio)',
      description: 'نقدشوندگی سریع دارایی‌ها (بدون موجودی کالا)',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 63
    },
    {
      name: 'cash_ratio',
      label: 'نسبت نقدینگی (Cash Ratio)',
      description: 'توانایی پرداخت فوری بدهی‌ها',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 64
    },
    {
      name: 'debt_ratio',
      label: 'نسبت بدهی (Debt Ratio)',
      description: 'سهم بدهی از کل دارایی‌ها',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 65
    },
    {
      name: 'equity_ratio',
      label: 'نسبت مالکانه (Equity Ratio)',
      description: 'سهم حقوق مالکانه از کل دارایی‌ها',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 66
    },
    {
      name: 'working_capital',
      label: 'سرمایه در گردش خالص (Working Capital)',
      description: 'مازاد دارایی‌های جاری بر بدهی‌های جاری',
      data_type: 'currency',
      source: 'calculated',
      category: 'ratios',
      sort_order: 67
    },
    {
      name: 'receivables_days',
      label: 'دوره وصول مطالبات (Receivables Days)',
      description: 'متوسط روزهای وصول مطالبات از مشتریان',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 68
    },
    {
      name: 'inventory_days',
      label: 'دوره گردش موجودی (Inventory Days)',
      description: 'متوسط روزهای نگهداری موجودی کالا',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 69
    },
    {
      name: 'payables_days',
      label: 'دوره پرداخت بدهی (Payables Days)',
      description: 'متوسط روزهای پرداخت به تأمین‌کنندگان',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 70
    },
    {
      name: 'cash_conversion_cycle',
      label: 'چرخه تبدیل نقد (Cash Conversion Cycle)',
      description: 'مدت زمان تبدیل سرمایه به نقد',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 71
    },
    {
      name: 'inventory_turnover',
      label: 'گردش موجودی کالا (Inventory Turnover)',
      description: 'تعداد دفعات فروش موجودی در سال',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 72
    },
    {
      name: 'asset_turnover',
      label: 'گردش دارایی (Asset Turnover)',
      description: 'کارایی استفاده از دارایی‌ها برای تولید درآمد',
      data_type: 'number',
      source: 'calculated',
      category: 'ratios',
      sort_order: 73
    },
    {
      name: 'roa',
      label: 'بازده دارایی (ROA - Return on Assets)',
      description: 'نرخ بازده دارایی‌ها',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 74
    },
    {
      name: 'roe',
      label: 'بازده حقوق صاحبان سهام (ROE - Return on Equity)',
      description: 'نرخ بازده حقوق مالکانه',
      data_type: 'percentage',
      source: 'calculated',
      category: 'ratios',
      sort_order: 75
    },
    
    // ===========================================
    // متغیرهای قبلی سیستم (برای سازگاری)
    // ===========================================
    { name: 'evaluation_date', label: 'تاریخ ارزیابی', category: 'general', source: 'system', data_type: 'date', is_required: true, sort_order: 100 },
    { name: 'report_number', label: 'شماره گزارش', category: 'general', source: 'system', data_type: 'text', is_required: true, sort_order: 101 },
    { name: 'evaluator_name', label: 'نام ارزیاب', category: 'general', source: 'system', data_type: 'text', sort_order: 102 },
    
    // Team Analysis (از AI Analysis)
    { name: 'team_score', label: 'امتیاز تیم', category: 'team', source: 'ai_analysis', data_type: 'rating', sort_order: 110 },
    { name: 'team_strengths', label: 'نقاط قوت تیم', category: 'team', source: 'ai_analysis', data_type: 'text', sort_order: 111 },
    { name: 'team_weaknesses', label: 'نقاط ضعف تیم', category: 'team', source: 'ai_analysis', data_type: 'text', sort_order: 112 },
    { name: 'team_summary', label: 'خلاصه تحلیل تیم', category: 'team', source: 'ai_analysis', data_type: 'text', sort_order: 113 },
    
    // Product Analysis
    { name: 'product_score', label: 'امتیاز محصول', category: 'product', source: 'ai_analysis', data_type: 'rating', sort_order: 120 },
    { name: 'product_market_potential', label: 'پتانسیل بازار', category: 'product', source: 'ai_analysis', data_type: 'text', sort_order: 121 },
    { name: 'product_competitive_advantage', label: 'مزیت رقابتی', category: 'product', source: 'ai_analysis', data_type: 'text', sort_order: 122 },
    { name: 'product_summary', label: 'خلاصه تحلیل محصول', category: 'product', source: 'ai_analysis', data_type: 'text', sort_order: 123 },
    
    // Market Analysis
    { name: 'market_score', label: 'امتیاز بازار', category: 'market', source: 'ai_analysis', data_type: 'rating', sort_order: 130 },
    { name: 'market_size', label: 'اندازه بازار', category: 'market', source: 'ai_analysis', data_type: 'text', sort_order: 131 },
    { name: 'market_competition', label: 'وضعیت رقابت', category: 'market', source: 'ai_analysis', data_type: 'text', sort_order: 132 },
    { name: 'market_trends', label: 'روندهای بازار', category: 'market', source: 'ai_analysis', data_type: 'text', sort_order: 133 },
    { name: 'market_summary', label: 'خلاصه تحلیل بازار', category: 'market', source: 'ai_analysis', data_type: 'text', sort_order: 134 },
    
    // Financial Analysis (AI)
    { name: 'financial_score', label: 'امتیاز مالی', category: 'financial', source: 'ai_analysis', data_type: 'rating', sort_order: 140 },
    { name: 'financial_capital_structure', label: 'ساختار سرمایه', category: 'financial', source: 'ai_analysis', data_type: 'text', sort_order: 141 },
    { name: 'financial_growth_potential', label: 'پتانسیل رشد', category: 'financial', source: 'ai_analysis', data_type: 'text', sort_order: 142 },
    { name: 'financial_summary', label: 'خلاصه تحلیل مالی', category: 'financial', source: 'ai_analysis', data_type: 'text', sort_order: 143 },
    
    // Risk Analysis
    { name: 'risk_score', label: 'امتیاز ریسک', category: 'risk', source: 'ai_analysis', data_type: 'rating', sort_order: 150 },
    { name: 'risk_main_risks', label: 'ریسک‌های اصلی', category: 'risk', source: 'ai_analysis', data_type: 'text', sort_order: 151 },
    { name: 'risk_mitigation_strategies', label: 'راهکارهای کاهش ریسک', category: 'risk', source: 'ai_analysis', data_type: 'text', sort_order: 152 },
    { name: 'risk_summary', label: 'خلاصه تحلیل ریسک', category: 'risk', source: 'ai_analysis', data_type: 'text', sort_order: 153 },
    
    // Overall Recommendation
    { name: 'overall_score', label: 'امتیاز کلی', category: 'general', source: 'calculated', data_type: 'rating', is_required: true, sort_order: 160 },
    { name: 'overall_recommendation', label: 'توصیه نهایی', category: 'general', source: 'ai_analysis', data_type: 'text', sort_order: 161 },
    { name: 'overall_reasoning', label: 'دلایل توصیه', category: 'general', source: 'ai_analysis', data_type: 'text', sort_order: 162 },
    { name: 'next_steps', label: 'گام‌های بعدی', category: 'general', source: 'ai_analysis', data_type: 'text', sort_order: 163 },
    
    // Investment Details (form input)
    { name: 'proposed_investment_amount', label: 'مبلغ سرمایه‌گذاری پیشنهادی', category: 'financial', source: 'form', data_type: 'currency', sort_order: 170 },
    { name: 'investment_structure', label: 'ساختار سرمایه‌گذاری', category: 'financial', source: 'form', data_type: 'text', sort_order: 171 },
    { name: 'expected_roi', label: 'بازده مورد انتظار', category: 'financial', source: 'form', data_type: 'percentage', sort_order: 172 },
    { name: 'investment_duration', label: 'مدت زمان سرمایه‌گذاری', category: 'financial', source: 'form', data_type: 'text', sort_order: 173 },
    
    // Expert Comments
    { name: 'expert_comments', label: 'نظرات کارشناس', category: 'general', source: 'form', data_type: 'text', sort_order: 180 },
    { name: 'special_notes', label: 'یادداشت‌های ویژه', category: 'general', source: 'form', data_type: 'text', sort_order: 181 }
  ];

  for (const variable of defaultVariables) {
    try {
      await db.execute(`
        INSERT OR IGNORE INTO investment_report_variables 
        (name, label, description, category, source, data_type, is_required, placeholder, default_value, validation_rules, sort_order, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        variable.name,
        variable.label,
        variable.description || null,
        variable.category,
        variable.source,
        variable.data_type,
        variable.is_required ? 1 : 0,
        variable.placeholder || null,
        variable.default_value || null,
        variable.validation_rules || null,
        variable.sort_order || 0
      ]);
    } catch (error) {
      console.warn(`⚠️ Could not insert variable ${variable.name}:`, error);
    }
  }

  console.log(`✅ Inserted ${defaultVariables.length} default report variables`);
}

/**
 * درج قالب پیش‌فرض
 */
async function insertDefaultReportTemplate() {
  try {
    const defaultVariables = [
      'company_name', 'company_registration_number', 'evaluation_date', 'report_number',
      'team_score', 'team_summary', 'product_score', 'product_summary',
      'market_score', 'market_summary', 'financial_score', 'financial_summary',
      'risk_score', 'risk_summary', 'overall_score', 'overall_recommendation'
    ];

    await db.execute(`
      INSERT OR IGNORE INTO investment_report_templates 
      (name, description, category, file_name, file_path, variables, version, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'گزارش ارزیابی استاندارد',
      'قالب پیش‌فرض برای گزارش ارزیابی اولیه شرکت‌های سرمایه‌گذاری',
      'evaluation',
      'standard-evaluation-template.docx',
      'uploads/templates/standard-evaluation-template.docx',
      JSON.stringify(defaultVariables),
      '1.0',
      1,
      1
    ]);

    console.log('✅ Inserted default report template');
  } catch (error) {
    console.warn('⚠️ Could not insert default template:', error);
  }
}

/**
 * درج فرمول‌های محاسباتی (33 فرمول)
 */
async function insertFinancialFormulas() {
  console.log('🔄 Inserting financial formulas...');

  const formulas = [
    // ===========================================
    // گروه 1: صورت سود و زیان (9 فرمول)
    // ===========================================
    {
      variable_name: 'gross_profit',
      formula: 'revenue + cost_of_goods_sold',
      description: 'سود ناخالص = درآمد + بهای تمام شده',
      dependencies: ['revenue', 'cost_of_goods_sold'],
      execution_order: 1
    },
    {
      variable_name: 'gross_margin',
      formula: 'gross_profit / revenue',
      description: 'حاشیه ناخالص = سود ناخالص / درآمد',
      dependencies: ['gross_profit', 'revenue'],
      execution_order: 2
    },
    {
      variable_name: 'operating_profit',
      formula: 'gross_profit + admin_selling_expenses + other_income + other_expenses',
      description: 'سود عملیاتی = سود ناخالص + هزینه‌های عملیاتی + سایر درآمدها و هزینه‌ها',
      dependencies: ['gross_profit', 'admin_selling_expenses', 'other_income', 'other_expenses'],
      execution_order: 3
    },
    {
      variable_name: 'operating_margin',
      formula: 'operating_profit / revenue',
      description: 'حاشیه عملیاتی = سود عملیاتی / درآمد',
      dependencies: ['operating_profit', 'revenue'],
      execution_order: 4
    },
    {
      variable_name: 'profit_before_tax',
      formula: 'operating_profit + financial_expenses + non_operating_income_expense',
      description: 'سود قبل از مالیات = سود عملیاتی + هزینه مالی + سایر درآمد/هزینه',
      dependencies: ['operating_profit', 'financial_expenses', 'non_operating_income_expense'],
      execution_order: 5
    },
    {
      variable_name: 'net_profit',
      formula: 'profit_before_tax + tax_expense',
      description: 'سود خالص = سود قبل از مالیات + مالیات',
      dependencies: ['profit_before_tax', 'tax_expense'],
      execution_order: 6
    },
    {
      variable_name: 'net_margin',
      formula: 'net_profit / revenue',
      description: 'حاشیه خالص = سود خالص / درآمد',
      dependencies: ['net_profit', 'revenue'],
      execution_order: 7
    },
    {
      variable_name: 'ebitda',
      formula: 'operating_profit + depreciation',
      description: 'EBITDA = سود عملیاتی + استهلاک',
      dependencies: ['operating_profit', 'depreciation'],
      execution_order: 8
    },
    {
      variable_name: 'ebitda_margin',
      formula: 'ebitda / revenue',
      description: 'حاشیه EBITDA = EBITDA / درآمد',
      dependencies: ['ebitda', 'revenue'],
      execution_order: 9
    },

    // ===========================================
    // گروه 2: ترازنامه (8 فرمول)
    // ===========================================
    {
      variable_name: 'total_non_current_assets',
      formula: 'tangible_fixed_assets + intangible_fixed_assets + long_term_investments',
      description: 'جمع دارایی‌های غیرجاری',
      dependencies: ['tangible_fixed_assets', 'intangible_fixed_assets', 'long_term_investments'],
      execution_order: 10
    },
    {
      variable_name: 'total_current_assets',
      formula: 'prepayments + inventory + accounts_receivable + cash',
      description: 'جمع دارایی‌های جاری',
      dependencies: ['prepayments', 'inventory', 'accounts_receivable', 'cash'],
      execution_order: 11
    },
    {
      variable_name: 'total_assets',
      formula: 'total_non_current_assets + total_current_assets',
      description: 'جمع دارایی‌ها',
      dependencies: ['total_non_current_assets', 'total_current_assets'],
      execution_order: 12
    },
    {
      variable_name: 'total_equity',
      formula: 'capital + legal_reserve + retained_earnings',
      description: 'جمع حقوق مالکانه',
      dependencies: ['capital', 'legal_reserve', 'retained_earnings'],
      execution_order: 13
    },
    {
      variable_name: 'total_non_current_liabilities',
      formula: 'long_term_payables + employee_benefits_reserve',
      description: 'جمع بدهی‌های غیرجاری',
      dependencies: ['long_term_payables', 'employee_benefits_reserve'],
      execution_order: 14
    },
    {
      variable_name: 'total_current_liabilities',
      formula: 'accounts_payable + short_term_facilities + tax_payable + advance_receipts',
      description: 'جمع بدهی‌های جاری',
      dependencies: ['accounts_payable', 'short_term_facilities', 'tax_payable', 'advance_receipts'],
      execution_order: 15
    },
    {
      variable_name: 'total_liabilities',
      formula: 'total_non_current_liabilities + total_current_liabilities',
      description: 'جمع بدهی‌ها',
      dependencies: ['total_non_current_liabilities', 'total_current_liabilities'],
      execution_order: 16
    },
    {
      variable_name: 'total_equity_and_liabilities',
      formula: 'total_equity + total_liabilities',
      description: 'جمع حقوق و بدهی (باید با جمع دارایی‌ها برابر باشد)',
      dependencies: ['total_equity', 'total_liabilities'],
      execution_order: 17
    },

    // ===========================================
    // گروه 3: نسبت‌های مالی (16 فرمول)
    // ===========================================
    {
      variable_name: 'interest_coverage_ratio',
      formula: '(operating_profit + financial_expenses) / financial_expenses',
      description: 'نسبت پوشش بهره (توجه: financial_expenses منفی است)',
      dependencies: ['operating_profit', 'financial_expenses'],
      execution_order: 18
    },
    {
      variable_name: 'debt_to_equity_ratio',
      formula: 'total_liabilities / total_equity',
      description: 'نسبت اهرمی',
      dependencies: ['total_liabilities', 'total_equity'],
      execution_order: 19
    },
    {
      variable_name: 'current_ratio',
      formula: 'total_current_assets / total_current_liabilities',
      description: 'نسبت جاری',
      dependencies: ['total_current_assets', 'total_current_liabilities'],
      execution_order: 20
    },
    {
      variable_name: 'quick_ratio',
      formula: '(total_current_assets - inventory) / total_current_liabilities',
      description: 'نسبت آنی',
      dependencies: ['total_current_assets', 'inventory', 'total_current_liabilities'],
      execution_order: 21
    },
    {
      variable_name: 'cash_ratio',
      formula: 'cash / total_current_liabilities',
      description: 'نسبت نقدینگی',
      dependencies: ['cash', 'total_current_liabilities'],
      execution_order: 22
    },
    {
      variable_name: 'debt_ratio',
      formula: 'total_liabilities / total_assets',
      description: 'نسبت بدهی',
      dependencies: ['total_liabilities', 'total_assets'],
      execution_order: 23
    },
    {
      variable_name: 'equity_ratio',
      formula: 'total_equity / total_assets',
      description: 'نسبت مالکانه',
      dependencies: ['total_equity', 'total_assets'],
      execution_order: 24
    },
    {
      variable_name: 'working_capital',
      formula: 'total_current_assets - total_current_liabilities',
      description: 'سرمایه در گردش',
      dependencies: ['total_current_assets', 'total_current_liabilities'],
      execution_order: 25
    },
    {
      variable_name: 'receivables_days',
      formula: '(accounts_receivable / revenue) * 365',
      description: 'دوره وصول مطالبات',
      dependencies: ['accounts_receivable', 'revenue'],
      execution_order: 26
    },
    {
      variable_name: 'inventory_days',
      formula: '(inventory / ABS(cost_of_goods_sold)) * 365',
      description: 'دوره گردش موجودی',
      dependencies: ['inventory', 'cost_of_goods_sold'],
      execution_order: 27
    },
    {
      variable_name: 'payables_days',
      formula: '(accounts_payable / ABS(cost_of_goods_sold)) * 365',
      description: 'دوره پرداخت بدهی',
      dependencies: ['accounts_payable', 'cost_of_goods_sold'],
      execution_order: 28
    },
    {
      variable_name: 'cash_conversion_cycle',
      formula: 'receivables_days + inventory_days - payables_days',
      description: 'چرخه تبدیل نقد',
      dependencies: ['receivables_days', 'inventory_days', 'payables_days'],
      execution_order: 29
    },
    {
      variable_name: 'inventory_turnover',
      formula: 'ABS(cost_of_goods_sold) / inventory',
      description: 'گردش موجودی',
      dependencies: ['cost_of_goods_sold', 'inventory'],
      execution_order: 30
    },
    {
      variable_name: 'asset_turnover',
      formula: 'revenue / total_assets',
      description: 'گردش دارایی',
      dependencies: ['revenue', 'total_assets'],
      execution_order: 31
    },
    {
      variable_name: 'roa',
      formula: 'net_profit / total_assets',
      description: 'بازده دارایی',
      dependencies: ['net_profit', 'total_assets'],
      execution_order: 32
    },
    {
      variable_name: 'roe',
      formula: 'net_profit / total_equity',
      description: 'بازده حقوق مالکانه',
      dependencies: ['net_profit', 'total_equity'],
      execution_order: 33
    }
  ];

  // درج فرمول‌ها و وابستگی‌ها
  for (const formulaData of formulas) {
    try {
      // 1. پیدا کردن variable_id از روی نام
      const varResult = await db.execute(`
        SELECT id FROM investment_report_variables WHERE name = ?
      `, [formulaData.variable_name]);

      if (varResult.rows.length === 0) {
        console.warn(`⚠️ Variable not found: ${formulaData.variable_name}`);
        continue;
      }

      const variableId = (varResult.rows[0] as any).id;

      // 2. درج فرمول
      const formulaResult = await db.execute(`
        INSERT OR IGNORE INTO financial_formulas 
        (variable_id, formula_expression, description, execution_order, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [
        variableId,
        formulaData.formula,
        formulaData.description,
        formulaData.execution_order
      ]);

      // 3. دریافت formula_id
      const formulaIdResult = await db.execute(`
        SELECT id FROM financial_formulas WHERE variable_id = ? AND execution_order = ?
      `, [variableId, formulaData.execution_order]);

      if (formulaIdResult.rows.length === 0) {
        continue;
      }

      const formulaId = (formulaIdResult.rows[0] as any).id;

      // 4. درج وابستگی‌ها
      for (const depVarName of formulaData.dependencies) {
        const depVarResult = await db.execute(`
          SELECT id FROM investment_report_variables WHERE name = ?
        `, [depVarName]);

        if (depVarResult.rows.length > 0) {
          const depVarId = (depVarResult.rows[0] as any).id;
          
          await db.execute(`
            INSERT OR IGNORE INTO formula_dependencies (formula_id, depends_on_variable_id)
            VALUES (?, ?)
          `, [formulaId, depVarId]);
        }
      }

    } catch (error) {
      console.warn(`⚠️ Error inserting formula ${formulaData.variable_name}:`, error);
    }
  }

  console.log(`✅ Inserted ${formulas.length} financial formulas with dependencies`);
}

