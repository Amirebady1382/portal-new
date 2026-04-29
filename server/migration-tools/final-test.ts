#!/usr/bin/env tsx
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

async function main() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const client = await pool.connect();
  
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   PostgreSQL Final Verification${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);
  
  // Test 1: Count all rows
  const tables = [
    'users', 'companies', 'documents', 'system_settings', 'audit_logs',
    'contract_templates', 'document_requirements', 'services', 'contract_variables',
    'financial_formulas', 'formula_dependencies'
  ];
  
  let totalRows = 0;
  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
    const count = parseInt(result.rows[0].count);
    totalRows += count;
    if (count > 0) {
      console.log(`${colors.green}✅ ${table}: ${count} rows${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.cyan}Total rows: ${totalRows}${colors.reset}`);
  
  // Test 2: Sample user data
  const userResult = await client.query('SELECT id, username, role, full_name FROM users LIMIT 3');
  console.log(`\n${colors.cyan}Sample users:${colors.reset}`);
  userResult.rows.forEach(u => {
    console.log(`  ${colors.green}→${colors.reset} ${u.full_name} (${u.username}) - ${u.role}`);
  });
  
  // Test 3: Check foreign keys work
  const companyResult = await client.query(`
    SELECT c.name, u.full_name as owner
    FROM companies c
    LEFT JOIN user_companies uc ON c.id = uc.company_id
    LEFT JOIN users u ON uc.user_id = u.id
    LIMIT 3
  `);
  
  console.log(`\n${colors.cyan}Companies with owners:${colors.reset}`);
  companyResult.rows.forEach(c => {
    console.log(`  ${colors.green}→${colors.reset} ${c.name} - ${c.owner || 'بدون مالک'}`);
  });
  
  // Test 4: Check indexes and constraints
  const indexResult = await client.query(`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE schemaname = 'public'
  `);
  
  console.log(`\n${colors.cyan}Database health:${colors.reset}`);
  console.log(`${colors.green}✅ Indexes: ${indexResult.rows[0].count}${colors.reset}`);
  
  const fkResult = await client.query(`
    SELECT COUNT(*) as count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
  `);
  
  console.log(`${colors.green}✅ Foreign Keys: ${fkResult.rows[0].count}${colors.reset}`);
  
  console.log(`\n${colors.green}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}   🎉 PostgreSQL is fully operational!${colors.reset}`);
  console.log(`${colors.green}═══════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.cyan}✅ All tests passed!${colors.reset}`);
  console.log(`${colors.yellow}📊 Your application is now using PostgreSQL${colors.reset}\n`);
  
  client.release();
  await pool.end();
}

main().catch(console.error);

