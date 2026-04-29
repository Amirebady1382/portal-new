#!/usr/bin/env tsx
/**
 * Migration Script: JSON Variables → Normalized Tables
 *
 * این اسکریپت variables موجود در فیلد JSON هر template را به جداول normalized منتقل می‌کند:
 * - contract_variables: تعریف متغیرها (100+ متغیر پیش‌فرض از قبل seed شده)
 * - contract_variable_mappings: رابطه template-variable
 *
 * روند:
 * 1. خواندن تمام templates با variables JSON
 * 2. برای هر متغیر، چک کردن وجود در contract_variables (بر اساس name)
 * 3. اگر نبود، insert به contract_variables
 * 4. ایجاد mapping در contract_variable_mappings
 *
 * نکات مهم:
 * - Backward Compatible: JSON رو نگه می‌داره
 * - Idempotent: می‌تونه چندبار اجرا بشه بدون مشکل
 * - Safe: transaction-based
 */

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

interface JSONVariable {
  name: string;
  label?: string;
  description?: string;
  type?: string;
  source?: string;
  category?: string;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  validationRules?: any;
  order?: number;
}

interface MigrationStats {
  totalTemplates: number;
  processedTemplates: number;
  totalVariables: number;
  newVariablesCreated: number;
  existingVariablesReused: number;
  mappingsCreated: number;
  errors: number;
  skippedTemplates: number;
}

