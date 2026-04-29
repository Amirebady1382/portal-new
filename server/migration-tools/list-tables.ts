#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

let databaseUrl = process.env.DATABASE_URL || 'file:database.db';
if (databaseUrl.startsWith('${')) {
  databaseUrl = 'file:database.db';
}
const db = createClient({ url: databaseUrl });

async function main() {
  const result = await db.execute(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `);

  console.log('\n📋 Tables in database:');
  console.log('═══════════════════════════');
  for (const row of result.rows) {
    console.log(`  - ${(row as any).name}`);
  }
  console.log();
}

main().catch(console.error);
