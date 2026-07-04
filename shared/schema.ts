import { pgTable, text, integer, serial, boolean, timestamp, unique, varchar, bigint, jsonb, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("customer"), // admin, ceo, employee, customer
  department: varchar("department", { length: 100 }), // investment, administrative
  fullName: varchar("full_name", { length: 255 }).notNull(),
  nationalId: varchar("national_id", { length: 50 }), // شناسه ملی (فقط برای مشتری‌ها)
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  profileImage: text("profile_image"), // مسیر فایل تصویر پروفایل
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// OTP Codes table
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(), // 'login', 'register', 'reset'
  attempts: integer("attempts").notNull().default(0),
  isUsed: boolean("is_used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  nationalId: varchar("national_id", { length: 50 }).notNull().unique(), // 11-digit company national ID
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // شرکت خصوصی، تعاونی، etc.
  status: varchar("status", { length: 50 }).notNull().default("pending"), // active, pending, suspended, rejected, approved
  primaryUnit: varchar("primary_unit", { length: 100 }), // investment, administrative
  registrationNumber: varchar("registration_number", { length: 100 }),
  registrationDate: varchar("registration_date", { length: 50 }),
  capital: varchar("capital", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  establishedYear: integer("established_year"),
  employeeCount: integer("employee_count"),
  // Company information panels
  teamInfo: jsonb("team_info"), // JSON
  productInfo: jsonb("product_info"), // JSON
  marketInfo: jsonb("market_info"), // JSON
  financialInfo: jsonb("financial_info"), // JSON
  rasmioData: jsonb("rasmio_data"), // JSON
  aiAnalysisData: jsonb("ai_analysis_data"), // JSON
  signatories: jsonb("signatories"), // JSON: [{name, nationalId, position}] - حق امضاداران (حداکثر 2 نفر)
  // Financial Summary fields
  financialSummaryData: jsonb("financial_summary_data"), // JSON: extracted financial metrics from tax declaration
  taxDeclarationDocumentId: integer("tax_declaration_document_id").references((): AnyPgColumn => documents.id),
  financialSummaryStatus: varchar("financial_summary_status", { length: 50 }).default("pending"), // pending, processing, completed, error
  financialSummaryLastUpdated: timestamp("financial_summary_last_updated"),
  financialSummaryError: text("financial_summary_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User-Company relationship (for customer users)
export const userCompanies = pgTable("user_companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  isOwner: boolean("is_owner").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // طرح کسب و کار، صورت‌های مالی، etc.
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  filePath: text("file_path").notNull(),
  version: integer("version").notNull().default(1),
  metadata: jsonb("metadata"), // JSON
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => users.id),
  subject: text("subject"),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, closed, archived, pending
  priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low, medium, high, urgent
  category: varchar("category", { length: 100 }).notNull().default("general"), // technical, financial, administrative, general
  department: varchar("department", { length: 100 }), // investment, administrative
  lastMessageAt: timestamp("last_message_at"),
  responseTime: integer("response_time"), // زمان پاسخ به ثانیه
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 50 }).notNull().default("text"), // text, file, system
  attachmentPath: text("attachment_path"),
  status: varchar("status", { length: 50 }).notNull().default("sent"), // sent, delivered, read
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Document Requirements table (configurable by employees)
export const documentRequirements = pgTable("document_requirements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(), // investment, administrative
  category: varchar("category", { length: 100 }),
  description: text("description").notNull(),
  fields: jsonb("fields").notNull().default([]), // JSON
  isRequired: boolean("is_required").notNull().default(true),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  accessType: varchar("access_type", { length: 50 }).notNull().default("all"),
  createdBy: integer("created_by").references(() => users.id),
  serviceId: integer("service_id"), // Added this field as it was used in storage.ts
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NEW TABLE: نگاشت دسترسی فرم به شرکت‌های مجاز
export const documentRequirementAccess = pgTable("document_requirement_access", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").notNull().references(() => documentRequirements.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Form submissions table - stores customer form data
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").notNull().references(() => documentRequirements.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  formData: jsonb("form_data").notNull(), // JSON
  status: varchar("status", { length: 50 }).notNull().default("approved"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: هر کاربر فقط یکبار برای هر فرم و شرکت می‌تواند submit کند
  uniqueSubmission: unique().on(table.requirementId, table.companyId, table.userId)
}));

// Contract Templates table
export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // نوع قرارداد: ضمانت‌نامه، همکاری، etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  version: varchar("version", { length: 50 }).notNull().default("1.0"),
  variables: jsonb("variables"), // JSON - متغیرهای قابل جایگزینی
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contract Form Data table - stores form data for contracts
export const contractFormData = pgTable("contract_form_data", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  templateId: integer("template_id").notNull().references(() => contractTemplates.id),
  formType: varchar("form_type", { length: 100 }).notNull(), // guarantee, investment, etc.
  formData: jsonb("form_data").notNull(), // JSON - all form fields
  isComplete: boolean("is_complete").notNull().default(false),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // login, upload, download, etc.
  resource: varchar("resource", { length: 100 }).notNull(), // user, document, company, etc.
  resourceId: integer("resource_id"),
  details: jsonb("details"), // JSON
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System Settings table for configurable system parameters
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'fund_info', 'contract_defaults', 'financial_settings', etc.
  description: text("description"),
  isEditable: boolean("is_editable").notNull().default(true),
  dataType: varchar("data_type", { length: 50 }).notNull().default("text"), // text, number, boolean, json
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Services table - خدمات ارائه شده توسط واحدها
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // عنوان خدمت
  description: text("description"), // توضیحات خدمت
  department: varchar("department", { length: 100 }).notNull(), // investment, administrative
  category: varchar("category", { length: 100 }), // دسته‌بندی خدمت
  icon: varchar("icon", { length: 100 }), // آیکون خدمت
  estimatedDays: integer("estimated_days"), // زمان تخمینی انجام
  requirements: jsonb("requirements"), // الزامات و شرایط (JSON)
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Service Requests table - درخواست‌های خدمات توسط مشتریان
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id), // مشتری درخواست‌کننده
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, in_review, approved, rejected, completed
  priority: varchar("priority", { length: 50 }).notNull().default("normal"), // low, normal, high, urgent
  assignedTo: integer("assigned_to").references(() => users.id), // کارشناس مسئول
  requestData: jsonb("request_data"), // داده‌های اضافی درخواست (JSON)
  rejectionReason: text("rejection_reason"), // دلیل رد درخواست
  completedAt: timestamp("completed_at"), // تاریخ تکمیل
  dueDate: timestamp("due_date"), // تاریخ سررسید
  notes: text("notes"), // یادداشت‌های کارشناس
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Request Status History table - تاریخچه تغییرات وضعیت درخواست‌ها
export const requestStatusHistory = pgTable("request_status_history", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
  oldStatus: varchar("old_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  changedBy: integer("changed_by").notNull().references(() => users.id),
  notes: text("notes"), // یادداشت همراه با تغییر وضعیت
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Company Services Mapping table - اختصاص خدمات به شرکت‌ها
export const companyServices = pgTable("company_services", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  activatedBy: integer("activated_by").notNull().references(() => users.id), // کارمندی که فعال کرده
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"), // یادداشت‌های مرتبط
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint - هر خدمت فقط یکبار برای هر شرکت
  uniqueCompanyService: unique().on(table.companyId, table.serviceId)
}));

// Service Document Requirements Mapping table - اتصال many-to-many فرم‌ها به خدمات
export const serviceDocumentRequirements = pgTable("service_document_requirements", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  documentRequirementId: integer("document_requirement_id").notNull().references(() => documentRequirements.id, { onDelete: "cascade" }),
  department: varchar("department", { length: 100 }).notNull(), // investment, administrative - فرم برای کدام واحد این خدمت
  isRequired: boolean("is_required").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint - هر فرم فقط یکبار برای هر خدمت و واحد
  uniqueServiceForm: unique().on(table.serviceId, table.documentRequirementId, table.department)
}));

