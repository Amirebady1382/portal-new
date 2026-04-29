import { db } from '../db';

/**
 * Migration: Financial Evaluation Forms
 * 
 * ایجاد 4 فرم ورودی برای ثبت داده‌های مالی شرکت‌ها:
 * 1. اطلاعات پایه ارزیابی
 * 2. صورت سود و زیان
 * 3. ترازنامه - دارایی‌ها  
 * 4. ترازنامه - حقوق و بدهی‌ها
 */
export async function addFinancialEvaluationForms() {
  console.log('🔄 Adding financial evaluation forms...');

  try {
    // بررسی وجود admin user
    let adminId = 1;
    try {
      const adminUser = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminUser.rows[0]) {
        adminId = (adminUser.rows[0] as any).id;
      }
    } catch (error) {
      console.log('⚠️ Using default admin ID');
    }

    const forms = [
      // ===========================================
      // فرم 1: اطلاعات پایه ارزیابی
      // ===========================================
      {
        title: 'اطلاعات پایه ارزیابی مالی',
        description: 'ثبت اطلاعات پایه برای شروع ارزیابی مالی شرکت',
        department: 'investment',
        category: 'financial_evaluation',
        fields: [
          {
            name: 'evaluation_year',
            label: 'سال مالی ارزیابی',
            type: 'number',
            required: true,
            placeholder: 'مثال: 1401',
            helpText: 'سال شمسی مورد بررسی',
            validation: { min: 1390, max: 1450 },
            variableName: 'evaluation_year'
          },
          {
            name: 'evaluation_period',
            label: 'دوره مالی',
            type: 'select',
            required: true,
            options: ['12 ماهه', '9 ماهه', '6 ماهه', '3 ماهه'],
            defaultValue: '12 ماهه',
            helpText: 'دوره زمانی گزارش مالی',
            variableName: 'evaluation_period'
          }
        ]
      },

      // ===========================================
      // فرم 2: صورت سود و زیان
      // ===========================================
      {
        title: 'صورت سود و زیان',
        description: 'ثبت اطلاعات صورت سود و زیان شرکت (تمام مبالغ به میلیون ریال)',
        department: 'investment',
        category: 'financial_evaluation',
        fields: [
          {
            name: 'revenue',
            label: 'درآمد عملیاتی',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 2078896',
            unit: 'میلیون ریال',
            helpText: 'کل درآمد حاصل از فروش کالا و خدمات',
            validation: { min: 0 },
            variableName: 'revenue'
          },
          {
            name: 'cost_of_goods_sold',
            label: 'بهای تمام شده درآمد عملیاتی',
            type: 'currency',
            required: true,
            placeholder: 'مثال: -1883671',
            unit: 'میلیون ریال',
            helpText: 'هزینه مستقیم تولید (عدد منفی وارد کنید)',
            validation: { max: 0 },
            variableName: 'cost_of_goods_sold'
          },
          {
            name: 'admin_selling_expenses',
            label: 'هزینه اداری، فروش و عمومی',
            type: 'currency',
            required: true,
            placeholder: 'مثال: -43192',
            unit: 'میلیون ریال',
            helpText: 'هزینه‌های غیرمستقیم (عدد منفی وارد کنید)',
            validation: { max: 0 },
            variableName: 'admin_selling_expenses'
          },
          {
            name: 'other_income',
            label: 'سایر درآمدها',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 1655',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'درآمدهای غیرعملیاتی',
            variableName: 'other_income'
          },
          {
            name: 'other_expenses',
            label: 'سایر هزینه‌ها',
            type: 'currency',
            required: false,
            placeholder: 'مثال: -3489',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'هزینه‌های غیرعملیاتی (عدد منفی)',
            variableName: 'other_expenses'
          },
          {
            name: 'financial_expenses',
            label: 'هزینه مالی',
            type: 'currency',
            required: true,
            placeholder: 'مثال: -104145',
            unit: 'میلیون ریال',
            helpText: 'هزینه بهره و تسهیلات (عدد منفی)',
            validation: { max: 0 },
            variableName: 'financial_expenses'
          },
          {
            name: 'non_operating_income_expense',
            label: 'سایر درآمدها و هزینه‌های غیرعملیاتی',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 3728',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'خالص درآمد/هزینه غیرعملیاتی',
            variableName: 'non_operating_income_expense'
          },
          {
            name: 'tax_expense',
            label: 'هزینه مالیات بر درآمد',
            type: 'currency',
            required: true,
            placeholder: 'مثال: -13602',
            unit: 'میلیون ریال',
            helpText: 'مالیات پرداختنی (عدد منفی)',
            validation: { max: 0 },
            variableName: 'tax_expense'
          },
          {
            name: 'depreciation',
            label: 'استهلاک',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 22489',
            unit: 'میلیون ریال',
            helpText: 'استهلاک دارایی‌های ثابت',
            validation: { min: 0 },
            variableName: 'depreciation'
          }
        ]
      },

      // ===========================================
      // فرم 3: ترازنامه - دارایی‌ها
      // ===========================================
      {
        title: 'ترازنامه - دارایی‌ها',
        description: 'ثبت اطلاعات دارایی‌های شرکت (تمام مبالغ به میلیون ریال)',
        department: 'investment',
        category: 'financial_evaluation',
        fields: [
          {
            name: 'tangible_fixed_assets',
            label: 'دارایی ثابت مشهود',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 1146119',
            unit: 'میلیون ریال',
            helpText: 'زمین، ساختمان، ماشین‌آلات',
            variableName: 'tangible_fixed_assets'
          },
          {
            name: 'intangible_fixed_assets',
            label: 'دارایی ثابت نامشهود',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 629',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'حق اختراع، نرم‌افزار، سرقفلی',
            variableName: 'intangible_fixed_assets'
          },
          {
            name: 'long_term_investments',
            label: 'سرمایه‌گذاری‌های بلندمدت',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 70',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'سهام، اوراق، املاک',
            variableName: 'long_term_investments'
          },
          {
            name: 'prepayments',
            label: 'پیش‌پرداخت‌ها',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 211056',
            unit: 'میلیون ریال',
            helpText: 'پیش‌پرداخت به تأمین‌کنندگان',
            variableName: 'prepayments'
          },
          {
            name: 'inventory',
            label: 'موجودی مواد و کالا',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 1372562',
            unit: 'میلیون ریال',
            helpText: 'مواد اولیه + کالای نیمه‌ساخته + محصول نهایی',
            variableName: 'inventory'
          },
          {
            name: 'accounts_receivable',
            label: 'دریافتنی‌های تجاری و سایر دریافتنی‌ها',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 366912',
            unit: 'میلیون ریال',
            helpText: 'طلب از مشتریان',
            variableName: 'accounts_receivable'
          },
          {
            name: 'cash',
            label: 'موجودی نقد',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 828',
            unit: 'میلیون ریال',
            helpText: 'وجه نقد و بانک',
            variableName: 'cash'
          }
        ]
      },

      // ===========================================
      // فرم 4: ترازنامه - حقوق و بدهی‌ها
      // ===========================================
      {
        title: 'ترازنامه - حقوق مالکانه و بدهی‌ها',
        description: 'ثبت اطلاعات حقوق مالکانه و بدهی‌های شرکت (تمام مبالغ به میلیون ریال)',
        department: 'investment',
        category: 'financial_evaluation',
        fields: [
          {
            name: 'capital',
            label: 'سرمایه',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 450000',
            unit: 'میلیون ریال',
            helpText: 'سرمایه ثبت شده شرکت',
            variableName: 'capital'
          },
          {
            name: 'legal_reserve',
            label: 'اندوخته قانونی',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 5731',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'اندوخته قانونی 5% سود',
            variableName: 'legal_reserve'
          },
          {
            name: 'retained_earnings',
            label: 'سود (زیان) انباشته',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 129824',
            unit: 'میلیون ریال',
            helpText: 'سود انباشته از سال‌های قبل',
            variableName: 'retained_earnings'
          },
          {
            name: 'long_term_payables',
            label: 'پرداختنی‌های بلندمدت',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 750000',
            unit: 'میلیون ریال',
            helpText: 'وام و تسهیلات بلندمدت',
            variableName: 'long_term_payables'
          },
          {
            name: 'employee_benefits_reserve',
            label: 'ذخیره مزایای پایان خدمت کارکنان',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 12728',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'ذخیره پایان کار کارکنان',
            variableName: 'employee_benefits_reserve'
          },
          {
            name: 'accounts_payable',
            label: 'پرداختنی‌های تجاری و سایر پرداختنی‌ها',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 1079069',
            unit: 'میلیون ریال',
            helpText: 'بدهی به تأمین‌کنندگان',
            variableName: 'accounts_payable'
          },
          {
            name: 'short_term_facilities',
            label: 'تسهیلات مالی کوتاه‌مدت',
            type: 'currency',
            required: true,
            placeholder: 'مثال: 500835',
            unit: 'میلیون ریال',
            helpText: 'وام و تسهیلات کوتاه‌مدت',
            variableName: 'short_term_facilities'
          },
          {
            name: 'tax_payable',
            label: 'مالیات پرداختنی',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 13931',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'مالیات تعلق گرفته',
            variableName: 'tax_payable'
          },
          {
            name: 'advance_receipts',
            label: 'پیش‌دریافت‌ها',
            type: 'currency',
            required: false,
            placeholder: 'مثال: 156056',
            unit: 'میلیون ریال',
            defaultValue: '0',
            helpText: 'پیش‌دریافت از مشتریان',
            variableName: 'advance_receipts'
          }
        ]
      }
    ];

    const createdFormIds: number[] = [];

    // ایجاد فرم‌ها
    for (const form of forms) {
      try {
        // درج فرم در document_requirements
        const result = await db.execute(`
          INSERT OR IGNORE INTO document_requirements 
          (title, description, department, category, fields, is_required, is_active, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          form.title,
          form.description,
          form.department,
          form.category,
          JSON.stringify(form.fields),
          1, // is_required
          1, // is_active
          adminId
        ]);

        // دریافت ID فرم ایجاد شده
        const formResult = await db.execute(`
          SELECT id FROM document_requirements WHERE title = ?
        `, [form.title]);

        if (formResult.rows.length > 0) {
          const formId = (formResult.rows[0] as any).id;
          createdFormIds.push(formId);
          console.log(`  ✓ Created form: ${form.title} (ID: ${formId})`);
        }

      } catch (error) {
        console.warn(`⚠️ Could not create form ${form.title}:`, error);
      }
    }

    // ایجاد یا پیدا کردن سرویس "ارزیابی مالی"
    let serviceId: number | null = null;

    try {
      // بررسی وجود سرویس
      const serviceResult = await db.execute(`
        SELECT id FROM services WHERE title = ?
      `, ['ارزیابی مالی']);

      if (serviceResult.rows.length > 0) {
        serviceId = (serviceResult.rows[0] as any).id;
        console.log(`  ✓ Found existing service: ارزیابی مالی (ID: ${serviceId})`);
      } else {
        // ایجاد سرویس جدید
        await db.execute(`
          INSERT INTO services 
          (title, description, department, category, is_active, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'ارزیابی مالی',
          'ارزیابی جامع وضعیت مالی شرکت شامل صورت‌های مالی و نسبت‌های کلیدی',
          'investment',
          'evaluation',
          1,
          adminId
        ]);

        const newServiceResult = await db.execute(`
          SELECT id FROM services WHERE title = ?
        `, ['ارزیابی مالی']);

        if (newServiceResult.rows.length > 0) {
          serviceId = (newServiceResult.rows[0] as any).id;
          console.log(`  ✓ Created service: ارزیابی مالی (ID: ${serviceId})`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not create/find service:', error);
    }

    console.log('✓ All forms created with variableName in fields');

    // اتصال فرم‌ها به سرویس
    if (serviceId && createdFormIds.length > 0) {
      for (let i = 0; i < createdFormIds.length; i++) {
        const formId = createdFormIds[i];
        try {
          await db.execute(`
            INSERT OR IGNORE INTO service_document_requirements 
            (service_id, document_requirement_id, department, is_required, sort_order, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            serviceId,
            formId,
            'investment',
            1, // is_required
            i + 1, // sort_order
            adminId
          ]);
          console.log(`  ✓ Linked form ${formId} to service ${serviceId}`);
        } catch (error) {
          console.warn(`⚠️ Could not link form ${formId} to service:`, error);
        }
      }
    }

    console.log(`✅ Created ${forms.length} financial evaluation forms with variableName mapping`);

  } catch (error) {
    console.error('❌ Error creating financial evaluation forms:', error);
    // Don't throw to prevent startup failure
  }
}

