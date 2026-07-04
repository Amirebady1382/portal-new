import { db } from "../db";

/**
 * Migration: Populate System Settings
 * Purpose: پر کردن تنظیمات اولیه سیستم
 */
export async function populateSystemSettings(): Promise<void> {
  console.log("🔧 Populating System Settings...");
  
  try {
    const now = new Date().toISOString();
    
    // تنظیمات اطلاعات صندوق
    const fundSettings = [
      {
        key: 'fund_name',
        value: 'صندوق پژوهش و فناوری غیردولتی گیلان',
        category: 'fund_info',
        description: 'نام رسمی صندوق',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'fund_registration_number',
        value: '',
        category: 'fund_info',
        description: 'شماره ثبت صندوق',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'fund_address',
        value: 'گیلان، رشت',
        category: 'fund_info',
        description: 'آدرس صندوق',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'fund_phone',
        value: '',
        category: 'fund_info',
        description: 'شماره تماس صندوق',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'fund_email',
        value: '',
        category: 'fund_info',
        description: 'ایمیل صندوق',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'fund_website',
        value: '',
        category: 'fund_info',
        description: 'وبسایت صندوق',
        dataType: 'text',
        isEditable: true
      }
    ];

    // تنظیمات AI و API
    const aiSettings = [
      {
        key: 'ai_default_model',
        value: 'claude-sonnet-4-20250514',
        category: 'ai_config',
        description: 'مدل پیش‌فرض Claude',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'ai_max_tokens',
        value: '8000',
        category: 'ai_config',
        description: 'حداکثر توکن برای پاسخ AI',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'ai_temperature',
        value: '0.3',
        category: 'ai_config',
        description: 'Temperature برای AI (0-1)',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'perplexity_model',
        value: 'sonar-deep-research',
        category: 'ai_config',
        description: 'مدل پیش‌فرض Perplexity',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'perplexity_enabled',
        value: 'true',
        category: 'ai_config',
        description: 'فعال‌سازی Perplexity برای تحقیق',
        dataType: 'boolean',
        isEditable: true
      }
    ];

    // تنظیمات قراردادها
    const contractSettings = [
      {
        key: 'contract_number_prefix',
        value: 'GF',
        category: 'contract_config',
        description: 'پیشوند شماره قرارداد',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'contract_default_duration',
        value: '12',
        category: 'contract_config',
        description: 'مدت پیش‌فرض قرارداد (ماه)',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'contract_auto_numbering',
        value: 'true',
        category: 'contract_config',
        description: 'شماره‌گذاری خودکار قراردادها',
        dataType: 'boolean',
        isEditable: true
      }
    ];

    // تنظیمات گزارش‌ها
    const reportSettings = [
      {
        key: 'report_number_prefix',
        value: 'EVA',
        category: 'report_config',
        description: 'پیشوند شماره گزارش ارزیابی',
        dataType: 'text',
        isEditable: true
      },
      {
        key: 'report_auto_approval',
        value: 'false',
        category: 'report_config',
        description: 'تایید خودکار گزارش‌ها',
        dataType: 'boolean',
        isEditable: true
      },
      {
        key: 'report_include_charts',
        value: 'true',
        category: 'report_config',
        description: 'شامل نمودارها در گزارش',
        dataType: 'boolean',
        isEditable: true
      }
    ];

    // تنظیمات امنیتی
    const securitySettings = [
      {
        key: 'session_timeout',
        value: '24',
        category: 'security',
        description: 'زمان انقضای نشست (ساعت)',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'max_login_attempts',
        value: '5',
        category: 'security',
        description: 'حداکثر تلاش ناموفق ورود',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'otp_expiry_minutes',
        value: '5',
        category: 'security',
        description: 'زمان اعتبار کد OTP (دقیقه)',
        dataType: 'number',
        isEditable: true
      }
    ];

    // تنظیمات سیستم
    const systemSettings = [
      {
        key: 'system_language',
        value: 'fa',
        category: 'system',
        description: 'زبان پیش‌فرض سیستم',
        dataType: 'text',
        isEditable: false
      },
      {
        key: 'system_timezone',
        value: 'Asia/Tehran',
        category: 'system',
        description: 'منطقه زمانی سیستم',
        dataType: 'text',
        isEditable: false
      },
      {
        key: 'max_file_upload_size',
        value: '10',
        category: 'system',
        description: 'حداکثر حجم آپلود فایل (مگابایت)',
        dataType: 'number',
        isEditable: true
      },
      {
        key: 'allowed_file_types',
        value: 'pdf,docx,xlsx,jpg,png',
        category: 'system',
        description: 'فرمت‌های مجاز فایل',
        dataType: 'text',
        isEditable: true
      }
    ];

    const allSettings = [
      ...fundSettings,
      ...aiSettings,
      ...contractSettings,
      ...reportSettings,
      ...securitySettings,
      ...systemSettings
    ];

    console.log(`📝 Inserting ${allSettings.length} system settings...`);

    for (const setting of allSettings) {
      try {
        // بررسی وجود تنظیم
        const existing = await db.execute(
          'SELECT id FROM system_settings WHERE key = ?',
          [setting.key]
        );

        if (existing.rows.length === 0) {
          // ایجاد تنظیم جدید
          await db.execute(
            `INSERT INTO system_settings 
             (key, value, category, description, data_type, is_editable, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              setting.key,
              setting.value,
              setting.category,
              setting.description,
              setting.dataType,
              setting.isEditable ? 1 : 0,
              now,
              now
            ]
          );
          console.log(`✅ Created setting: ${setting.key}`);
        } else {
          console.log(`⏭️ Skipped existing setting: ${setting.key}`);
        }
      } catch (error) {
        console.error(`❌ Error creating setting ${setting.key}:`, error);
      }
    }

    console.log("✨ System Settings populated successfully!");

  } catch (error) {
    console.error("❌ Error in populating system settings:", error);
    throw error;
  }
}