// Service Request Workflow table - مدیریت گردش کار دو مرحله‌ای درخواست‌ها
export const serviceRequestWorkflow = pgTable("service_request_workflow", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }).unique(),
  currentStage: varchar("current_stage", { length: 100 }).notNull().default("investment_forms_pending"),
  // Stages: investment_forms_pending, investment_review, administrative_forms_pending, administrative_review, completed
  investmentReviewedBy: integer("investment_reviewed_by").references(() => users.id),
  investmentReviewedAt: timestamp("investment_reviewed_at"),
  investmentNotes: text("investment_notes"),
  administrativeReviewedBy: integer("administrative_reviewed_by").references(() => users.id),
  administrativeReviewedAt: timestamp("administrative_reviewed_at"),
  administrativeNotes: text("administrative_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contract Variables table - for managing contract template variables
export const contractVariables = pgTable("contract_variables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(), // e.g., "company_name", "total_amount"
  label: varchar("label", { length: 255 }).notNull(), // e.g., "نام شرکت", "مبلغ کل"
  description: text("description"), // توضیحات اضافی
  dataType: varchar("data_type", { length: 50 }).notNull().default("text"), // text, number, date, boolean
  source: varchar("source", { length: 50 }).notNull().default("form"), // form, rasmio, calculated, system
  defaultValue: text("default_value"), // مقدار پیش‌فرض
  isRequired: boolean("is_required").notNull().default(false),
  validationRules: jsonb("validation_rules"), // JSON - قوانین اعتبارسنجی
  placeholder: varchar("placeholder", { length: 255 }), // راهنمای placeholder
  category: varchar("category", { length: 100 }), // دسته‌بندی متغیرها: company_info, financial, dates, etc.
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0), // برای مرتب‌سازی در فرم
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contract Variable Mappings table - maps variables to contract templates
export const contractVariableMappings = pgTable("contract_variable_mappings", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => contractTemplates.id, { onDelete: "cascade" }),
  variableId: integer("variable_id").notNull().references(() => contractVariables.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").notNull().default(false), // برای این template خاص
  defaultValue: text("default_value"), // مقدار پیش‌فرض خاص این template
  sortOrder: integer("sort_order").default(0), // ترتیب نمایش در فرم
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint - هر متغیر فقط یکبار برای هر template
  uniqueMapping: unique().on(table.templateId, table.variableId)
}));

