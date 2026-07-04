import { db } from '../db';

/**
 * Migration: Sync Financial Variables to Contract Variables
 * 
 * کپی کردن متغیرهای مالی از investment_report_variables به contract_variables
 * تا در UI dropdown نمایش داده شوند
 */
export async function syncFinancialVariablesToContract() {
  console.log('🔄 Syncing financial variables to contract_variables...');

  try {
    // دریافت admin ID
    let adminId = 1;
    try {
      const adminUser = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminUser.rows[0]) {
        adminId = (adminUser.rows[0] as any).id;
      }
    } catch (error) {
      console.log('⚠️ Using default admin ID');
    }

    // دریافت متغیرهای مالی که source='form' هستند
    const financialVars = await db.execute(`
      SELECT name, label, description, data_type, source, category, is_required, placeholder, sort_order, default_value
      FROM investment_report_variables
      WHERE source = 'form'
      ORDER BY sort_order
    `);

    console.log(`✓ Found ${financialVars.rows.length} financial variables with source='form'`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const variable of financialVars.rows) {
      const v = variable as any;

      try {
        // بررسی وجود متغیر در contract_variables
        const existingVar = await db.execute(`
          SELECT id FROM contract_variables WHERE name = ?
        `, [v.name]);

        if (existingVar.rows.length > 0) {
          console.log(`  ⊘ Variable "${v.name}" already exists, skipping`);
          skippedCount++;
          continue;
        }

        // درج متغیر جدید
        await db.execute(`
          INSERT INTO contract_variables 
          (name, label, description, data_type, source, category, is_required, placeholder, default_value, sort_order, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          v.name,
          v.label,
          v.description || null,
          v.data_type || 'text',
          v.source,
          v.category || 'financial',
          v.is_required || 0,
          v.placeholder || null,
          v.default_value || null,
          v.sort_order || 0,
          adminId
        ]);

        console.log(`  ✓ Inserted variable: ${v.name} (${v.label})`);
        insertedCount++;

      } catch (insertError) {
        console.warn(`  ⚠️ Could not insert variable ${v.name}:`, insertError);
      }
    }

    console.log(`✅ Sync completed: ${insertedCount} inserted, ${skippedCount} skipped`);

  } catch (error) {
    console.error('❌ Error syncing financial variables:', error);
    // Don't throw to prevent startup failure
  }
}

