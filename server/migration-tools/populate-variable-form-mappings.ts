#!/usr/bin/env tsx
/**
 * Data Migration: Populate variable_form_field_mappings
 *
 * این اسکریپت variableName های موجود در فیلدهای فرم‌ها را به جدول
 * variable_form_field_mappings منتقل می‌کند تا ارتباط دوطرفه برقرار شود.
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

let databaseUrl = process.env.DATABASE_URL || 'file:database.db';
if (databaseUrl.startsWith('${')) {
  console.log(`${colors.yellow}⚠️  DATABASE_URL is not properly set, using SQLite instead${colors.reset}`);
  databaseUrl = 'file:database.db';
}
const db = createClient({ url: databaseUrl });

interface MigrationStats {
  totalForms: number;
  totalFields: number;
  fieldsWithVariableName: number;
  variablesFound: number;
  variablesNotFound: number;
  mappingsCreated: number;
  mappingsSkipped: number;
  errors: number;
}

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Data Migration: variableName → variable_form_field_mappings${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  const stats: MigrationStats = {
    totalForms: 0,
    totalFields: 0,
    fieldsWithVariableName: 0,
    variablesFound: 0,
    variablesNotFound: 0,
    mappingsCreated: 0,
    mappingsSkipped: 0,
    errors: 0,
  };

  try {
    // 1️⃣ دریافت تمام فرم‌ها
    console.log(`${colors.blue}[1/4] Fetching document requirements (forms)...${colors.reset}`);
    const formsResult = await db.execute('SELECT * FROM document_requirements WHERE is_active = 1');
    stats.totalForms = formsResult.rows.length;
    console.log(`      Found ${stats.totalForms} active forms\n`);

    // 2️⃣ دریافت تمام variables برای mapping
    console.log(`${colors.blue}[2/4] Loading contract variables...${colors.reset}`);
    const variablesResult = await db.execute('SELECT id, name FROM contract_variables');
    const variableMap = new Map(variablesResult.rows.map(row => [(row as any).name, (row as any).id]));
    console.log(`      Loaded ${variableMap.size} variables\n`);

    // 3️⃣ پردازش هر فرم
    console.log(`${colors.blue}[3/4] Processing forms and creating mappings...${colors.reset}`);

    for (const formRow of formsResult.rows) {
      const form = formRow as any;
      const formId = form.id;
      const formTitle = form.title;

      try {
        // Parse JSON fields
        if (!form.fields) continue;

        let fields: any[] = [];
        try {
          fields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;
        } catch (parseError) {
          console.log(`      ${colors.red}✗ Form #${formId} (${formTitle}): Failed to parse fields JSON${colors.reset}`);
          stats.errors++;
          continue;
        }

        if (!Array.isArray(fields) || fields.length === 0) continue;

        console.log(`      ${colors.cyan}📋 Form #${formId}: ${formTitle} (${fields.length} fields)${colors.reset}`);
        stats.totalFields += fields.length;

        // پردازش هر فیلد
        for (const field of fields) {
          if (!field.variableName || !field.name) continue;

          stats.fieldsWithVariableName++;

          // پیدا کردن variable_id
          const variableId = variableMap.get(field.variableName);

          if (!variableId) {
            console.log(`         ${colors.yellow}⚠️  Variable '${field.variableName}' not found${colors.reset}`);
            stats.variablesNotFound++;
            continue;
          }

          stats.variablesFound++;

          // چک کردن duplicate
          const existingResult = await db.execute(`
            SELECT id FROM variable_form_field_mappings
            WHERE variable_id = ? AND requirement_id = ? AND field_name = ?
          `, [variableId, formId, field.name]);

          if (existingResult.rows.length > 0) {
            console.log(`         ${colors.blue}ℹ️  Mapping already exists: ${field.variableName} ← ${field.name}${colors.reset}`);
            stats.mappingsSkipped++;
            continue;
          }

          // ایجاد mapping
          try {
            await db.execute(`
              INSERT INTO variable_form_field_mappings (
                variable_id, requirement_id, field_name, priority, is_active, created_at, updated_at
              ) VALUES (?, ?, ?, 1, 1, datetime('now'), datetime('now'))
            `, [variableId, formId, field.name]);

            console.log(`         ${colors.green}✓ Created: ${field.variableName} ← ${field.name}${colors.reset}`);
            stats.mappingsCreated++;
          } catch (insertError) {
            console.log(`         ${colors.red}✗ Error creating mapping: ${insertError instanceof Error ? insertError.message : String(insertError)}${colors.reset}`);
            stats.errors++;
          }
        }

        console.log(); // فاصله بین فرم‌ها
      } catch (formError) {
        console.log(`      ${colors.red}✗ Error processing form #${formId}: ${formError instanceof Error ? formError.message : String(formError)}${colors.reset}\n`);
        stats.errors++;
      }
    }

    // 4️⃣ نمایش خلاصه
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}   Migration Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Total Forms:                 ${stats.totalForms}${colors.reset}`);
    console.log(`${colors.green}✓ Total Fields:                ${stats.totalFields}${colors.reset}`);
    console.log(`${colors.cyan}  Fields with variableName:    ${stats.fieldsWithVariableName}${colors.reset}`);
    console.log(`${colors.green}  Variables Found:             ${stats.variablesFound}${colors.reset}`);
    console.log(`${colors.yellow}  Variables Not Found:         ${stats.variablesNotFound}${colors.reset}`);
    console.log(`${colors.green}✓ Mappings Created:            ${stats.mappingsCreated}${colors.reset}`);
    console.log(`${colors.blue}  Mappings Skipped (existed):  ${stats.mappingsSkipped}${colors.reset}`);
    if (stats.errors > 0) {
      console.log(`${colors.red}✗ Errors:                      ${stats.errors}${colors.reset}`);
    }
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (stats.errors === 0 && stats.mappingsCreated > 0) {
      console.log(`${colors.green}✅ Migration completed successfully!${colors.reset}`);
      console.log(`${colors.green}   Created ${stats.mappingsCreated} new variable-form field mappings.${colors.reset}\n`);
    } else if (stats.mappingsCreated === 0 && stats.mappingsSkipped > 0) {
      console.log(`${colors.yellow}ℹ️  All mappings already exist. No new mappings created.${colors.reset}\n`);
    } else if (stats.errors > 0) {
      console.log(`${colors.yellow}⚠️  Migration completed with errors. Please review above.${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

main().catch(console.error);
