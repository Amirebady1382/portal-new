import { db } from "../db";

export async function addOtpTable() {
  console.log("🔄 Adding OTP table...");
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      is_used BOOLEAN NOT NULL DEFAULT false,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  console.log("✅ OTP table created successfully");
} 