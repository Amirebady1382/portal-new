import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../shared/schema-postgres.js';

// PostgreSQL connection configuration
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required for PostgreSQL');
}

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: databaseUrl,
  // Connection pool settings
  max: process.env.NODE_ENV === "production" ? 50 : 20, // Maximum number of clients in pool
  allowExitOnIdle: false,
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if no connection available
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);

});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    return false;
  }
}

// Initialize database (create tables if not exist)
export async function initializeDatabase() {
  try {
    console.log("🔄 بررسی و ایجاد جداول PostgreSQL...");
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to PostgreSQL database');
    }

    console.log("✅ PostgreSQL آماده است");
    console.log("⚠️  برای ایجاد جداول، از Drizzle Kit استفاده کنید: npm run db:push:pg");
    
  } catch (error) {
    console.error("❌ خطا در راه‌اندازی PostgreSQL:", error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    await pool.end();
    console.log('✅ PostgreSQL connection pool closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL pool:', error);
    throw error;
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

export default db;

