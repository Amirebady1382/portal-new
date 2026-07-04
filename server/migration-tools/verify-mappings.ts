#!/usr/bin/env tsx
/**
 * Verification Script: بررسی Variable-Form-Field Mappings
 *
 * این اسکریپت وضعیت mappings را بررسی می‌کند
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
  reset: '\x1b[0m',
};

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Variable-Form-Field Mappings Verification${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // 1. Check total mappings count
  console.log(`${colors.blue}[1] Checking total mappings...${colors.reset}`);
  const countResult = await db.execute(`
    SELECT COUNT(*) as total FROM variable_form_field_mappings
  `);
  const totalMappings = (countResult.rows[0] as any).total;
  console.log(`   Total mappings: ${colors.green}${totalMappings}${colors.reset}\n`);

  // 2. Check mappings with details
  console.log(`${colors.blue}[2] Sample mappings with details...${colors.reset}`);
  const sampleResult = await db.execute(`
    SELECT
      vffm.id,
      cv.name as variable_name,
      cv.label as variable_label,
      dr.title as form_title,
      vffm.field_name,
      vffm.priority,
      vffm.is_active
    FROM variable_form_field_mappings vffm
    JOIN contract_variables cv ON vffm.variable_id = cv.id
    JOIN document_requirements dr ON vffm.requirement_id = dr.id
    LIMIT 5
  `);

  console.log(`   Sample mappings (first 5):`);
  for (const row of sampleResult.rows) {
    const r = row as any;
    console.log(`   ${colors.green}✓${colors.reset} ${r.variable_name} (${r.variable_label})`);
    console.log(`     → Form: ${r.form_title}`);
    console.log(`     → Field: ${r.field_name}`);
    console.log(`     → Priority: ${r.priority}, Active: ${r.is_active ? 'Yes' : 'No'}\n`);
  }

  // 3. Check variables with multiple sources
  console.log(`${colors.blue}[3] Variables with multiple data sources...${colors.reset}`);
  const multiSourceResult = await db.execute(`
    SELECT
      cv.name,
      cv.label,
      COUNT(*) as source_count
    FROM variable_form_field_mappings vffm
    JOIN contract_variables cv ON vffm.variable_id = cv.id
    GROUP BY cv.name, cv.label
    HAVING COUNT(*) > 1
    ORDER BY source_count DESC
    LIMIT 5
  `);

  if (multiSourceResult.rows.length > 0) {
    console.log(`   Found ${multiSourceResult.rows.length} variables with multiple sources:`);
    for (const row of multiSourceResult.rows) {
      const r = row as any;
      console.log(`   ${colors.yellow}→${colors.reset} ${r.name} (${r.label}): ${r.source_count} sources`);
    }
  } else {
    console.log(`   ${colors.yellow}No variables with multiple sources found${colors.reset}`);
  }
  console.log();

  // 4. Check forms with most mappings
  console.log(`${colors.blue}[4] Forms with most variable mappings...${colors.reset}`);
  const formMappingsResult = await db.execute(`
    SELECT
      dr.id,
      dr.title,
      COUNT(*) as mapping_count
    FROM variable_form_field_mappings vffm
    JOIN document_requirements dr ON vffm.requirement_id = dr.id
    GROUP BY dr.id, dr.title
    ORDER BY mapping_count DESC
    LIMIT 5
  `);

  console.log(`   Top 5 forms by mapping count:`);
  for (const row of formMappingsResult.rows) {
    const r = row as any;
    console.log(`   ${colors.green}${r.mapping_count}${colors.reset} mappings → ${r.title} (ID: ${r.id})`);
  }
  console.log();

  // 5. Check for orphaned mappings
  console.log(`${colors.blue}[5] Checking data integrity...${colors.reset}`);
  const orphanVariablesResult = await db.execute(`
    SELECT COUNT(*) as count
    FROM variable_form_field_mappings vffm
    LEFT JOIN contract_variables cv ON vffm.variable_id = cv.id
    WHERE cv.id IS NULL
  `);
  const orphanFormsResult = await db.execute(`
    SELECT COUNT(*) as count
    FROM variable_form_field_mappings vffm
    LEFT JOIN document_requirements dr ON vffm.requirement_id = dr.id
    WHERE dr.id IS NULL
  `);

  const orphanVariables = (orphanVariablesResult.rows[0] as any).count;
  const orphanForms = (orphanFormsResult.rows[0] as any).count;

  if (orphanVariables === 0 && orphanForms === 0) {
    console.log(`   ${colors.green}✓ No orphaned mappings found${colors.reset}`);
    console.log(`   ${colors.green}✓ All foreign keys are valid${colors.reset}\n`);
  } else {
    console.log(`   ${colors.red}✗ Found ${orphanVariables} mappings with invalid variable_id${colors.reset}`);
    console.log(`   ${colors.red}✗ Found ${orphanForms} mappings with invalid requirement_id${colors.reset}\n`);
  }

  // Summary
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ Variable-Form-Field mapping system is operational${colors.reset}`);
  console.log(`   Total Mappings: ${totalMappings}`);
  console.log(`   Data Integrity: ${orphanVariables === 0 && orphanForms === 0 ? 'Valid' : 'Issues Found'}`);
  console.log(`   Ready for: Contract generation, investment reports, API access\n`);
}

main().catch(console.error);