// Bale Employee Mappings table - maps Bale chat IDs to employees
export const baleEmployeeMappings = pgTable("bale_employee_mappings", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baleChatId: varchar("bale_chat_id", { length: 100 }).notNull().unique(),
  baleUserId: varchar("bale_user_id", { length: 100 }), // اختیاری - ممکن است بعداً پر شود
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"), // یادداشت‌های ادمین
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Bale Chat System Tables
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const authorizedPhones = pgTable("authorized_phones", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 15 }).notNull(),
  employeeName: varchar("employee_name", { length: 100 }),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const baleUsers = pgTable("bale_users", {
  id: serial("id").primaryKey(),
  baleUserId: varchar("bale_user_id", { length: 100 }).unique().notNull(),
  baleChatId: varchar("bale_chat_id", { length: 100 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  username: varchar("username", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 15 }),
  departmentId: integer("department_id").references(() => departments.id),
  isAuthenticated: boolean("is_authenticated").default(false).notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const baleConversations = pgTable("bale_conversations", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  customerName: varchar("customer_name", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 15 }),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, closed, archived
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const baleMessages = pgTable("bale_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => baleConversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"), // text, file, image
  platform: varchar("platform", { length: 10 }).notNull().default("web"), // web, bale
  senderType: varchar("sender_type", { length: 10 }).notNull().default("customer"), // customer, staff
  baleUserId: integer("bale_user_id").references(() => baleUsers.id),
  isDelivered: boolean("is_delivered").default(false).notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// Financial Formulas System Tables
export const financialFormulas = pgTable("financial_formulas", {
  id: serial("id").primaryKey(),
  variableId: integer("variable_id").notNull(), // ارجاع به investment_report_variables
  formulaExpression: text("formula_expression").notNull(), // e.g., "revenue + cost_of_goods_sold"
  description: text("description"),
  executionOrder: integer("execution_order").notNull().default(0), // ترتیب اجرا (1-33)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const formulaDependencies = pgTable("formula_dependencies", {
  id: serial("id").primaryKey(),
  formulaId: integer("formula_id").notNull().references(() => financialFormulas.id, { onDelete: "cascade" }),
  dependsOnVariableId: integer("depends_on_variable_id").notNull(), // variable که این فرمول به آن وابسته است
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint - هر فرمول فقط یکبار به یک متغیر وابسته
  uniqueDependency: unique().on(table.formulaId, table.dependsOnVariableId)
}));

// Missing tables added below

// AI Chat Sessions
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  serviceId: integer("service_id").references(() => services.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI Chat Messages
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => aiChatSessions.id, { onDelete: "cascade" }),
  messageType: varchar("message_type", { length: 20 }).notNull(), // user, ai
  content: text("content").notNull(),
  attachments: jsonb("attachments"), // JSON
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Employee Bale Settings
export const employeeBaleSettings = pgTable("employee_bale_settings", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baleChatId: varchar("bale_chat_id", { length: 100 }),
  baleUserId: varchar("bale_user_id", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  departmentFilter: text("department_filter"),
  lastActivity: timestamp("last_activity"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Variable Form Field Mappings
export const variableFormFieldMappings = pgTable("variable_form_field_mappings", {
  id: serial("id").primaryKey(),
  variableId: integer("variable_id").notNull().references(() => contractVariables.id, { onDelete: "cascade" }),
  requirementId: integer("requirement_id").notNull().references(() => documentRequirements.id, { onDelete: "cascade" }),
  fieldName: varchar("field_name", { length: 255 }).notNull(),
  priority: integer("priority").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Investment Report Templates
export const investmentReportTemplates = pgTable("investment_report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("general"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").default(0),
  variables: text("variables"), // JSON string
  sections: text("sections"), // JSON string
  chartConfigs: text("chart_configs"), // JSON string
  version: varchar("version", { length: 50 }).default("1.0"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Generated Investment Reports
export const investmentReports = pgTable("generated_investment_reports", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  templateId: integer("template_id").notNull().references(() => investmentReportTemplates.id),
  reportNumber: text("report_number").notNull().unique(),
  reportType: varchar("report_type", { length: 50 }).default("evaluation"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").default(0),
  fileFormat: varchar("file_format", { length: 10 }).default("docx"),
  reportData: text("report_data"), // JSON
  scores: text("scores"), // JSON
  recommendations: text("recommendations"), // JSON
  chartsData: text("charts_data"), // JSON
  status: varchar("status", { length: 50 }).default("draft"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  version: integer("version").default(1),
  parentReportId: integer("parent_report_id"), // removed self reference to avoid circular dependency in definition or undefined variable
  generatedBy: integer("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  // New fields
  verificationHash: text("verification_hash").unique(),
  isPublic: boolean("is_public").default(false),
});

// Investment Report Variables
export const investmentReportVariables = pgTable("investment_report_variables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  source: varchar("source", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations (same as SQLite version)
export const usersRelations = relations(users, ({ many }) => ({
  companies: many(userCompanies),
  uploadedDocuments: many(documents),
  sentMessages: many(messages),
  auditLogs: many(auditLogs),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(userCompanies),
  documents: many(documents),
  conversations: many(conversations),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, {
    fields: [userCompanies.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userCompanies.companyId],
    references: [companies.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  company: one(companies, {
    fields: [documents.companyId],
    references: [companies.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  company: one(companies, {
    fields: [conversations.companyId],
    references: [companies.id],
  }),
  employee: one(users, {
    fields: [conversations.employeeId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [services.createdBy],
    references: [users.id],
  }),
  requirements: many(documentRequirements),
  serviceRequests: many(serviceRequests),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  service: one(services, {
    fields: [serviceRequests.serviceId],
    references: [services.id],
  }),
  company: one(companies, {
    fields: [serviceRequests.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [serviceRequests.userId],
    references: [users.id],
  }),
  assignedEmployee: one(users, {
    fields: [serviceRequests.assignedTo],
    references: [users.id],
  }),
  statusHistory: many(requestStatusHistory),
  workflow: one(serviceRequestWorkflow, {
    fields: [serviceRequests.id],
    references: [serviceRequestWorkflow.serviceRequestId],
  }),
}));

export const requestStatusHistoryRelations = relations(requestStatusHistory, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestStatusHistory.requestId],
    references: [serviceRequests.id],
  }),
  changedBy: one(users, {
    fields: [requestStatusHistory.changedBy],
    references: [users.id],
  }),
}));

export const documentRequirementsRelations = relations(documentRequirements, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [documentRequirements.createdBy],
    references: [users.id],
  }),
  formSubmissions: many(formSubmissions),
  accessList: many(documentRequirementAccess),
}));

export const documentRequirementAccessRelations = relations(documentRequirementAccess, ({ one }) => ({
  requirement: one(documentRequirements, {
    fields: [documentRequirementAccess.requirementId],
    references: [documentRequirements.id],
  }),
  company: one(companies, {
    fields: [documentRequirementAccess.companyId],
    references: [companies.id],
  }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  requirement: one(documentRequirements, {
    fields: [formSubmissions.requirementId],
    references: [documentRequirements.id],
  }),
  company: one(companies, {
    fields: [formSubmissions.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [formSubmissions.userId],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [formSubmissions.reviewedBy],
    references: [users.id],
  }),
}));

export const contractTemplatesRelations = relations(contractTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [contractTemplates.createdBy],
    references: [users.id],
  }),
  formData: many(contractFormData),
}));

export const contractFormDataRelations = relations(contractFormData, ({ one }) => ({
  company: one(companies, {
    fields: [contractFormData.companyId],
    references: [companies.id],
  }),
  template: one(contractTemplates, {
    fields: [contractFormData.templateId],
    references: [contractTemplates.id],
  }),
  createdByUser: one(users, {
    fields: [contractFormData.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [contractFormData.updatedBy],
    references: [users.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  authorizedPhones: many(authorizedPhones),
  baleUsers: many(baleUsers),
  conversations: many(baleConversations),
}));

export const authorizedPhonesRelations = relations(authorizedPhones, ({ one }) => ({
  department: one(departments, {
    fields: [authorizedPhones.departmentId],
    references: [departments.id],
  }),
}));

export const baleUsersRelations = relations(baleUsers, ({ one, many }) => ({
  department: one(departments, {
    fields: [baleUsers.departmentId],
    references: [departments.id],
  }),
  messages: many(baleMessages),
}));

export const baleConversationsRelations = relations(baleConversations, ({ one, many }) => ({
  department: one(departments, {
    fields: [baleConversations.departmentId],
    references: [departments.id],
  }),
  messages: many(baleMessages),
}));

export const baleMessagesRelations = relations(baleMessages, ({ one }) => ({
  conversation: one(baleConversations, {
    fields: [baleMessages.conversationId],
    references: [baleConversations.id],
  }),
  baleUser: one(baleUsers, {
    fields: [baleMessages.baleUserId],
    references: [baleUsers.id],
  }),
}));

export const contractVariablesRelations = relations(contractVariables, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [contractVariables.createdBy],
    references: [users.id],
  }),
  mappings: many(contractVariableMappings),
}));

export const contractVariableMappingsRelations = relations(contractVariableMappings, ({ one }) => ({
  template: one(contractTemplates, {
    fields: [contractVariableMappings.templateId],
    references: [contractTemplates.id],
  }),
  variable: one(contractVariables, {
    fields: [contractVariableMappings.variableId],
    references: [contractVariables.id],
  }),
}));

export const baleEmployeeMappingsRelations = relations(baleEmployeeMappings, ({ one }) => ({
  employee: one(users, {
    fields: [baleEmployeeMappings.employeeId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [baleEmployeeMappings.createdBy],
    references: [users.id],
  }),
}));

export const financialFormulasRelations = relations(financialFormulas, ({ many }) => ({
  dependencies: many(formulaDependencies),
}));

export const formulaDependenciesRelations = relations(formulaDependencies, ({ one }) => ({
  formula: one(financialFormulas, {
    fields: [formulaDependencies.formulaId],
    references: [financialFormulas.id],
  }),
}));

export const serviceRequestWorkflowRelations = relations(serviceRequestWorkflow, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [serviceRequestWorkflow.serviceRequestId],
    references: [serviceRequests.id],
  }),
  investmentReviewer: one(users, {
    fields: [serviceRequestWorkflow.investmentReviewedBy],
    references: [users.id],
  }),
  administrativeReviewer: one(users, {
    fields: [serviceRequestWorkflow.administrativeReviewedBy],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  role: z.enum(["admin", "ceo", "employee", "customer"]),
});
export const insertCompanySchema = createInsertSchema(companies);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertMessageSchema = createInsertSchema(messages);
export const insertConversationSchema = createInsertSchema(conversations);
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions);
export const insertContractTemplateSchema = createInsertSchema(contractTemplates);
export const insertContractFormDataSchema = createInsertSchema(contractFormData);
export const insertDocumentRequirementAccessSchema = createInsertSchema(documentRequirementAccess);
export const insertSystemSettingSchema = createInsertSchema(systemSettings);
export const insertServiceSchema = createInsertSchema(services);
export const insertServiceRequestSchema = createInsertSchema(serviceRequests);
export const insertRequestStatusHistorySchema = createInsertSchema(requestStatusHistory);
export const insertDepartmentSchema = createInsertSchema(departments);
export const insertAuthorizedPhoneSchema = createInsertSchema(authorizedPhones);
export const insertBaleUserSchema = createInsertSchema(baleUsers);
export const insertBaleConversationSchema = createInsertSchema(baleConversations);
export const insertBaleMessageSchema = createInsertSchema(baleMessages);
export const insertOtpCodeSchema = createInsertSchema(otpCodes);
export const insertContractVariableSchema = createInsertSchema(contractVariables);
export const insertContractVariableMappingSchema = createInsertSchema(contractVariableMappings);
export const insertBaleEmployeeMappingSchema = createInsertSchema(baleEmployeeMappings);
export const insertCompanyServiceSchema = createInsertSchema(companyServices);
export const insertServiceDocumentRequirementSchema = createInsertSchema(serviceDocumentRequirements);
export const insertFinancialFormulaSchema = createInsertSchema(financialFormulas);
export const insertFormulaDependencySchema = createInsertSchema(formulaDependencies);
export const insertServiceRequestWorkflowSchema = createInsertSchema(serviceRequestWorkflow);

// Added missing schemas
export const insertAIChatSessionSchema = createInsertSchema(aiChatSessions);
export const insertAIChatMessageSchema = createInsertSchema(aiChatMessages);
export const insertEmployeeBaleSettingsSchema = createInsertSchema(employeeBaleSettings);
export const insertVariableFormFieldMappingSchema = createInsertSchema(variableFormFieldMappings);
export const insertInvestmentReportVariableSchema = createInsertSchema(investmentReportVariables);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type UserCompany = typeof userCompanies.$inferSelect;
export type DocumentRequirement = typeof documentRequirements.$inferSelect;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;
export type ContractFormData = typeof contractFormData.$inferSelect;
export type InsertContractFormData = typeof contractFormData.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = typeof formSubmissions.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
export type DocumentRequirementAccess = typeof documentRequirementAccess.$inferSelect;
export type InsertDocumentRequirementAccess = z.infer<typeof insertDocumentRequirementAccessSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type RequestStatusHistory = typeof requestStatusHistory.$inferSelect;
export type InsertRequestStatusHistory = z.infer<typeof insertRequestStatusHistorySchema>;
export type Department = typeof departments.$inferSelect;
export type AuthorizedPhone = typeof authorizedPhones.$inferSelect;
export type BaleUser = typeof baleUsers.$inferSelect;
export type BaleConversation = typeof baleConversations.$inferSelect;
export type BaleMessage = typeof baleMessages.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type ContractVariable = typeof contractVariables.$inferSelect;
export type ContractVariableMapping = typeof contractVariableMappings.$inferSelect;
export type BaleEmployeeMapping = typeof baleEmployeeMappings.$inferSelect;
export type CompanyService = typeof companyServices.$inferSelect;
export type ServiceDocumentRequirement = typeof serviceDocumentRequirements.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type InsertContractVariable = z.infer<typeof insertContractVariableSchema>;
export type InsertContractVariableMapping = z.infer<typeof insertContractVariableMappingSchema>;
export type InsertBaleEmployeeMapping = z.infer<typeof insertBaleEmployeeMappingSchema>;
export type InsertCompanyService = z.infer<typeof insertCompanyServiceSchema>;
export type InsertServiceDocumentRequirement = z.infer<typeof insertServiceDocumentRequirementSchema>;
export type FinancialFormula = typeof financialFormulas.$inferSelect;
export type InsertFinancialFormula = z.infer<typeof insertFinancialFormulaSchema>;
export type FormulaDependency = typeof formulaDependencies.$inferSelect;
export type InsertFormulaDependency = z.infer<typeof insertFormulaDependencySchema>;
export type ServiceRequestWorkflow = typeof serviceRequestWorkflow.$inferSelect;
export type InsertServiceRequestWorkflow = z.infer<typeof insertServiceRequestWorkflowSchema>;

export type AIChatSession = typeof aiChatSessions.$inferSelect;
export type AIChatMessage = typeof aiChatMessages.$inferSelect;
export type EmployeeBaleSettings = typeof employeeBaleSettings.$inferSelect;
export type VariableFormFieldMapping = typeof variableFormFieldMappings.$inferSelect;
export type InvestmentReportVariable = typeof investmentReportVariables.$inferSelect;

export type InsertAIChatSession = z.infer<typeof insertAIChatSessionSchema>;
export type InsertAIChatMessage = z.infer<typeof insertAIChatMessageSchema>;
export type InsertEmployeeBaleSettings = z.infer<typeof insertEmployeeBaleSettingsSchema>;
export type InsertVariableFormFieldMapping = z.infer<typeof insertVariableFormFieldMappingSchema>;
export type InsertInvestmentReportVariable = z.infer<typeof insertInvestmentReportVariableSchema>;

// Investment Reports Relations
export const investmentReportTemplatesRelations = relations(investmentReportTemplates, ({ one }) => ({
  createdByUser: one(users, {
    fields: [investmentReportTemplates.createdBy],
    references: [users.id],
  }),
}));

export const investmentReportsRelations = relations(investmentReports, ({ one }) => ({
  company: one(companies, {
    fields: [investmentReports.companyId],
    references: [companies.id],
  }),
  template: one(investmentReportTemplates, {
    fields: [investmentReports.templateId],
    references: [investmentReportTemplates.id],
  }),
  generatedByUser: one(users, {
    fields: [investmentReports.generatedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [investmentReports.approvedBy],
    references: [users.id],
  }),
}));

export const insertInvestmentReportTemplateSchema = createInsertSchema(investmentReportTemplates);
export const insertInvestmentReportSchema = createInsertSchema(investmentReports);

export type InvestmentReportTemplate = typeof investmentReportTemplates.$inferSelect;
export type InsertInvestmentReportTemplate = z.infer<typeof insertInvestmentReportTemplateSchema>;
export type InvestmentReport = typeof investmentReports.$inferSelect;
export type InsertInvestmentReport = z.infer<typeof insertInvestmentReportSchema>;

export type SafeUser = Omit<User, 'password'>;
