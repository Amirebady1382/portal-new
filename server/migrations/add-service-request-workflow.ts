import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration: Create service_request_workflow table
 * 
 * این migration جدول workflow برای مدیریت گردش کار دو مرحله‌ای درخواست‌های خدمات را ایجاد می‌کند
 * 
 * Stages:
 * - investment_forms_pending: مشتری در حال پر کردن فرم‌های سرمایه‌گذاری
 * - investment_review: فرم‌های سرمایه‌گذاری تکمیل شده و در حال بررسی
 * - administrative_forms_pending: مشتری در حال پر کردن فرم‌های اداری
 * - administrative_review: فرم‌های اداری تکمیل شده و در حال بررسی
 * - completed: درخواست نهایی شده
 */
export async function up() {
  console.log("🔄 Creating service_request_workflow table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_request_workflow (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_request_id INTEGER NOT NULL UNIQUE,
      current_stage TEXT NOT NULL DEFAULT 'investment_forms_pending',
      investment_reviewed_by INTEGER,
      investment_reviewed_at TEXT,
      investment_notes TEXT,
      administrative_reviewed_by INTEGER,
      administrative_reviewed_at TEXT,
      administrative_notes TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      
      FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (investment_reviewed_by) REFERENCES users(id),
      FOREIGN KEY (administrative_reviewed_by) REFERENCES users(id)
    )
  `);

  // Create indexes for better performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_workflow_service_request_id 
    ON service_request_workflow(service_request_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_workflow_current_stage 
    ON service_request_workflow(current_stage)
  `);

  console.log("✅ service_request_workflow table created successfully");
}

export async function down() {
  console.log("🔄 Dropping service_request_workflow table...");

  await db.execute(sql`DROP INDEX IF EXISTS idx_workflow_current_stage`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_workflow_service_request_id`);
  await db.execute(sql`DROP TABLE IF EXISTS service_request_workflow`);

  console.log("✅ service_request_workflow table dropped successfully");
}

