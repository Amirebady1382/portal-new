import { db } from "./db";
import { addSystemSettings } from "./migrations/add-system-settings";
import { addCeoRole } from "./migrations/add-ceo-role";
import { addServicesSystem } from "./migrations/add-services-system";
import { addInvestmentReportsSystem } from "./migrations/add-investment-reports-system";
import { addCompanyServicesMapping } from "./migrations/add-company-services-mapping";
import { addServiceFormsMapping } from "./migrations/add-service-forms-mapping";
import { populateSystemSettings } from "./migrations/populate-system-settings";
import { addFormSubmissionsUniqueConstraint } from "./migrations/add-form-submissions-unique-constraint";
import { addServiceIdToChatSessions } from "./migrations/add-service-id-to-chat-sessions";

export async function runMigrations() {
  try {
    console.log("🔄 اجرای migration ها...");

    // بررسی وجود فیلد national_id در جدول users
    try {
      await db.execute("SELECT national_id FROM users LIMIT 1");
      console.log("✅ فیلد national_id قبلاً وجود دارد");
    } catch (error) {
      // اگر فیلد وجود ندارد، آن را اضافه کن
      console.log("📝 اضافه کردن فیلد national_id به جدول users...");
      await db.execute("ALTER TABLE users ADD COLUMN national_id TEXT");
      console.log("✅ فیلد national_id با موفقیت اضافه شد");
    }

    // بررسی وجود فیلد profile_image در جدول users
    try {
      await db.execute("SELECT profile_image FROM users LIMIT 1");
      console.log("✅ فیلد profile_image قبلاً وجود دارد");
    } catch (error) {
      // اگر فیلد وجود ندارد، آن را اضافه کن
      console.log("📝 اضافه کردن فیلد profile_image به جدول users...");
      await db.execute("ALTER TABLE users ADD COLUMN profile_image TEXT");
      console.log("✅ فیلد profile_image با موفقیت اضافه شد");
    }

    // بررسی وجود فیلد access_type در جدول document_requirements
    try {
      await db.execute("SELECT access_type FROM document_requirements LIMIT 1");
      console.log("✅ فیلد access_type قبلاً وجود دارد");
    } catch (error) {
      console.log("📝 اضافه کردن فیلد access_type به جدول document_requirements...");
      await db.execute("ALTER TABLE document_requirements ADD COLUMN access_type TEXT NOT NULL DEFAULT 'all'");
      console.log("✅ فیلد access_type با موفقیت اضافه شد");
    }

    // بررسی وجود جدول document_requirement_access
    try {
      await db.execute("SELECT 1 FROM document_requirement_access LIMIT 1");
      console.log("✅ جدول document_requirement_access قبلاً وجود دارد");
    } catch (error) {
      console.log("📝 ایجاد جدول document_requirement_access...");
      await db.execute(`CREATE TABLE document_requirement_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requirement_id INTEGER NOT NULL REFERENCES document_requirements(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      console.log("✅ جدول document_requirement_access با موفقیت ایجاد شد");
    }

    // بررسی وجود جدول system_settings
    try {
      await db.execute("SELECT 1 FROM system_settings LIMIT 1");
      console.log("✅ جدول system_settings قبلاً وجود دارد");
    } catch (error) {
      console.log("📝 ایجاد جدول system_settings و پر کردن داده‌های اولیه...");
      await addSystemSettings();
      console.log("✅ جدول system_settings با موفقیت ایجاد شد");
    }

    // بررسی و اضافه کردن سطح دسترسی CEO
    try {
      await db.execute("SELECT 1 FROM users WHERE role = 'ceo' LIMIT 1");
      console.log("✅ سطح دسترسی CEO قبلاً تنظیم شده است");
    } catch (error) {
      console.log("📝 اضافه کردن سطح دسترسی CEO و کاربر moradi...");
      await addCeoRole();
      console.log("✅ سطح دسترسی CEO با موفقیت اضافه شد");
    }

    // بررسی وجود جدول investment_report_templates
    try {
      await db.execute("SELECT 1 FROM investment_report_templates LIMIT 1");
      console.log("✅ سیستم گزارش‌های ارزیابی قبلاً راه‌اندازی شده است");
    } catch (error) {
      console.log("📝 راه‌اندازی سیستم گزارش‌های ارزیابی سرمایه‌گذاری...");
      await addInvestmentReportsSystem();
      console.log("✅ سیستم گزارش‌های ارزیابی با موفقیت راه‌اندازی شد");
    }

    // بررسی وجود جدول services
    try {
      await db.execute("SELECT 1 FROM services LIMIT 1");
      console.log("✅ سیستم خدمات قبلاً راه‌اندازی شده است");
    } catch (error) {
      console.log("📝 راه‌اندازی سیستم خدمات و درخواست‌ها...");
      await addServicesSystem();
      console.log("✅ سیستم خدمات با موفقیت راه‌اندازی شد");
    }

    // بررسی وجود جدول company_services
    try {
      await db.execute("SELECT 1 FROM company_services LIMIT 1");
      console.log("✅ جدول اختصاص خدمات به شرکت‌ها قبلاً وجود دارد");
    } catch (error) {
      console.log("📝 ایجاد جدول اختصاص خدمات به شرکت‌ها...");
      await addCompanyServicesMapping();
      console.log("✅ جدول اختصاص خدمات به شرکت‌ها با موفقیت ایجاد شد");
    }

    // بررسی وجود جدول service_document_requirements
    try {
      await db.execute("SELECT 1 FROM service_document_requirements LIMIT 1");
      console.log("✅ جدول اتصال فرم‌ها به خدمات قبلاً وجود دارد");
    } catch (error) {
      console.log("📝 ایجاد جدول اتصال فرم‌ها به خدمات...");
      await addServiceFormsMapping();
      console.log("✅ جدول اتصال فرم‌ها به خدمات با موفقیت ایجاد شد");
    }

    // پر کردن تنظیمات پیش‌فرض سیستم
    console.log("📝 بررسی و پر کردن تنظیمات سیستم...");
    await populateSystemSettings();
    console.log("✅ تنظیمات سیستم بروزرسانی شد");

    // اضافه کردن unique constraint به form submissions
    console.log("📝 اضافه کردن unique constraint به form submissions...");
    await addFormSubmissionsUniqueConstraint();
    console.log("✅ Unique constraint اضافه شد");

    // اضافه کردن service_id به ai_chat_sessions
    console.log("📝 اضافه کردن service_id به ai_chat_sessions...");
    await addServiceIdToChatSessions();
    console.log("✅ service_id به ai_chat_sessions اضافه شد");

    console.log("🎉 Migration ها با موفقیت انجام شد");
  } catch (error) {
    console.error("❌ خطا در اجرای migration:", error);
    throw error;
  }
} 