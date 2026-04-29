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
  const result = await db.execute('SELECT id, name, variables FROM contract_templates LIMIT 2');

  for (const row of result.rows) {
    const template = row as any;
    console.log('\n=====================================');
    console.log(`Template #${template.id}: ${template.name}`);
    console.log('=====================================');

    if (template.variables) {
      let parsed;
      try {
        parsed = typeof template.variables === 'string'
          ? JSON.parse(template.variables)
          : template.variables;
        console.log('Parsed JSON:');
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Failed to parse:', e);
      }
    } else {
      console.log('No variables field');
    }
  }
}

main().catch(console.error);
