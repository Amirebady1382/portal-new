#!/usr/bin/env tsx
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@libsql/client';

// Load environment variables
dotenv.config();

// Colors for console output
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

async function testSQLite(): Promise<boolean> {
  try {
    log('\n📦 Testing SQLite Connection...', colors.cyan);
    
    const sqliteUrl = process.env.DATABASE_URL || 'file:database.db';
    const client = createClient({ url: sqliteUrl });
    
    const result = await client.execute('SELECT COUNT(*) as count FROM users');
    const userCount = (result.rows[0] as any).count;
    
    log(`✅ SQLite connected successfully`, colors.green);
    log(`   Users in database: ${userCount}`, colors.blue);
    
    return true;
  } catch (error: any) {
    log(`❌ SQLite connection failed: ${error.message}`, colors.red);
    return false;
  }
}

async function testPostgreSQL(): Promise<boolean> {
  try {
    log('\n🐘 Testing PostgreSQL Connection...', colors.cyan);
    
    const postgresUrl = process.env.POSTGRES_URL;
    
    if (!postgresUrl) {
      log('⚠️  POSTGRES_URL not set in .env file', colors.yellow);
      return false;
    }
    
    const pool = new Pool({ connectionString: postgresUrl });
    
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');
    
    log(`✅ PostgreSQL connected successfully`, colors.green);
    log(`   Time: ${result.rows[0].now}`, colors.blue);
    log(`   Version: ${result.rows[0].version}`, colors.blue);
    
    // Try to count tables
    try {
      const tablesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      log(`   Tables in database: ${tablesResult.rows[0].count}`, colors.blue);
    } catch (error) {
      log(`   Tables: Not yet created (run db:push:pg first)`, colors.yellow);
    }
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error: any) {
    log(`❌ PostgreSQL connection failed: ${error.message}`, colors.red);
    if (error.message.includes('ENOTFOUND')) {
      log(`   Hint: Check if PostgreSQL server is running`, colors.yellow);
    } else if (error.message.includes('password authentication failed')) {
      log(`   Hint: Check username/password in connection string`, colors.yellow);
    } else if (error.message.includes('does not exist')) {
      log(`   Hint: Create the database first`, colors.yellow);
    }
    return false;
  }
}

async function main() {
  log('═══════════════════════════════════════════════', colors.cyan);
  log('   Database Connection Test Tool', colors.cyan);
  log('═══════════════════════════════════════════════', colors.cyan);
  
  const sqliteOk = await testSQLite();
  const postgresOk = await testPostgreSQL();
  
  log('\n═══════════════════════════════════════════════', colors.cyan);
  log('   Summary', colors.cyan);
  log('═══════════════════════════════════════════════', colors.cyan);
  log(`SQLite:     ${sqliteOk ? '✅ OK' : '❌ Failed'}`, sqliteOk ? colors.green : colors.red);
  log(`PostgreSQL: ${postgresOk ? '✅ OK' : '❌ Failed'}`, postgresOk ? colors.green : colors.red);
  
  if (!postgresOk) {
    log('\n⚠️  PostgreSQL Setup Required:', colors.yellow);
    log('   1. Make sure PostgreSQL is installed and running', colors.yellow);
    log('   2. Create a database for your application', colors.yellow);
    log('   3. Set POSTGRES_URL in your .env file', colors.yellow);
    log('   4. Run: npm run db:push:pg', colors.yellow);
  }
  
  if (sqliteOk && postgresOk) {
    log('\n🎉 Both databases are ready! You can now migrate data.', colors.green);
    log('   Run: npm run db:migrate', colors.green);
  }
  
  process.exit(sqliteOk && postgresOk ? 0 : 1);
}

main().catch(console.error);

