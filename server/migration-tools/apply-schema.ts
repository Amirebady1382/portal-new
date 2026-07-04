#!/usr/bin/env tsx
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  
  if (!postgresUrl) {
    log('❌ POSTGRES_URL not set in .env file', colors.red);
    process.exit(1);
  }
  
  log('═══════════════════════════════════════════════', colors.cyan);
  log('   Applying PostgreSQL Schema', colors.cyan);
  log('═══════════════════════════════════════════════', colors.cyan);
  
  // Find migration file
  const migrationsDir = path.join(process.cwd(), 'migrations-pg');
  
  if (!fs.existsSync(migrationsDir)) {
    log(`❌ migrations-pg directory not found!`, colors.red);
    log(`   Run: npx drizzle-kit generate --config=drizzle.config.pg.ts`, colors.yellow);
    process.exit(1);
  }
  
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  
  if (files.length === 0) {
    log(`❌ No migration files found!`, colors.red);
    process.exit(1);
  }
  
  const migrationFile = path.join(migrationsDir, files[0]);
  log(`\n📄 Reading migration file: ${files[0]}`, colors.blue);
  
  const sql = fs.readFileSync(migrationFile, 'utf-8');
  
  log(`\n🔌 Connecting to PostgreSQL...`, colors.cyan);
  const pool = new Pool({ connectionString: postgresUrl });
  
  try {
    const client = await pool.connect();
    log(`✅ Connected successfully`, colors.green);
    
    log(`\n🚀 Executing migration...`, colors.cyan);
    await client.query(sql);
    
    log(`✅ Migration applied successfully!`, colors.green);
    
    // Check tables
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    log(`\n📊 Total tables created: ${result.rows[0].count}`, colors.blue);
    
    client.release();
    await pool.end();
    
    log(`\n🎉 Schema is ready!`, colors.green);
    log(`   Next step: npm run db:migrate`, colors.yellow);
    
  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    await pool.end();
    process.exit(1);
  }
}

main().catch(console.error);

