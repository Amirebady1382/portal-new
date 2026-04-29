#!/usr/bin/env tsx
/**
 * اضافه کردن Indexes به variable_form_field_mappings
 * برای بهبود performance lookups
 */

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

let databaseUrl = process.env.DATABASE_URL || 'file:database.db';
if (databaseUrl.startsWith('${')) {
  console.log(`${colors.yellow}⚠️  DATABASE_URL is not properly set, using SQLite instead${colors.reset}`);
  databaseUrl = 'file:database.db';
}
const db = createClient({ url: databaseUrl });

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Adding Indexes to variable_form_field_mappings${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  const indexes = [
    {
      name: 'idx_vffm_variable_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_vffm_variable_id ON variable_form_field_mappings(variable_id)',
      description: 'Index for variable_id lookups'
    },
    {
      name: 'idx_vffm_requirement_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_vffm_requirement_id ON variable_form_field_mappings(requirement_id)',
      description: 'Index for requirement_id lookups'
    },
    {
      name: 'idx_vffm_active',
      sql: 'CREATE INDEX IF NOT EXISTS idx_vffm_active ON variable_form_field_mappings(is_active)',
      description: 'Index for filtering active mappings'
    },
    {
      name: 'idx_vffm_priority',
      sql: 'CREATE INDEX IF NOT EXISTS idx_vffm_priority ON variable_form_field_mappings(priority DESC)',
      description: 'Index for priority-based ordering'
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const index of indexes) {
    try {
      console.log(`${colors.yellow}Creating index: ${index.name}${colors.reset}`);
      await db.execute(index.sql);
      console.log(`${colors.green}✓ ${index.description}${colors.reset}\n`);
      successCount++;
    } catch (error) {
      console.log(`${colors.red}✗ Error creating ${index.name}: ${error instanceof Error ? error.message : String(error)}${colors.reset}\n`);
      errorCount++;
    }
  }

  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Successful: ${successCount}${colors.reset}`);
  if (errorCount > 0) {
    console.log(`${colors.red}✗ Errors: ${errorCount}${colors.reset}`);
  }
  console.log();

  if (errorCount === 0) {
    console.log(`${colors.green}✅ All indexes created successfully!${colors.reset}\n`);
  }
}

main().catch(console.error);
