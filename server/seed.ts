import { storage } from "./storage";
import bcrypt from "bcrypt";

export async function seedDatabase() {
  try {
    console.log("🌱 شروع seed دیتابیس...");

    // Check if users already exist
    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length > 0) {
      console.log("✅ کاربران قبلاً ایجاد شده‌اند");
      
      // Update phone numbers for existing users
      console.log("📱 بروزرسانی شماره موبایل کاربران...");
      for (const user of existingUsers) {
        if (!user.phone) {
          await storage.updateUser(user.id, {
            phone: "09919252110"
          });
          console.log(`✅ شماره موبایل کاربر ${user.fullName} بروزرسانی شد`);
        }
      }
      return;
    }

    // Create default admin user with phone
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      role: "admin",
      fullName: "مدیر سیستم",
      phone: "09919252110",
      isActive: true,
    });

    // Create sample employee users
    const employeePassword = await bcrypt.hash("employee123", 10);
    
    await storage.createUser({
      username: "employee_investment",
      password: employeePassword,
      role: "employee",
      department: "investment",
      fullName: "کارشناس سرمایه‌گذاری",
      phone: "09919252110",
      isActive: true,
    });

    await storage.createUser({
      username: "employee_admin",
      password: employeePassword,
      role: "employee", 
      department: "administrative",
      fullName: "کارشناس اداری",
      phone: "09919252110",
      isActive: true,
    });

    // Create sample customer user
    const customerPassword = await bcrypt.hash("customer123", 10);
    
    await storage.createUser({
      username: "customer_test",
      password: customerPassword,
      role: "customer",
      fullName: "مشتری نمونه",
      phone: "09919252110",
      nationalId: "1234567890",
      email: "test@example.com",
      isActive: true,
    });

    console.log("✅ کاربران پیش‌فرض با شماره موبایل ایجاد شدند");
    console.log("🎉 Seed دیتابیس کامل شد");
  } catch (error) {
    console.error("❌ خطا در seed دیتابیس:", error);
    throw error;
  }
}

import { fileURLToPath } from "url";

if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js')) && !process.argv[1].includes('index.')) {
  (async () => {
    try {
      const { initializeDatabase, closeDatabase } = await import("./db");
      await initializeDatabase();
      await seedDatabase();
      await closeDatabase();
      console.log("👋 Done!");
      process.exit(0);
    } catch (e) {
      console.error("Fatal seed error:", e);
      process.exit(1);
    }
  })();
}

