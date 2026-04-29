import { db } from '../db';

/**
 * Migration: Cleanup Old Financial Forms
 * 
 * حذف فرم‌های مالی قدیمی که variableName ندارند
 * این migration قبل از add-financial-evaluation-forms اجرا می‌شود
 */
export async function cleanupOldFinancialForms() {
  console.log('🧹 Cleaning up old financial forms...');

  try {
    // حذف اتصال فرم‌ها به سرویس‌ها
    const deleteLinks = await db.execute(`
      DELETE FROM service_document_requirements 
      WHERE document_requirement_id IN (
        SELECT id FROM document_requirements WHERE category = 'financial_evaluation'
      )
    `);
    
    console.log(`✓ Removed service links for old financial forms`);

    // حذف form submissions مربوط به فرم‌های قدیمی
    const deleteSubmissions = await db.execute(`
      DELETE FROM form_submissions 
      WHERE requirement_id IN (
        SELECT id FROM document_requirements WHERE category = 'financial_evaluation'
      )
    `);
    
    console.log(`✓ Removed form submissions for old financial forms`);

    // حذف فرم‌های قدیمی
    const deleteForms = await db.execute(`
      DELETE FROM document_requirements 
      WHERE category = 'financial_evaluation'
    `);
    
    console.log(`✓ Removed old financial forms`);

    console.log('✅ Cleanup completed successfully');

  } catch (error) {
    console.error('❌ Error cleaning up old financial forms:', error);
    // Don't throw to prevent startup failure
  }
}

