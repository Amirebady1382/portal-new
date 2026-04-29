#!/usr/bin/env tsx
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

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
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// List of tables to migrate in order (respecting foreign key constraints)
const TABLES_ORDER = [
  // 1. Core tables first (no dependencies)
  'users',
  'departments',
  
  // 2. Tables depending ONLY on users
  'otp_codes',
  'system_settings',
  'audit_logs',
  'contract_templates',
  'document_requirements',
  'services',
  'contract_variables',
  'authorized_phones',
  'bale_users',
  
  // 3. Companies (no FK to documents yet - we'll handle circular FK later)
  'companies',
  
  // 4. Tables depending on companies and/or users (but NOT on documents)
  'user_companies',
  'conversations',
  'company_services',
  'service_requests',
  'document_requirement_access',
  'bale_conversations',
  'contract_form_data',
  'bale_employee_mappings',
  'contract_variable_mappings',
  
  // 5. Documents (depends on companies and users)
  'documents',
  
  // 6. Tables with deeper dependencies
  'messages',
  'form_submissions',
  'request_status_history',
  'service_request_workflow',
  'bale_messages',
  'service_document_requirements',
  'financial_formulas',
  'formula_dependencies',
];

interface MigrationStats {
  table: string;
  rows: number;
  success: boolean;
  error?: string;
  duration: number;
}

class DatabaseMigrator {
  private sqliteClient: any;
  private pgPool: Pool;
  private stats: MigrationStats[] = [];
  
  constructor(sqliteUrl: string, postgresUrl: string) {
    this.sqliteClient = createClient({ url: sqliteUrl });
    this.pgPool = new Pool({ connectionString: postgresUrl });
  }
  
  async testConnections(): Promise<boolean> {
    try {
      log('🔍 Testing database connections...', colors.cyan);
      
      // Test SQLite
      await this.sqliteClient.execute('SELECT 1');
      log('✅ SQLite connection successful', colors.green);
      
      // Test PostgreSQL
      const client = await this.pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      log('✅ PostgreSQL connection successful', colors.green);
      
      return true;
    } catch (error: any) {
      log(`❌ Connection test failed: ${error.message}`, colors.red);
      return false;
    }
  }
  
  async checkPostgreSQLSchema(): Promise<boolean> {
    try {
      const client = await this.pgPool.connect();
      const result = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      client.release();
      
      if (result.rows[0].count === '0') {
        log('❌ PostgreSQL schema not initialized', colors.red);
        log('   Run: npm run db:push:pg', colors.yellow);
        return false;
      }
      
      log('✅ PostgreSQL schema exists', colors.green);
      return true;
    } catch (error: any) {
      log(`❌ Schema check failed: ${error.message}`, colors.red);
      return false;
    }
  }
  
  async getTableRowCount(tableName: string): Promise<number> {
    try {
      const result = await this.sqliteClient.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      return (result.rows[0] as any).count || 0;
    } catch (error) {
      return 0;
    }
  }
  
