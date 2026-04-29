CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" integer,
	"details" text,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorized_phones" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"employee_name" varchar(100),
	"department_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bale_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"customer_name" varchar(100),
	"customer_phone" varchar(15),
	"department_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bale_employee_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"bale_chat_id" varchar(100) NOT NULL,
	"bale_user_id" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bale_employee_mappings_bale_chat_id_unique" UNIQUE("bale_chat_id")
);
--> statement-breakpoint
CREATE TABLE "bale_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"platform" varchar(10) DEFAULT 'web' NOT NULL,
	"sender_type" varchar(10) DEFAULT 'customer' NOT NULL,
	"bale_user_id" integer,
	"is_delivered" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bale_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"bale_user_id" varchar(100) NOT NULL,
	"bale_chat_id" varchar(100) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"username" varchar(100),
	"phone_number" varchar(15),
	"department_id" integer,
	"is_authenticated" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bale_users_bale_user_id_unique" UNIQUE("bale_user_id"),
	CONSTRAINT "bale_users_bale_chat_id_unique" UNIQUE("bale_chat_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"national_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"primary_unit" varchar(100),
	"registration_number" varchar(100),
	"registration_date" varchar(50),
	"capital" varchar(100),
	"address" text,
	"city" varchar(100),
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"description" text,
	"established_year" integer,
	"employee_count" integer,
	"team_info" text,
	"product_info" text,
	"market_info" text,
	"financial_info" text,
	"rasmio_data" text,
	"ai_analysis_data" text,
	"signatories" text,
	"financial_summary_data" text,
	"tax_declaration_document_id" integer,
	"financial_summary_status" varchar(50) DEFAULT 'pending',
	"financial_summary_last_updated" timestamp,
	"financial_summary_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE "company_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"activated_by" integer NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_services_company_id_service_id_unique" UNIQUE("company_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "contract_form_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"form_type" varchar(100) NOT NULL,
	"form_data" text NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" bigint NOT NULL,
	"version" varchar(50) DEFAULT '1.0' NOT NULL,
	"variables" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_variable_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"variable_id" integer NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"default_value" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_variable_mappings_template_id_variable_id_unique" UNIQUE("template_id","variable_id")
);
--> statement-breakpoint
CREATE TABLE "contract_variables" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"data_type" varchar(50) DEFAULT 'text' NOT NULL,
	"source" varchar(50) DEFAULT 'form' NOT NULL,
	"default_value" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"validation_rules" text,
	"placeholder" varchar(255),
	"category" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_variables_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"employee_id" integer,
	"subject" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"department" varchar(100),
	"last_message_at" timestamp,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "document_requirement_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"requirement_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"department" varchar(100) NOT NULL,
	"category" varchar(100),
	"description" text NOT NULL,
	"fields" text DEFAULT '[]' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_type" varchar(50) DEFAULT 'all' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"uploaded_by_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"file_path" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_formulas" (
	"id" serial PRIMARY KEY NOT NULL,
	"variable_id" integer NOT NULL,
	"formula_expression" text NOT NULL,
	"description" text,
	"execution_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"requirement_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"form_data" text NOT NULL,
	"status" varchar(50) DEFAULT 'approved' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_submissions_requirement_id_company_id_user_id_unique" UNIQUE("requirement_id","company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "formula_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"formula_id" integer NOT NULL,
	"depends_on_variable_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "formula_dependencies_formula_id_depends_on_variable_id_unique" UNIQUE("formula_id","depends_on_variable_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text' NOT NULL,
	"attachment_path" text,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(10) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"old_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"changed_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_document_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"document_requirement_id" integer NOT NULL,
	"department" varchar(100) NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_document_requirements_service_id_document_requirement_id_department_unique" UNIQUE("service_id","document_requirement_id","department")
);
--> statement-breakpoint
CREATE TABLE "service_request_workflow" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"current_stage" varchar(100) DEFAULT 'investment_forms_pending' NOT NULL,
	"investment_reviewed_by" integer,
	"investment_reviewed_at" timestamp,
	"investment_notes" text,
	"administrative_reviewed_by" integer,
	"administrative_reviewed_at" timestamp,
	"administrative_notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_request_workflow_service_request_id_unique" UNIQUE("service_request_id")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"priority" varchar(50) DEFAULT 'normal' NOT NULL,
	"assigned_to" integer,
	"request_data" text,
	"rejection_reason" text,
	"completed_at" timestamp,
	"due_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"department" varchar(100) NOT NULL,
	"category" varchar(100),
	"icon" varchar(100),
	"estimated_days" integer,
	"requirements" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"is_editable" boolean DEFAULT true NOT NULL,
	"data_type" varchar(50) DEFAULT 'text' NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) DEFAULT 'customer' NOT NULL,
	"department" varchar(100),
	"full_name" varchar(255) NOT NULL,
	"national_id" varchar(50),
	"email" varchar(255),
	"phone" varchar(20),
	"profile_image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorized_phones" ADD CONSTRAINT "authorized_phones_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bale_conversations" ADD CONSTRAINT "bale_conversations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bale_employee_mappings" ADD CONSTRAINT "bale_employee_mappings_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bale_employee_mappings" ADD CONSTRAINT "bale_employee_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bale_messages" ADD CONSTRAINT "bale_messages_conversation_id_bale_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."bale_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bale_messages" ADD CONSTRAINT "bale_messages_bale_user_id_bale_users_id_fk" FOREIGN KEY ("bale_user_id") REFERENCES "public"."bale_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bale_users" ADD CONSTRAINT "bale_users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tax_declaration_document_id_documents_id_fk" FOREIGN KEY ("tax_declaration_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_form_data" ADD CONSTRAINT "contract_form_data_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_form_data" ADD CONSTRAINT "contract_form_data_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_form_data" ADD CONSTRAINT "contract_form_data_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_form_data" ADD CONSTRAINT "contract_form_data_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_variable_mappings" ADD CONSTRAINT "contract_variable_mappings_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_variable_mappings" ADD CONSTRAINT "contract_variable_mappings_variable_id_contract_variables_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."contract_variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_variables" ADD CONSTRAINT "contract_variables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirement_access" ADD CONSTRAINT "document_requirement_access_requirement_id_document_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirement_access" ADD CONSTRAINT "document_requirement_access_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_requirement_id_document_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_dependencies" ADD CONSTRAINT "formula_dependencies_formula_id_financial_formulas_id_fk" FOREIGN KEY ("formula_id") REFERENCES "public"."financial_formulas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_document_requirements" ADD CONSTRAINT "service_document_requirements_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_document_requirements" ADD CONSTRAINT "service_document_requirements_document_requirement_id_document_requirements_id_fk" FOREIGN KEY ("document_requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_document_requirements" ADD CONSTRAINT "service_document_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_workflow" ADD CONSTRAINT "service_request_workflow_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_workflow" ADD CONSTRAINT "service_request_workflow_investment_reviewed_by_users_id_fk" FOREIGN KEY ("investment_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_workflow" ADD CONSTRAINT "service_request_workflow_administrative_reviewed_by_users_id_fk" FOREIGN KEY ("administrative_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;