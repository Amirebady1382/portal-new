#!/usr/bin/env tsx
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  
  if (!postgresUrl) {
    log('❌ POSTGRES_URL not set', colors.red);
    process.exit(1);
  }
  
  log('═══════════════════════════════════════════════', colors.cyan);
  log('   Reset PostgreSQL Database', colors.cyan);
  log('═══════════════════════════════════════════════', colors.cyan);
  
  const pool = new Pool({ connectionString: postgresUrl });
  
  try {
    const client = await pool.connect();
    
    log('\n🗑️  Dropping all tables...', colors.yellow);
    
    // Drop all tables with CASCADE
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO gfund;
      GRANT ALL ON SCHEMA public TO public;
    `);
    
    log('✅ All tables dropped', colors.green);
    
    client.release();
    await pool.end();
    
    log('\n✅ Database reset successfully!', colors.green);
    log('   Next: npx tsx server/migration-tools/apply-schema.ts', colors.yellow);
    
  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    await pool.end();
    process.exit(1);
  }
}

main().catch(console.error);

