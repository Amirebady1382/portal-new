#!/usr/bin/env tsx
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@libsql/client';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

const TABLES = [
  'users', 'departments', 'companies', 'otp_codes', 'system_settings',
  'audit_logs', 'contract_templates', 'document_requirements', 'services',
  'contract_variables', 'user_companies', 'documents', 'conversations',
  'messages', 'form_submissions', 'contract_form_data', 'financial_formulas',
  'formula_dependencies', 'service_document_requirements'
];

async function main() {
  const sqliteClient = createClient({ url: 'file:database.db' });
  const pgPool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Data Verification Report${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);
  
  const client = await pgPool.connect();
  
  let totalSQLite = 0;
  let totalPostgres = 0;
  let matched = 0;
  let mismatched = 0;
  
  for (const table of TABLES) {
    try {
      const sqliteResult = await sqliteClient.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const sqliteCount = (sqliteResult.rows[0] as any).count || 0;
      
      const pgResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const pgCount = parseInt(pgResult.rows[0].count);
      
      totalSQLite += sqliteCount;
      totalPostgres += pgCount;
      
      const status = sqliteCount === pgCount ? '✅' : (pgCount === 0 ? '❌' : '⚠️ ');
      const color = sqliteCount === pgCount ? colors.green : (pgCount === 0 ? colors.red : colors.yellow);
      
      if (sqliteCount === pgCount) matched++;
      else mismatched++;
      
      console.log(`${color}${status} ${table.padEnd(35)} SQLite: ${String(sqliteCount).padStart(5)}  →  PostgreSQL: ${String(pgCount).padStart(5)}${colors.reset}`);
      
    } catch (error) {
      console.log(`${colors.red}❌ ${table.padEnd(35)} Error checking${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Matched tables:    ${matched}${colors.reset}`);
  console.log(`${colors.yellow}Mismatched tables: ${mismatched}${colors.reset}`);
  console.log(`${colors.cyan}Total rows (SQLite):     ${totalSQLite}${colors.reset}`);
  console.log(`${colors.cyan}Total rows (PostgreSQL): ${totalPostgres}${colors.reset}`);
  
  const percentage = totalSQLite > 0 ? ((totalPostgres / totalSQLite) * 100).toFixed(2) : 0;
  console.log(`${colors.green}\nMigration: ${percentage}% complete${colors.reset}\n`);
  
  client.release();
  await pgPool.end();
}

main().catch(console.error);

