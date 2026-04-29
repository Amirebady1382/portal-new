#!/usr/bin/env tsx
import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:database.db' });

async function main() {
  // Check document_requirements
  const result = await client.execute('PRAGMA table_info(document_requirements)');
  console.log('document_requirements columns:');
  result.rows.forEach((row: any) => {
    console.log(`  - ${row.name}: ${row.type}`);
  });
  
  // Check services
  const result2 = await client.execute('PRAGMA table_info(services)');
  console.log('\nservices columns:');
  result2.rows.forEach((row: any) => {
    console.log(`  - ${row.name}: ${row.type}`);
  });
  
  // Sample data from services
  const result3 = await client.execute('SELECT * FROM services LIMIT 1');
  console.log('\nSample services data:');
  console.log(JSON.stringify(result3.rows[0], null, 2));
}

main().catch(console.error);

