import { db } from "../db";

/**
 * Migration: Add CEO Role
 * اضافه کردن سطح دسترسی مدیرعامل (CEO) به سیستم
 */

export async function addCeoRole() {
  try {
    console.log("🔄 شروع اضافه کردن سطح دسترسی CEO...");

    // بررسی وجود کاربر با نقش CEO
    const existingCeos = await db.execute(
      "SELECT COUNT(*) as count FROM users WHERE role = 'ceo'"
    );
    
    console.log(`📊 تعداد کاربران CEO موجود: ${existingCeos.rows[0].count}`);

    // ایجاد کاربر moradi با دسترسی CEO
    const checkUser = await db.execute(
      "SELECT id FROM users WHERE username = 'moradi'"
    );

    if (checkUser.rows.length === 0) {
      // Hash password (در واقعیت باید از bcrypt استفاده شود)
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("123", 10);

      await db.execute(`
        INSERT INTO users (
          username, 
          password, 
          role, 
          full_name, 
          phone, 
          email,
          is_active
        ) VALUES (
          'moradi',
          '${hashedPassword}',
          'ceo',
          'مدیر عامل صندوق',
          '09919252110',
          'ceo@gfund.ir',
          1
        )
      `);
      
      console.log("✅ کاربر moradi با نقش CEO ایجاد شد");
    } else {
      // اگر کاربر وجود دارد، نقش آن را به CEO تغییر دهیم
      await db.execute(`
        UPDATE users 
        SET role = 'ceo', 
            phone = '09919252110',
            full_name = 'مدیر عامل صندوق'
        WHERE username = 'moradi'
      `);
      
      console.log("✅ نقش کاربر moradi به CEO تغییر یافت");
    }

    console.log("🎉 Migration سطح دسترسی CEO با موفقیت انجام شد");
  } catch (error) {
    console.error("❌ خطا در اضافه کردن سطح دسترسی CEO:", error);
    throw error;
  }
}
