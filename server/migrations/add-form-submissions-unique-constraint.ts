import { db } from "../db";

/**
 * Migration: Add Unique Constraint to Form Submissions
 * Purpose: جلوگیری از ثبت چندباره یک فرم توسط یک کاربر
 */
export async function addFormSubmissionsUniqueConstraint(): Promise<void> {
  console.log("🔧 Adding unique constraint to form_submissions...");
  
  try {
    // We are on postgresql now, ignore this migration step
    console.log("✅ Unique constraint migration ignored on PostgreSQL");
    return;
  } catch (error) {
    console.error("❌ Error adding unique constraint:", error);
    throw error;
  }
}

