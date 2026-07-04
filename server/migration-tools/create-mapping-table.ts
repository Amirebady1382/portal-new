#!/usr/bin/env tsx
/**
 * ساخت جدول variable_form_field_mappings به صورت دستی
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
  console.log(`${colors.cyan}   Creating variable_form_field_mappings Table${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    // چک کردن اینکه جدول از قبل وجود داره یا نه
    const checkResult = await db.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='variable_form_field_mappings'
    `);

    if (checkResult.rows.length > 0) {
      console.log(`${colors.yellow}⚠️  Table already exists${colors.reset}\n`);
      return;
    }

    // ساخت جدول
    console.log(`${colors.yellow}Creating table...${colors.reset}`);
    await db.execute(`
      CREATE TABLE variable_form_field_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        variable_id INTEGER NOT NULL,
        requirement_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
        FOREIGN KEY (variable_id) REFERENCES contract_variables(id) ON DELETE CASCADE,
        FOREIGN KEY (requirement_id) REFERENCES document_requirements(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE NO ACTION
      )
    `);

    console.log(`${colors.green}✓ Table created${colors.reset}\n`);

    // ساخت unique constraint
    console.log(`${colors.yellow}Creating unique constraint...${colors.reset}`);
    await db.execute(`
      CREATE UNIQUE INDEX variable_form_field_mappings_unique
      ON variable_form_field_mappings(variable_id, requirement_id, field_name)
    `);

    console.log(`${colors.green}✓ Unique constraint created${colors.reset}\n`);

    // ساخت indexes
    const indexes = [
      'CREATE INDEX idx_vffm_variable_id ON variable_form_field_mappings(variable_id)',
      'CREATE INDEX idx_vffm_requirement_id ON variable_form_field_mappings(requirement_id)',
      'CREATE INDEX idx_vffm_active ON variable_form_field_mappings(is_active)',
      'CREATE INDEX idx_vffm_priority ON variable_form_field_mappings(priority DESC)'
    ];

    console.log(`${colors.yellow}Creating indexes...${colors.reset}`);
    for (const indexSql of indexes) {
      await db.execute(indexSql);
    }

    console.log(`${colors.green}✓ All indexes created${colors.reset}\n`);

    console.log(`${colors.green}✅ Table variable_form_field_mappings created successfully with all indexes!${colors.reset}\n`);

  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error instanceof Error ? error.message : String(error)}${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch(console.error);
