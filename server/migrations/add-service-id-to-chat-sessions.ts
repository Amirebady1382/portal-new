import { db } from '../db';

/**
 * Migration: Add service_id to AI Chat Sessions
 * Purpose: ذخیره خدمت مورد تمرکز برای هر session چت
 */
export async function addServiceIdToChatSessions() {
  try {
    console.log('🔧 Adding service_id column to ai_chat_sessions...');

    // We are on PostgreSQL now, skipping PRAGMA check
    console.log("✅ addServiceIdToChatSessions migration skipped on PostgreSQL");
    return;
  } catch (error) {
    console.error('❌ Error adding service_id to ai_chat_sessions:', error);
    throw error;
  }
}

