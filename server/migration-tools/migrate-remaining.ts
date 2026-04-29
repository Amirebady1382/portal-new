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

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

async function main() {
  const sqliteClient = createClient({ url: 'file:database.db' });
  const pgPool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const client = await pgPool.connect();
  
  log('═══════════════════════════════════════════════', colors.cyan);
  log('   Migrating Remaining Tables', colors.cyan);
  log('═══════════════════════════════════════════════', colors.cyan);
  
  try {
    // 1. Migrate services (without service_id column issue)
    log('\n📦 Migrating services...', colors.cyan);
    const servicesResult = await sqliteClient.execute('SELECT * FROM services');
    
    for (const row of servicesResult.rows as any[]) {
      // Fix datetime values
      const createdAt = row.created_at?.includes("datetime('now')") ? null : row.created_at;
      const updatedAt = row.updated_at?.includes("datetime('now')") ? null : row.updated_at;
      
      await client.query(`
        INSERT INTO services (id, title, description, department, category, icon, estimated_days, requirements, is_active, sort_order, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), COALESCE($13, NOW()))
        ON CONFLICT DO NOTHING
      `, [
        row.id,
        row.title,
        row.description,
        row.department,
        row.category,
        row.icon,
        row.estimated_days,
        row.requirements,
        Boolean(row.is_active),
        row.sort_order,
        row.created_by,
        createdAt,
        updatedAt
      ]);
    }
    
    await client.query(`SELECT setval(pg_get_serial_sequence('services', 'id'), COALESCE((SELECT MAX(id) FROM services), 1), true)`);
    log(`✅ Migrated ${servicesResult.rows.length} services`, colors.green);
    
    // 2. Migrate document_requirements (skip service_id column)
    log('\n📦 Migrating document_requirements...', colors.cyan);
    const reqResult = await sqliteClient.execute('SELECT * FROM document_requirements');
    
    for (const row of reqResult.rows as any[]) {
      const createdAt = row.created_at?.includes("datetime('now')") ? null : row.created_at;
      const updatedAt = row.updated_at?.includes("datetime('now')") ? null : row.updated_at;
      
      await client.query(`
        INSERT INTO document_requirements (id, title, department, category, description, fields, is_required, "order", is_active, access_type, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), COALESCE($13, NOW()))
        ON CONFLICT DO NOTHING
      `, [
        row.id,
        row.title,
        row.department,
        row.category,
        row.description,
        row.fields,
        Boolean(row.is_required),
        row.order,
        Boolean(row.is_active),
        row.access_type,
        row.created_by,
        createdAt,
        updatedAt
      ]);
    }
    
    await client.query(`SELECT setval(pg_get_serial_sequence('document_requirements', 'id'), COALESCE((SELECT MAX(id) FROM document_requirements), 1), true)`);
    log(`✅ Migrated ${reqResult.rows.length} document_requirements`, colors.green);
    
    // 3. Migrate contract_variables
    log('\n📦 Migrating contract_variables...', colors.cyan);
    const varResult = await sqliteClient.execute('SELECT * FROM contract_variables');
    
    let varCount = 0;
    for (const row of varResult.rows as any[]) {
      const createdAt = row.created_at?.includes("datetime('now')") ? null : row.created_at;
      const updatedAt = row.updated_at?.includes("datetime('now')") ? null : row.updated_at;
      
      await client.query(`
        INSERT INTO contract_variables (id, name, label, description, data_type, source, default_value, is_required, validation_rules, placeholder, category, is_active, sort_order, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, NOW()), COALESCE($16, NOW()))
        ON CONFLICT DO NOTHING
      `, [
        row.id,
        row.name,
        row.label,
        row.description,
        row.data_type,
        row.source,
        row.default_value,
        Boolean(row.is_required),
        row.validation_rules,
        row.placeholder,
        row.category,
        Boolean(row.is_active),
        row.sort_order,
        row.created_by,
        createdAt,
        updatedAt
      ]);
      varCount++;
      
      if (varCount % 50 === 0) {
        log(`   Progress: ${varCount}/${varResult.rows.length}`, colors.yellow);
      }
    }
    
    await client.query(`SELECT setval(pg_get_serial_sequence('contract_variables', 'id'), COALESCE((SELECT MAX(id) FROM contract_variables), 1), true)`);
    log(`✅ Migrated ${varResult.rows.length} contract_variables`, colors.green);
    
    // 4. Migrate service_document_requirements
    log('\n📦 Migrating service_document_requirements...', colors.cyan);
    const sdrResult = await sqliteClient.execute('SELECT * FROM service_document_requirements');
    
    for (const row of sdrResult.rows as any[]) {
      const createdAt = row.created_at?.includes("datetime('now')") ? null : row.created_at;
      
      await client.query(`
        INSERT INTO service_document_requirements (id, service_id, document_requirement_id, department, is_required, sort_order, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
        ON CONFLICT DO NOTHING
      `, [
        row.id,
        row.service_id,
        row.document_requirement_id,
        row.department,
        Boolean(row.is_required),
        row.sort_order,
        row.created_by,
        createdAt
      ]);
    }
    
    await client.query(`SELECT setval(pg_get_serial_sequence('service_document_requirements', 'id'), COALESCE((SELECT MAX(id) FROM service_document_requirements), 1), true)`);
    log(`✅ Migrated ${sdrResult.rows.length} service_document_requirements`, colors.green);
    
    log('\n═══════════════════════════════════════════════', colors.cyan);
    log('   🎉 All remaining data migrated!', colors.green);
    log('═══════════════════════════════════════════════', colors.cyan);
    
  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    client.release();
    await pgPool.end();
  }
}

main();

