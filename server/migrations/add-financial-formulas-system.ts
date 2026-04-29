import { db } from '../db';

/**
 * Migration: Financial Formulas System
 * 
 * ایجاد جداول برای سیستم فرمول‌های محاسباتی مالی
 * - financial_formulas: فرمول‌های محاسباتی (33 فرمول)
 * - formula_dependencies: وابستگی‌های فرمول‌ها (برای Topological Sort)
 */
export async function addFinancialFormulasSystem() {
  console.log('🔄 Adding financial formulas system tables...');

  try {
    // 1. جدول financial_formulas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS financial_formulas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variable_id INTEGER NOT NULL,
        formula_expression TEXT NOT NULL,
        description TEXT,
        execution_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log('✅ Created table: financial_formulas');

    // 2. جدول formula_dependencies  
    await db.execute(`
      CREATE TABLE IF NOT EXISTS formula_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        formula_id INTEGER NOT NULL,
        depends_on_variable_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (formula_id) REFERENCES financial_formulas(id) ON DELETE CASCADE,
        UNIQUE(formula_id, depends_on_variable_id)
      )
    `);
    console.log('✅ Created table: formula_dependencies');

    // 3. Indexes برای بهبود performance
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_formulas_variable ON financial_formulas(variable_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_formulas_execution_order ON financial_formulas(execution_order)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_dependencies_formula ON formula_dependencies(formula_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_dependencies_variable ON formula_dependencies(depends_on_variable_id)`);
    
    console.log('✅ Created indexes for financial formulas system');

  } catch (error) {
    console.error('❌ Error creating financial formulas system:', error);
    // Don't throw to prevent startup failure
  }
}