  async migrateCompaniesSpecial(): Promise<MigrationStats> {
    const startTime = Date.now();
    const stat: MigrationStats = {
      table: 'companies',
      rows: 0,
      success: false,
      duration: 0,
    };
    
    try {
      const rowCount = await this.getTableRowCount('companies');
      stat.rows = rowCount;
      
      if (rowCount === 0) {
        log(`   ⚠️  Table is empty, skipping`, colors.yellow);
        stat.success = true;
        stat.duration = Date.now() - startTime;
        return stat;
      }
      
      log(`   Found ${rowCount} rows`, colors.blue);
      
      // Fetch all data
      const result = await this.sqliteClient.execute(`SELECT * FROM companies`);
      const rows = result.rows;
      
      if (rows.length === 0) {
        stat.success = true;
        stat.duration = Date.now() - startTime;
        return stat;
      }
      
      const columns = Object.keys(rows[0]);
      const client = await this.pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        let migratedCount = 0;
        for (const row of rows) {
          const values = columns.map((col) => {
            const value = (row as any)[col];
            
            // Skip tax_declaration_document_id for now (circular FK)
            if (col === 'tax_declaration_document_id') {
              return null;
            }
            
            // Convert boolean
            if (typeof value === 'number' && (value === 0 || value === 1)) {
              const booleanColumns = ['is_active'];
              if (booleanColumns.some(bc => col.includes(bc))) {
                return value === 1;
              }
            }
            
            // Handle datetime
            if (typeof value === 'string' && value.includes("datetime('now')")) {
              return null;
            }
            
            if (value === null || value === undefined) {
              return null;
            }
            
            return value;
          });
          
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const columnNames = columns.map(col => `"${col}"`).join(', ');
          const query = `INSERT INTO companies (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          
          try {
            await client.query(query, values);
            migratedCount++;
          } catch (error: any) {
            log(`   ⚠️  Error inserting row: ${error.message}`, colors.yellow);
          }
        }
        
        // Update sequence
        await client.query(`
          SELECT setval(pg_get_serial_sequence('companies', 'id'), 
                       COALESCE((SELECT MAX(id) FROM companies), 1), 
                       true)
        `);
        
        await client.query('COMMIT');
        log(`   ✅ Migrated ${migratedCount}/${rowCount} rows`, colors.green);
        stat.success = true;
        
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error: any) {
      stat.error = error.message;
      log(`   ❌ Migration failed: ${error.message}`, colors.red);
    }
    
    stat.duration = Date.now() - startTime;
    return stat;
  }
  
  async migrateTable(tableName: string): Promise<MigrationStats> {
    const startTime = Date.now();
    const stat: MigrationStats = {
      table: tableName,
      rows: 0,
      success: false,
      duration: 0,
    };
    
    try {
      log(`\n📦 Migrating table: ${tableName}`, colors.cyan);
      
      // Special handling for companies table (circular FK with documents)
      if (tableName === 'companies') {
        return await this.migrateCompaniesSpecial();
      }
      
      // Get row count
      const rowCount = await this.getTableRowCount(tableName);
      stat.rows = rowCount;
      
      if (rowCount === 0) {
        log(`   ⚠️  Table is empty, skipping`, colors.yellow);
        stat.success = true;
        stat.duration = Date.now() - startTime;
        return stat;
      }
      
      log(`   Found ${rowCount} rows`, colors.blue);
      
      // Fetch all data from SQLite
      const result = await this.sqliteClient.execute(`SELECT * FROM ${tableName}`);
      const rows = result.rows;
      
      if (rows.length === 0) {
        log(`   ✅ No data to migrate`, colors.green);
        stat.success = true;
        stat.duration = Date.now() - startTime;
        return stat;
      }
      
      // Get column names
      const columns = Object.keys(rows[0]);
      
      // Connect to PostgreSQL
      const client = await this.pgPool.connect();
      
      try {
        // Begin transaction
        await client.query('BEGIN');
        
        // Migrate each row
        let migratedCount = 0;
        for (const row of rows) {
          // Filter out columns that don't exist in PostgreSQL schema
          const columnsToMigrate = columns.filter(col => {
            // Skip service_id in document_requirements (old schema)
            if (tableName === 'document_requirements' && col === 'service_id') {
              return false;
            }
            return true;
          });
          
          const values = columnsToMigrate.map((col) => {
            const value = (row as any)[col];
            
            // Convert SQLite boolean (0/1) to PostgreSQL boolean
            if (typeof value === 'number' && (value === 0 || value === 1)) {
              // Check if column might be boolean
              const booleanColumns = ['is_active', 'is_owner', 'is_required', 'is_editable', 
                                     'is_authenticated', 'is_delivered', 'is_complete', 'is_used'];
              if (booleanColumns.some(bc => col.includes(bc))) {
                return value === 1;
              }
            }
            
            // Handle SQLite datetime as ISO string - if looks like ISO, keep it
            if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
              return value; // It's already a valid timestamp
            }
            
            // Handle SQLite datetime('now') - convert to NULL (will use PostgreSQL default)
            if (typeof value === 'string' && value.includes("datetime('now')")) {
              return null;
            }
            
            // Handle NULL values
            if (value === null || value === undefined) {
              return null;
            }
            
            return value;
          });
          
          const placeholders = columnsToMigrate.map((_, i) => `$${i + 1}`).join(', ');
          // Quote column names to handle reserved keywords like "order"
          const columnNames = columnsToMigrate.map(col => `"${col}"`).join(', ');
          
          const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          
          try {
            await client.query(query, values);
            migratedCount++;
            
            // Progress indicator
            if (migratedCount % 100 === 0) {
              log(`   Progress: ${migratedCount}/${rowCount}`, colors.blue);
            }
          } catch (error: any) {
            // Log error but continue with other rows
            log(`   ⚠️  Error inserting row: ${error.message}`, colors.yellow);
          }
        }
        
        // Update sequences for SERIAL columns
        if (columns.includes('id')) {
          await client.query(`
            SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 
                         COALESCE((SELECT MAX(id) FROM ${tableName}), 1), 
                         true)
          `);
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        log(`   ✅ Migrated ${migratedCount}/${rowCount} rows`, colors.green);
        stat.success = true;
        
      } catch (error: any) {
        // Rollback on error
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error: any) {
      stat.error = error.message;
      log(`   ❌ Migration failed: ${error.message}`, colors.red);
    }
    
    stat.duration = Date.now() - startTime;
    return stat;
  }
  
  async migrate(): Promise<boolean> {
    log('═══════════════════════════════════════════════', colors.magenta);
    log('   SQLite to PostgreSQL Migration Tool', colors.magenta);
    log('═══════════════════════════════════════════════', colors.magenta);
    
    // Test connections
    if (!(await this.testConnections())) {
      return false;
    }
    
    // Check PostgreSQL schema
    if (!(await this.checkPostgreSQLSchema())) {
      return false;
    }
    
    // Create backup
    log('\n💾 Creating backup of SQLite database...', colors.cyan);
    const backupPath = `database.db.backup-${Date.now()}`;
    try {
      fs.copyFileSync('database.db', backupPath);
      log(`✅ Backup created: ${backupPath}`, colors.green);
    } catch (error: any) {
      log(`⚠️  Backup failed: ${error.message}`, colors.yellow);
    }
    
    // Migrate each table
    log('\n🚀 Starting migration...', colors.cyan);
    const startTime = Date.now();
    
    for (const tableName of TABLES_ORDER) {
      const stat = await this.migrateTable(tableName);
      this.stats.push(stat);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Print summary
    log('\n═══════════════════════════════════════════════', colors.magenta);
    log('   Migration Summary', colors.magenta);
    log('═══════════════════════════════════════════════', colors.magenta);
    
    const successful = this.stats.filter(s => s.success).length;
    const failed = this.stats.filter(s => !s.success).length;
    const totalRows = this.stats.reduce((sum, s) => sum + s.rows, 0);
    
    log(`\nTotal tables: ${this.stats.length}`, colors.blue);
    log(`Successful: ${successful}`, colors.green);
    log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
    log(`Total rows migrated: ${totalRows}`, colors.blue);
    log(`Duration: ${duration}s`, colors.blue);
    
    // Detailed results
    if (this.stats.length > 0) {
      log('\nDetailed Results:', colors.cyan);
      for (const stat of this.stats) {
        const status = stat.success ? '✅' : '❌';
        const color = stat.success ? colors.green : colors.red;
        log(`${status} ${stat.table.padEnd(30)} ${stat.rows.toString().padStart(6)} rows  ${(stat.duration / 1000).toFixed(2)}s`, color);
        if (stat.error) {
          log(`   Error: ${stat.error}`, colors.red);
        }
      }
    }
    
    // Save migration log
    const logPath = `migration-log-${Date.now()}.json`;
    fs.writeFileSync(
      logPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        duration,
        stats: this.stats,
      }, null, 2)
    );
    log(`\n📄 Migration log saved: ${logPath}`, colors.blue);
    
    if (failed === 0) {
      log('\n🎉 Migration completed successfully!', colors.green);
      log('\n📝 Next steps:', colors.cyan);
      log('   1. Test your application with PostgreSQL', colors.yellow);
      log('   2. Update .env to use POSTGRES_URL as DATABASE_URL', colors.yellow);
      log('   3. Restart your application', colors.yellow);
      return true;
    } else {
      log('\n⚠️  Migration completed with errors', colors.yellow);
      log('   Review the errors above and fix them before using PostgreSQL', colors.yellow);
      return false;
    }
  }
  
  async close() {
    await this.pgPool.end();
  }
}

async function main() {
  const sqliteUrl = process.env.DATABASE_URL || 'file:database.db';
  const postgresUrl = process.env.POSTGRES_URL;
  
  if (!postgresUrl) {
    log('❌ POSTGRES_URL not set in .env file', colors.red);
    log('   Add POSTGRES_URL to your .env file:', colors.yellow);
    log('   POSTGRES_URL=postgresql://user:password@localhost:5432/dbname', colors.blue);
    process.exit(1);
  }
  
  const migrator = new DatabaseMigrator(sqliteUrl, postgresUrl);
  
  try {
    const success = await migrator.migrate();
    process.exit(success ? 0 : 1);
  } catch (error: any) {
    log(`\n❌ Migration failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

main().catch(console.error);

