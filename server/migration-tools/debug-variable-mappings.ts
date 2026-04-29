#!/usr/bin/env tsx
/**
 * Debug Script: بررسی جامع Variable-Form-Field Mappings
 *
 * این اسکریپت مشکلات mapping را پیدا می‌کند
 */

import dotenv from 'dotenv';
import { db } from '../db';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
};

function safeJsonParse(jsonString: string | null | undefined, fallback: any = []) {
  if (!jsonString) return fallback;
  try {
    return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    return fallback;
  }
}

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Variable-Form-Field Mappings Debug Report${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // 1. دریافت تمام mappings با جزئیات
  console.log(`${colors.blue}[1] Fetching all mappings with details...${colors.reset}`);
  const mappingsResult = await db.execute(`
    SELECT
      vffm.id as mapping_id,
      vffm.field_name,
      vffm.priority,
      vffm.is_active,
      cv.id as variable_id,
      cv.name as variable_name,
      cv.label as variable_label,
      cv.source as variable_source,
      dr.id as form_id,
      dr.title as form_title,
      dr.fields as form_fields_json
    FROM variable_form_field_mappings vffm
    JOIN contract_variables cv ON vffm.variable_id = cv.id
    JOIN document_requirements dr ON vffm.requirement_id = dr.id
    WHERE vffm.is_active = 1
    ORDER BY cv.name, vffm.priority DESC
  `);

  console.log(`   Total active mappings: ${colors.green}${mappingsResult.rows.length}${colors.reset}\n`);

  // گروه‌بندی بر اساس variable
  const mappingsByVariable = new Map<string, any[]>();
  for (const row of mappingsResult.rows) {
    const r = row as any;
    if (!mappingsByVariable.has(r.variable_name)) {
      mappingsByVariable.set(r.variable_name, []);
    }
    mappingsByVariable.get(r.variable_name)!.push(r);
  }

  // 2. بررسی هر variable و mappings آن
  console.log(`${colors.blue}[2] Analyzing mappings for each variable...${colors.reset}\n`);

  let issuesFound = 0;
  let totalChecked = 0;

  for (const [varName, mappings] of mappingsByVariable.entries()) {
    const firstMapping = mappings[0];
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.yellow}Variable:${colors.reset} ${varName} (${firstMapping.variable_label})`);
    console.log(`   Source: ${firstMapping.variable_source}`);
    console.log(`   Number of mappings: ${mappings.length}\n`);

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      totalChecked++;

      console.log(`   ${colors.magenta}Mapping #${i + 1}:${colors.reset} Priority ${mapping.priority}`);
      console.log(`   → Form: "${mapping.form_title}" (ID: ${mapping.form_id})`);
      console.log(`   → Field Name in Mapping: "${colors.yellow}${mapping.field_name}${colors.reset}"`);

      // Parse form fields JSON
      const formFields = safeJsonParse(mapping.form_fields_json, []);
      console.log(`   → Form has ${formFields.length} fields total`);

      // Check if field_name exists in form fields
      const matchingField = formFields.find((f: any) => f.name === mapping.field_name);

      if (matchingField) {
        console.log(`   ${colors.green}✓ Field EXISTS in form definition${colors.reset}`);
        console.log(`     - Field label: "${matchingField.label}"`);
        console.log(`     - Field type: ${matchingField.type}`);
      } else {
        console.log(`   ${colors.red}✗ Field NOT FOUND in form definition!${colors.reset}`);
        console.log(`   ${colors.red}   This is a MISMATCH - mapping expects "${mapping.field_name}" but form doesn't have it${colors.reset}`);
        issuesFound++;

        // نمایش فیلدهای موجود در فرم
        console.log(`\n   Available fields in form:`);
        formFields.forEach((f: any, idx: number) => {
          console.log(`     ${idx + 1}. ${f.name} (${f.label}) - type: ${f.type}`);
        });
      }

      console.log();
    }
  }

  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // 3. بررسی form submissions
  console.log(`${colors.blue}[3] Checking actual form submission data...${colors.reset}`);

  const submissionsResult = await db.execute(`
    SELECT
      fs.id as submission_id,
      fs.requirement_id as form_id,
      fs.form_data,
      dr.title as form_title,
      c.company_name
    FROM form_submissions fs
    JOIN document_requirements dr ON fs.requirement_id = dr.id
    JOIN companies c ON fs.company_id = c.id
    ORDER BY fs.id DESC
    LIMIT 10
  `);

  console.log(`   Analyzing ${submissionsResult.rows.length} recent form submissions...\n`);

  for (const row of submissionsResult.rows) {
    const r = row as any;
    console.log(`${colors.magenta}Submission ID ${r.submission_id}:${colors.reset}`);
    console.log(`   Company: ${r.company_name}`);
    console.log(`   Form: "${r.form_title}" (ID: ${r.form_id})`);

    const formData = safeJsonParse(r.form_data, {});
    const fieldNames = Object.keys(formData);

    console.log(`   Field names in submitted data: ${colors.yellow}${fieldNames.length} fields${colors.reset}`);
    console.log(`   Field names: ${fieldNames.join(', ')}`);

    // Check if any mappings reference this form
    const mappingsForThisForm = (mappingsResult.rows as any[]).filter(
      (m: any) => m.form_id === r.form_id
    );

    if (mappingsForThisForm.length > 0) {
      console.log(`\n   ${colors.cyan}Mappings referencing this form:${colors.reset}`);

      for (const mapping of mappingsForThisForm) {
        const expectedFieldName = mapping.field_name;
        const actualValue = formData[expectedFieldName];
        const hasValue = actualValue !== undefined && actualValue !== null && actualValue !== '';

        if (hasValue) {
          console.log(`   ${colors.green}✓${colors.reset} ${mapping.variable_name} → ${expectedFieldName} = "${actualValue}"`);
        } else {
          console.log(`   ${colors.red}✗${colors.reset} ${mapping.variable_name} → ${expectedFieldName} = [NOT FOUND or EMPTY]`);

          // Try to find similar field names
          const similarFields = fieldNames.filter(fn =>
            fn.toLowerCase().includes(expectedFieldName.toLowerCase()) ||
            expectedFieldName.toLowerCase().includes(fn.toLowerCase())
          );

          if (similarFields.length > 0) {
            console.log(`     ${colors.yellow}Possible matches:${colors.reset} ${similarFields.join(', ')}`);
            similarFields.forEach(sf => {
              console.log(`       ${sf} = "${formData[sf]}"`);
            });
          }
        }
      }
    }

    console.log();
  }

  // 4. خلاصه نهایی
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`   Total mappings checked: ${totalChecked}`);
  console.log(`   Issues found: ${issuesFound > 0 ? colors.red : colors.green}${issuesFound}${colors.reset}`);

  if (issuesFound > 0) {
    console.log(`\n   ${colors.red}⚠️  CRITICAL: ${issuesFound} mapping(s) have field_name mismatches!${colors.reset}`);
    console.log(`   ${colors.red}This is likely causing the variable replacement bug.${colors.reset}`);
  } else {
    console.log(`\n   ${colors.green}✓ All mappings have valid field names in form definitions${colors.reset}`);
    console.log(`   ${colors.yellow}If bug persists, check actual form submission data structure${colors.reset}`);
  }

  console.log();
}

main().catch(console.error);
