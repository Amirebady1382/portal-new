CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`resource` text NOT NULL,
	`resource_id` integer,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `authorized_phones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text(15) NOT NULL,
	`employee_name` text(100),
	`department_id` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bale_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text(255),
	`customer_name` text(100),
	`customer_phone` text(15),
	`department_id` integer NOT NULL,
	`status` text(20) DEFAULT 'active' NOT NULL,
	`last_message_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bale_employee_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`bale_chat_id` text(100) NOT NULL,
	`bale_user_id` text(100),
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bale_employee_mappings_bale_chat_id_unique` ON `bale_employee_mappings` (`bale_chat_id`);--> statement-breakpoint
CREATE TABLE `bale_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`content` text NOT NULL,
	`message_type` text(20) DEFAULT 'text' NOT NULL,
	`platform` text(10) DEFAULT 'web' NOT NULL,
	`sender_type` text(10) DEFAULT 'customer' NOT NULL,
	`bale_user_id` integer,
	`is_delivered` integer DEFAULT false NOT NULL,
	`sent_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `bale_conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bale_user_id`) REFERENCES `bale_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bale_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bale_user_id` text(100) NOT NULL,
	`bale_chat_id` text(100) NOT NULL,
	`first_name` text(100),
	`last_name` text(100),
	`username` text(100),
	`phone_number` text(15),
	`department_id` integer,
	`is_authenticated` integer DEFAULT false NOT NULL,
	`last_active_at` text DEFAULT (CURRENT_TIMESTAMP),
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bale_users_bale_user_id_unique` ON `bale_users` (`bale_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bale_users_bale_chat_id_unique` ON `bale_users` (`bale_chat_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`national_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`primary_unit` text,
	`registration_number` text,
	`registration_date` text,
	`capital` text,
	`address` text,
	`city` text,
	`phone` text,
	`email` text,
	`website` text,
	`description` text,
	`established_year` integer,
	`employee_count` integer,
	`team_info` text,
	`product_info` text,
	`market_info` text,
	`financial_info` text,
	`rasmio_data` text,
	`ai_analysis_data` text,
	`signatories` text,
	`financial_summary_data` text,
	`tax_declaration_document_id` integer,
	`financial_summary_status` text DEFAULT 'pending',
	`financial_summary_last_updated` text,
	`financial_summary_error` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`tax_declaration_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_national_id_unique` ON `companies` (`national_id`);--> statement-breakpoint
CREATE TABLE `company_services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`service_id` integer NOT NULL,
	`activated_by` integer NOT NULL,
	`activated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_services_company_id_service_id_unique` ON `company_services` (`company_id`,`service_id`);--> statement-breakpoint
CREATE TABLE `contract_form_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`template_id` integer NOT NULL,
	`form_type` text NOT NULL,
	`form_data` text NOT NULL,
	`is_complete` integer DEFAULT false NOT NULL,
	`last_used_at` text,
	`created_by` integer NOT NULL,
	`updated_by` integer,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `contract_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contract_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`version` text DEFAULT '1.0' NOT NULL,
	`variables` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contract_variable_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`variable_id` integer NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`default_value` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `contract_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variable_id`) REFERENCES `contract_variables`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_variable_mappings_template_id_variable_id_unique` ON `contract_variable_mappings` (`template_id`,`variable_id`);--> statement-breakpoint
CREATE TABLE `contract_variables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`data_type` text DEFAULT 'text' NOT NULL,
	`source` text DEFAULT 'form' NOT NULL,
	`default_value` text,
	`is_required` integer DEFAULT false NOT NULL,
	`validation_rules` text,
	`placeholder` text,
	`category` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_variables_name_unique` ON `contract_variables` (`name`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`employee_id` integer,
	`subject` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`department` text,
	`last_message_at` text,
	`response_time` integer,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(100) NOT NULL,
	`slug` text(100) NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_slug_unique` ON `departments` (`slug`);--> statement-breakpoint
CREATE TABLE `document_requirement_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`requirement_id`) REFERENCES `document_requirements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`department` text NOT NULL,
	`category` text,
	`description` text NOT NULL,
	`fields` text DEFAULT '[]' NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`access_type` text DEFAULT 'all' NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`uploaded_by_id` integer NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`file_path` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `financial_formulas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variable_id` integer NOT NULL,
	`formula_expression` text NOT NULL,
	`description` text,
	`execution_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`form_data` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` text,
	`review_notes` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`requirement_id`) REFERENCES `document_requirements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `form_submissions_requirement_id_company_id_user_id_unique` ON `form_submissions` (`requirement_id`,`company_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `formula_dependencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formula_id` integer NOT NULL,
	`depends_on_variable_id` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`formula_id`) REFERENCES `financial_formulas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `formula_dependencies_formula_id_depends_on_variable_id_unique` ON `formula_dependencies` (`formula_id`,`depends_on_variable_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`sender_id` integer NOT NULL,
	`content` text NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`attachment_path` text,
	`status` text DEFAULT 'sent' NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text NOT NULL,
	`code` text NOT NULL,
	`purpose` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`old_status` text,
	`new_status` text NOT NULL,
	`changed_by` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `service_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_document_requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`document_requirement_id` integer NOT NULL,
	`department` text NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_requirement_id`) REFERENCES `document_requirements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_document_requirements_service_id_document_requirement_id_department_unique` ON `service_document_requirements` (`service_id`,`document_requirement_id`,`department`);--> statement-breakpoint
CREATE TABLE `service_request_workflow` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_request_id` integer NOT NULL,
	`current_stage` text DEFAULT 'investment_forms_pending' NOT NULL,
	`investment_reviewed_by` integer,
	`investment_reviewed_at` text,
	`investment_notes` text,
	`administrative_reviewed_by` integer,
	`administrative_reviewed_at` text,
	`administrative_notes` text,
	`completed_at` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`service_request_id`) REFERENCES `service_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`investment_reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`administrative_reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_request_workflow_service_request_id_unique` ON `service_request_workflow` (`service_request_id`);--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`assigned_to` integer,
	`request_data` text,
	`rejection_reason` text,
	`completed_at` text,
	`due_date` text,
	`notes` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`department` text NOT NULL,
	`category` text,
	`icon` text,
	`estimated_days` integer,
	`requirements` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`is_editable` integer DEFAULT true NOT NULL,
	`data_type` text DEFAULT 'text' NOT NULL,
	`updated_by` integer,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_settings_key_unique` ON `system_settings` (`key`);--> statement-breakpoint
CREATE TABLE `user_companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`is_owner` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`department` text,
	`full_name` text NOT NULL,
	`national_id` text,
	`email` text,
	`phone` text,
	`profile_image` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `variable_form_field_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variable_id` integer NOT NULL,
	`requirement_id` integer NOT NULL,
	`field_name` text NOT NULL,
	`priority` integer DEFAULT 1,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	FOREIGN KEY (`variable_id`) REFERENCES `contract_variables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requirement_id`) REFERENCES `document_requirements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variable_form_field_mappings_variable_id_requirement_id_field_name_unique` ON `variable_form_field_mappings` (`variable_id`,`requirement_id`,`field_name`);