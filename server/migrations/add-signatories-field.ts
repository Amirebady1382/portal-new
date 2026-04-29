import { db } from '../db';

/**
 * Migration: Add signatories field to companies table
 * Adds field for authorized signatories (up to 2 people)
 */
export async function addSignatoriesField() {
  try {
    console.log('🔄 Adding signatories field to companies table...');

    // Check if column already exists
    const tableInfo = await db.execute(`PRAGMA table_info(companies)`);
    const columnExists = tableInfo.rows.some((row: any) => row.name === 'signatories');

    if (columnExists) {
      console.log('✅ Signatories column already exists, skipping...');
      return;
    }

    // Add signatories column
    await db.execute(`
      ALTER TABLE companies 
      ADD COLUMN signatories TEXT
    `);

    console.log('✅ Successfully added signatories field to companies table');
  } catch (error) {
    console.error('❌ Error adding signatories field:', error);
    // Don't throw to prevent startup failure
  }
}