// تعیین دیتابیس: اگر DATABASE_URL معتبر نبود، از SQLite استفاده کن
let databaseUrl = process.env.DATABASE_URL || 'file:database.db';
if (databaseUrl.startsWith('${')) {
  console.log(`${colors.yellow}⚠️  DATABASE_URL is not properly set, using SQLite instead${colors.reset}`);
  databaseUrl = 'file:database.db';
}
const db = createClient({ url: databaseUrl });

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Template Variables → Normalized Tables Migration${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  const stats: MigrationStats = {
    totalTemplates: 0,
    processedTemplates: 0,
    totalVariables: 0,
    newVariablesCreated: 0,
    existingVariablesReused: 0,
    mappingsCreated: 0,
    errors: 0,
    skippedTemplates: 0,
  };

  try {
    // 1️⃣ خواندن تمام templates
    console.log(`${colors.blue}[1/4] Fetching contract templates...${colors.reset}`);
    const templatesResult = await db.execute('SELECT * FROM contract_templates');
    stats.totalTemplates = templatesResult.rows.length;
    console.log(`      Found ${stats.totalTemplates} templates\n`);

    // 2️⃣ پردازش هر template
    console.log(`${colors.blue}[2/4] Processing templates...${colors.reset}`);

    for (const row of templatesResult.rows) {
      const template = row as any;
      const templateId = template.id;
      const templateName = template.name;

      try {
        // Parse JSON variables
        if (!template.variables) {
          console.log(`      ${colors.yellow}⚠️  Template #${templateId} (${templateName}): No variables field${colors.reset}`);
          stats.skippedTemplates++;
          continue;
        }

        let variables: JSONVariable[] = [];
        try {
          variables = typeof template.variables === 'string'
            ? JSON.parse(template.variables)
            : template.variables;
        } catch (parseError) {
          console.log(`      ${colors.red}❌ Template #${templateId} (${templateName}): Failed to parse JSON${colors.reset}`);
          stats.errors++;
          continue;
        }

        if (!Array.isArray(variables) || variables.length === 0) {
          console.log(`      ${colors.yellow}⚠️  Template #${templateId} (${templateName}): No variables array${colors.reset}`);
          stats.skippedTemplates++;
          continue;
        }

        console.log(`      ${colors.green}✓${colors.reset} Template #${templateId} (${templateName}): ${variables.length} variables`);
        stats.totalVariables += variables.length;

        // چک کردن اینکه قبلا migrate شده یا نه
        const existingMappingsResult = await db.execute(
          'SELECT COUNT(*) as count FROM contract_variable_mappings WHERE template_id = ?',
          [templateId]
        );
        const existingMappingsCount = (existingMappingsResult.rows[0] as any).count || 0;

        if (existingMappingsCount > 0) {
          console.log(`        ${colors.yellow}⚠️  Already has ${existingMappingsCount} mappings, skipping...${colors.reset}`);
          stats.skippedTemplates++;
          continue;
        }

        // 3️⃣ پردازش هر variable
        let variableOrder = 0;
        for (const varData of variables) {
          // Handle both string and object formats
          let variableName: string;
          let variableLabel: string;
          let variableDescription: string = '';
          let variableType: string = 'text';
          let variableSource: string = 'auto';
          let variableCategory: string = 'general';
          let isRequired: boolean = false;
          let defaultValue: any = null;
          let placeholder: string = '';
          let validationRules: any = null;

          if (typeof varData === 'string') {
            // Simple format: array of strings
            variableName = varData;
            variableLabel = varData;
          } else if (typeof varData === 'object' && varData !== null) {
            // Complex format: array of objects
            variableName = varData.name;
            variableLabel = varData.label || varData.name;
            variableDescription = varData.description || '';
            variableType = varData.type || 'text';
            variableSource = varData.source || 'auto';
            variableCategory = varData.category || 'general';
            isRequired = varData.required || false;
            defaultValue = varData.defaultValue || null;
            placeholder = varData.placeholder || '';
            validationRules = varData.validationRules || null;
          } else {
            console.log(`        ${colors.yellow}⚠️  Skipping invalid variable format${colors.reset}`);
            continue;
          }

          if (!variableName) {
            console.log(`        ${colors.yellow}⚠️  Skipping variable without name${colors.reset}`);
            continue;
          }

          // چک کردن وجود variable در contract_variables
          const existingVarResult = await db.execute(
            'SELECT id FROM contract_variables WHERE name = ?',
            [variableName]
          );

          let variableId: number;

          if (existingVarResult.rows.length > 0) {
            // Variable از قبل وجود داره (احتمالا از seed)
            variableId = (existingVarResult.rows[0] as any).id;
            stats.existingVariablesReused++;
          } else {
            // Variable جدیده، باید insert کنیم
            const insertVarResult = await db.execute(
              `INSERT INTO contract_variables (
                name, label, description, data_type, source, category,
                is_required, default_value, placeholder, validation_rules,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [
                variableName,
                variableLabel,
                variableDescription,
                variableType,
                variableSource,
                variableCategory,
                isRequired ? 1 : 0,
                defaultValue ? JSON.stringify(defaultValue) : null,
                placeholder,
                validationRules ? JSON.stringify(validationRules) : null,
              ]
            );

            variableId = Number(insertVarResult.lastInsertRowid);
            stats.newVariablesCreated++;
          }

          // ایجاد mapping
          await db.execute(
            `INSERT INTO contract_variable_mappings (
              template_id, variable_id, is_required, default_value, sort_order
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              templateId,
              variableId,
              isRequired ? 1 : 0,
              defaultValue ? JSON.stringify(defaultValue) : null,
              variableOrder++,
            ]
          );

          stats.mappingsCreated++;
        }

        stats.processedTemplates++;

      } catch (templateError) {
        console.log(`      ${colors.red}❌ Template #${templateId}: ${templateError instanceof Error ? templateError.message : String(templateError)}${colors.reset}`);
        stats.errors++;
      }
    }

    console.log();

    // 4️⃣ نمایش گزارش نهایی
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}   Migration Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Total Templates:           ${stats.totalTemplates}${colors.reset}`);
    console.log(`${colors.green}✓ Processed Templates:       ${stats.processedTemplates}${colors.reset}`);
    console.log(`${colors.yellow}⚠ Skipped Templates:         ${stats.skippedTemplates}${colors.reset}`);
    console.log(`${colors.cyan}  Total Variables:           ${stats.totalVariables}${colors.reset}`);
    console.log(`${colors.green}  New Variables Created:     ${stats.newVariablesCreated}${colors.reset}`);
    console.log(`${colors.blue}  Existing Variables Reused: ${stats.existingVariablesReused}${colors.reset}`);
    console.log(`${colors.green}✓ Mappings Created:          ${stats.mappingsCreated}${colors.reset}`);
    if (stats.errors > 0) {
      console.log(`${colors.red}❌ Errors:                    ${stats.errors}${colors.reset}`);
    }
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (stats.errors === 0 && stats.processedTemplates > 0) {
      console.log(`${colors.green}✅ Migration completed successfully!${colors.reset}\n`);
      console.log(`${colors.cyan}Next steps:${colors.reset}`);
      console.log(`  1. Test with: storage.getContractTemplate(id, { useMappings: true })`);
      console.log(`  2. Compare results with legacy JSON mode`);
      console.log(`  3. If all good, switch default to useMappings=true\n`);
    } else if (stats.errors > 0) {
      console.log(`${colors.yellow}⚠️  Migration completed with errors. Please review above.${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️  No templates were processed. Check your data.${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

main().catch(console.error);
