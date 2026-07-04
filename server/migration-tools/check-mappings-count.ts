#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { db } from '../db';

dotenv.config();

async function main() {
  const total = await db.execute('SELECT COUNT(*) as count FROM variable_form_field_mappings');
  const active = await db.execute('SELECT COUNT(*) as count FROM variable_form_field_mappings WHERE is_active = 1');
  const sample = await db.execute('SELECT * FROM variable_form_field_mappings LIMIT 5');

  console.log('Total mappings:', (total.rows[0] as any).count);
  console.log('Active mappings:', (active.rows[0] as any).count);
  console.log('\nSample rows:');
  console.log(JSON.stringify(sample.rows, null, 2));
}

main().catch(console.error);
