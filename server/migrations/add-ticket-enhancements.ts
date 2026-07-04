import { db } from "../db";

/**
 * Add priority, category, department and responseTime fields to conversations table
 */
export async function addTicketEnhancements() {
  console.log("🔄 اضافه کردن بهبودهای سیستم تیکتینگ...");
  
  try {
    // Add new columns to conversations table
    await db.execute(`
      ALTER TABLE conversations 
      ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'
    `);
    
    await db.execute(`
      ALTER TABLE conversations 
      ADD COLUMN category TEXT NOT NULL DEFAULT 'general'
    `);
    
    await db.execute(`
      ALTER TABLE conversations 
      ADD COLUMN department TEXT
    `);
    
    await db.execute(`
      ALTER TABLE conversations 
      ADD COLUMN response_time INTEGER
    `);
    
    console.log("✅ فیلدهای جدید تیکتینگ با موفقیت اضافه شدند");
    
    // Update existing conversations with default values if needed
    await db.execute(`
      UPDATE conversations 
      SET 
        priority = 'medium',
        category = 'general'
      WHERE priority IS NULL OR category IS NULL
    `);
    
    console.log("✅ تیکت‌های موجود به‌روزرسانی شدند");
    
  } catch (error) {
    console.error("❌ خطا در اضافه کردن بهبودهای تیکتینگ:", error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addTicketEnhancements()
    .then(() => {
      console.log("✅ Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
} 