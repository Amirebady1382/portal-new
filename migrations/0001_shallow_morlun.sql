CREATE INDEX `form_submissions_company_idx` ON `form_submissions` (`company_id`);--> statement-breakpoint
CREATE INDEX `form_submissions_requirement_idx` ON `form_submissions` (`requirement_id`);--> statement-breakpoint
CREATE INDEX `vffm_variable_active_idx` ON `variable_form_field_mappings` (`variable_id`,`is_active`,`priority`);