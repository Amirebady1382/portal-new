import { db } from "../db";

/**
 * Migration: Add performance indexes to improve query speed
 * 
 * This migration adds indexes on frequently queried columns:
 * - Foreign keys (for JOIN operations)
 * - Search fields (username, national_id, phone, etc.)
 * - Status fields (for filtering)
 * - Timestamps (for sorting)
 */
export async function addPerformanceIndexes(): Promise<void> {
  try {
    console.log("📊 Adding performance indexes...");

    // ====================================
    // Users table indexes
    // ====================================
    
    // Username is already UNIQUE, so it has an automatic index
    // But we add explicit ones for other frequently queried fields
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_role 
      ON users(role)
    `);
    console.log("✅ Index created: idx_users_role");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_department 
      ON users(department)
    `);
    console.log("✅ Index created: idx_users_department");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_phone 
      ON users(phone)
    `);
    console.log("✅ Index created: idx_users_phone");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active 
      ON users(is_active)
    `);
    console.log("✅ Index created: idx_users_is_active");

    // ====================================
    // Companies table indexes
    // ====================================
    
    // national_id is already UNIQUE with automatic index
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_companies_status 
      ON companies(status)
    `);
    console.log("✅ Index created: idx_companies_status");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_companies_primary_unit 
      ON companies(primary_unit)
    `);
    console.log("✅ Index created: idx_companies_primary_unit");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_companies_name 
      ON companies(name)
    `);
    console.log("✅ Index created: idx_companies_name");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_companies_created_at 
      ON companies(created_at DESC)
    `);
    console.log("✅ Index created: idx_companies_created_at");

    // ====================================
    // User-Companies relationship indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_companies_user_id 
      ON user_companies(user_id)
    `);
    console.log("✅ Index created: idx_user_companies_user_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_companies_company_id 
      ON user_companies(company_id)
    `);
    console.log("✅ Index created: idx_user_companies_company_id");

    // Composite index for the common query pattern
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_companies_user_company 
      ON user_companies(user_id, company_id)
    `);
    console.log("✅ Index created: idx_user_companies_user_company");

    // ====================================
    // Documents table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_company_id 
      ON documents(company_id)
    `);
    console.log("✅ Index created: idx_documents_company_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by 
      ON documents(uploaded_by_id)
    `);
    console.log("✅ Index created: idx_documents_uploaded_by");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_status 
      ON documents(status)
    `);
    console.log("✅ Index created: idx_documents_status");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_category 
      ON documents(category)
    `);
    console.log("✅ Index created: idx_documents_category");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_created_at 
      ON documents(created_at DESC)
    `);
    console.log("✅ Index created: idx_documents_created_at");

    // Composite index for common query: company + status
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_company_status 
      ON documents(company_id, status)
    `);
    console.log("✅ Index created: idx_documents_company_status");

    // ====================================
    // Conversations table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_company_id 
      ON conversations(company_id)
    `);
    console.log("✅ Index created: idx_conversations_company_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_employee_id 
      ON conversations(employee_id)
    `);
    console.log("✅ Index created: idx_conversations_employee_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_status 
      ON conversations(status)
    `);
    console.log("✅ Index created: idx_conversations_status");

    // Check if department column exists before creating index
    try {
      await db.execute(`SELECT department FROM conversations LIMIT 0`);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_conversations_department 
        ON conversations(department)
      `);
      console.log("✅ Index created: idx_conversations_department");
    } catch (error) {
      console.log("⚠️ Skipping idx_conversations_department - column does not exist");
    }

    // ====================================
    // Messages table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
      ON messages(conversation_id)
    `);
    console.log("✅ Index created: idx_messages_conversation_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
      ON messages(sender_id)
    `);
    console.log("✅ Index created: idx_messages_sender_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at 
      ON messages(created_at DESC)
    `);
    console.log("✅ Index created: idx_messages_created_at");

    // ====================================
    // Services table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_services_department 
      ON services(department)
    `);
    console.log("✅ Index created: idx_services_department");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_services_is_active 
      ON services(is_active)
    `);
    console.log("✅ Index created: idx_services_is_active");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_services_sort_order 
      ON services(sort_order ASC)
    `);
    console.log("✅ Index created: idx_services_sort_order");

    // ====================================
    // Service Requests table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_service_id 
      ON service_requests(service_id)
    `);
    console.log("✅ Index created: idx_service_requests_service_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_company_id 
      ON service_requests(company_id)
    `);
    console.log("✅ Index created: idx_service_requests_company_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_user_id 
      ON service_requests(user_id)
    `);
    console.log("✅ Index created: idx_service_requests_user_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to 
      ON service_requests(assigned_to)
    `);
    console.log("✅ Index created: idx_service_requests_assigned_to");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_status 
      ON service_requests(status)
    `);
    console.log("✅ Index created: idx_service_requests_status");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_created_at 
      ON service_requests(created_at DESC)
    `);
    console.log("✅ Index created: idx_service_requests_created_at");

    // Composite index for common filter patterns
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_service_requests_company_status 
      ON service_requests(company_id, status)
    `);
    console.log("✅ Index created: idx_service_requests_company_status");

    // ====================================
    // Form Submissions table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_requirement_id 
      ON form_submissions(requirement_id)
    `);
    console.log("✅ Index created: idx_form_submissions_requirement_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id 
      ON form_submissions(company_id)
    `);
    console.log("✅ Index created: idx_form_submissions_company_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id 
      ON form_submissions(user_id)
    `);
    console.log("✅ Index created: idx_form_submissions_user_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_status 
      ON form_submissions(status)
    `);
    console.log("✅ Index created: idx_form_submissions_status");

    // ====================================
    // Audit Logs table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
      ON audit_logs(user_id)
    `);
    console.log("✅ Index created: idx_audit_logs_user_id");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
      ON audit_logs(resource, resource_id)
    `);
    console.log("✅ Index created: idx_audit_logs_resource");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON audit_logs(created_at DESC)
    `);
    console.log("✅ Index created: idx_audit_logs_created_at");

    // ====================================
    // OTP Codes table indexes
    // ====================================
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_otp_codes_phone 
      ON otp_codes(phone)
    `);
    console.log("✅ Index created: idx_otp_codes_phone");

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_purpose 
      ON otp_codes(phone, purpose, is_used)
    `);
    console.log("✅ Index created: idx_otp_codes_phone_purpose");

    console.log("✅ All performance indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    throw error;
  }
}

