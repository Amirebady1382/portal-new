import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../shared/schema.js';
import { logger } from './utils/logger';

// PostgreSQL connection configuration
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required for PostgreSQL');
}

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: databaseUrl,
  max: process.env.NODE_ENV === "production" ? 50 : 20,
  allowExitOnIdle: false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error('❌ Unexpected error on idle PostgreSQL client', 'database', err);

});

// Create Drizzle instance
export const drizzleDb = drizzle(pool, { schema });

// Compatibility layer for @libsql/client (SQLite style)
// This allows us to keep using the existing storage.ts without rewriting all queries immediately.
export const db = {
  execute: async (sql: string | { sql: string; args: any[] }, args?: any[]) => {
    let queryText = typeof sql === 'string' ? sql : sql.sql;
    let queryArgs = typeof sql === 'string' ? args : sql.args;

    // Convert ? placeholders to $1, $2, etc. for Postgres
    if (queryText.includes('?')) {
      let newQuery = '';
      let paramCount = 1;
      let inQuote = false;
      let quoteChar = '';

      for (let i = 0; i < queryText.length; i++) {
        const char = queryText[i];

        if (inQuote) {
          newQuery += char;
          if (char === quoteChar) {
            // Check for escaped quote (e.g. 'O''Neil')
            if (i + 1 < queryText.length && queryText[i + 1] === quoteChar) {
              newQuery += quoteChar;
              i++;
            } else {
              inQuote = false;
            }
          }
        } else {
          if (char === "'" || char === '"') {
            inQuote = true;
            quoteChar = char;
            newQuery += char;
          } else if (char === '?') {
            newQuery += `$${paramCount++}`;
          } else {
            newQuery += char;
          }
        }
      }
      queryText = newQuery;
    }

    // SQLite to PostgreSQL translations
    // Replace SQLite-specific types and keywords with PostgreSQL equivalents
    const translateSql = (text: string) => {
      let updated = text;
      updated = updated.replace(/\bINTEGER PRIMARY KEY AUTOINCREMENT\b/gi, 'SERIAL PRIMARY KEY');
      updated = updated.replace(/\bDATETIME\b/gi, 'TIMESTAMP');
      updated = updated.replace(/\bBOOLEAN\s+DEFAULT\s+1\b/gi, 'BOOLEAN DEFAULT true');
      updated = updated.replace(/\bBOOLEAN\s+DEFAULT\s+0\b/gi, 'BOOLEAN DEFAULT false');
      
      if (updated.toUpperCase().includes('INSERT OR IGNORE')) {
        updated = updated.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
        if (!updated.toUpperCase().includes('ON CONFLICT')) {
          updated = updated.trim();
          if (updated.endsWith(';')) updated = updated.slice(0, -1);
          updated += ' ON CONFLICT DO NOTHING';
        }
      }
      return updated;
    };

    if (!queryText.includes("'")) {
      queryText = translateSql(queryText);
    } else {
      // For queries with quotes, we still apply these but they are less likely to conflict 
      // with string literals if we use word boundaries (\b)
      queryText = translateSql(queryText);
    }

    // Convert datetime('now') to NOW()
    if (queryText.includes("datetime('now')")) {
      queryText = queryText.replace(/datetime\('now'\)/g, 'NOW()');
    }

    // Catch PRAGMA commands and return dummy success to avoid PostgreSQL syntax errors
    if (queryText.toUpperCase().trim().startsWith('PRAGMA')) {
      logger.info(`Skipped SQLite PRAGMA command in PostgreSQL mode: ${queryText}`, 'database');
      return { rows: [], rowsAffected: 0, lastInsertRowid: undefined };
    }

    const startTime = Date.now();

    try {
      // Ensure queryArgs is an array or undefined
      if (queryArgs && !Array.isArray(queryArgs)) {
        queryArgs = [queryArgs];
      }

      const result = await pool.query(queryText, queryArgs);

      const duration = Date.now() - startTime;

      // Log slow queries (> 500ms)
      if (duration > 500) {
        logger.warn(`Slow query: ${duration}ms`, 'database', { query: queryText, args: queryArgs });
      }

      // Compatibility result object matching what storage.ts expects
      // Note: lastInsertRowid is generally not available in PG INSERTs unless we use RETURNING.
      // storage.ts should use RETURNING * or RETURNING id.
      let lastInsertRowid: number | bigint | undefined = undefined;
      if (result.rows.length > 0 && result.rows[0].id) {
          lastInsertRowid = result.rows[0].id;
      }

      return {
        rows: result.rows,
        rowsAffected: result.rowCount,
        changes: result.rowCount,
        lastInsertRowid: lastInsertRowid,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logDatabase('query', undefined, false, {
        query: queryText,
        args: queryArgs,
        error: error instanceof Error ? error.message : String(error),
        duration
      });
      throw error;
    }
  },
  // Expose raw pool and drizzle instance
  pool,
  drizzle: drizzleDb
};

// Initialize database
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';

export async function initializeDatabase() {
  try {
    logger.info("🔄 بررسی اتصال به PostgreSQL...", "startup");
    const client = await pool.connect();
    // Simple query to verify connection
    await client.query('SELECT NOW()');
    client.release();
    logger.info("✅ PostgreSQL متصل و آماده است", "startup");
    
    logger.info("🔄 اعمال تغییرات اسکیما Drizzle (Migration)...", "startup");
    try {
      await migrate(drizzleDb, { migrationsFolder: path.join(process.cwd(), 'migrations-pg') });
      logger.info("✅ تغییرات اسکیما Drizzle با موفقیت اعمال شد", "startup");
    } catch (migrateError) {
      logger.error("❌ خطا در اعمال تغییرات اسکیما Drizzle", "startup", migrateError instanceof Error ? migrateError : new Error(String(migrateError)));
      // Continue anyway, it might be already migrated or we use the fallback raw queries
    }

    logger.warn("⚠️  برای اعمال دستی تغییرات اسکیما، از دستور 'npm run db:push:pg' استفاده کنید.", "startup");
  } catch (error) {
    logger.error("❌ خطا در اتصال به PostgreSQL", "startup", error instanceof Error ? error : new Error(String(error)));
    // We throw to fail fast if DB is not reachable
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    await pool.end();
    logger.info('✅ PostgreSQL connection pool closed', "shutdown");
  } catch (error) {
    logger.error('❌ Error closing PostgreSQL pool', "shutdown", error instanceof Error ? error : new Error(String(error)));
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
