/**
 * موتور محاسبه فرمول‌های مالی
 * 
 * قابلیت‌ها:
 * - محاسبه فرمول‌های ریاضی
 * - Topological Sort برای ترتیب اجرا
 * - پشتیبانی از توابع ABS(), SUM(), AVERAGE()
 * - مدیریت division by zero
 * - تشخیص circular dependency
 */

import { db } from '../db';
import { logger } from '../utils/logger';

export interface FormulaVariable {
  id: number;
  name: string;
  value: number | null;
}

export interface Formula {
  id: number;
  variableId: number;
  variableName: string;
  formulaExpression: string;
  description: string;
  executionOrder: number;
  dependencies: number[]; // variable IDs that this formula depends on
}

export interface CalculationResult {
  success: boolean;
  values: Record<string, number>;
  errors: string[];
  executionLog: Array<{
    variable: string;
    formula: string;
    result: number;
    order: number;
  }>;
}

export class FormulaEngineService {
  
  /**
   * محاسبه تمام فرمول‌ها برای یک مجموعه داده
   */
  async calculateAll(inputVariables: Record<string, number>): Promise<CalculationResult> {
    const result: CalculationResult = {
      success: false,
      values: { ...inputVariables },
      errors: [],
      executionLog: []
    };

    try {
      // 1. دریافت تمام فرمول‌ها
      const formulas = await this.getAllFormulas();
      
      if (formulas.length === 0) {
        logger.warn('No formulas found in database', 'formula-engine');
        result.success = true;
        return result;
      }

      console.log(`📐 Found ${formulas.length} formulas to calculate`);

      // 2. مرتب‌سازی فرمول‌ها با Topological Sort
      const sortedFormulas = await this.resolveDependencies(formulas);
      
      console.log(`✅ Formulas sorted by dependencies`);

      // 3. محاسبه هر فرمول به ترتیب
      for (const formula of sortedFormulas) {
        try {
          const calculatedValue = this.evaluate(formula.formulaExpression, result.values);
          
          result.values[formula.variableName] = calculatedValue;
          
          result.executionLog.push({
            variable: formula.variableName,
            formula: formula.formulaExpression,
            result: calculatedValue,
            order: formula.executionOrder
          });

          console.log(`  ✓ ${formula.variableName} = ${calculatedValue}`);

        } catch (error) {
          const errorMsg = `خطا در محاسبه ${formula.variableName}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg, 'formula-engine', error as Error);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      const errorMsg = `خطای کلی در موتور محاسبه: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg, 'formula-engine', error as Error);
      return result;
    }
  }

  /**
   * محاسبه یک فرمول با متغیرهای داده شده
   */
  evaluate(formula: string, variables: Record<string, number>): number {
    try {
      // 1. پردازش توابع
      let processedFormula = this.processFunctions(formula, variables);

      // 2. جایگذاری متغیرها
      processedFormula = this.replaceVariables(processedFormula, variables);

      // 3. اعتبارسنجی expression
      if (!this.isSafeExpression(processedFormula)) {
        throw new Error(`فرمول ناامن: ${processedFormula}`);
      }

      // 4. محاسبه
      const result = this.safeEval(processedFormula);

      // 5. بررسی نتیجه
      if (!isFinite(result)) {
        throw new Error('نتیجه محاسبه نامعتبر است (Infinity یا NaN)');
      }

      return result;

    } catch (error) {
      throw new Error(`خطا در محاسبه فرمول "${formula}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * پردازش توابع در فرمول (ABS, SUM, AVERAGE)
   */
  private processFunctions(formula: string, variables: Record<string, number>): string {
    let processed = formula;

    // تابع ABS()
    processed = processed.replace(/ABS\(([^)]+)\)/g, (match, expr) => {
      const cleanExpr = this.replaceVariables(expr.trim(), variables);
      const value = this.safeEval(cleanExpr);
      return Math.abs(value).toString();
    });

    // تابع SUM()
    processed = processed.replace(/SUM\(([^)]+)\)/g, (match, expr) => {
      const items = expr.split(',').map((item: string) => {
        const cleanItem = this.replaceVariables(item.trim(), variables);
        return this.safeEval(cleanItem);
      });
      return items.reduce((sum: number, val: number) => sum + val, 0).toString();
    });

    // تابع AVERAGE()
    processed = processed.replace(/AVERAGE\(([^)]+)\)/g, (match, expr) => {
      const items = expr.split(',').map((item: string) => {
        const cleanItem = this.replaceVariables(item.trim(), variables);
        return this.safeEval(cleanItem);
      });
      const average = items.length > 0 ? items.reduce((sum: number, val: number) => sum + val, 0) / items.length : 0;
      return average.toString();
    });

    return processed;
  }

  /**
   * جایگذاری متغیرها با مقادیر عددی
   */
  private replaceVariables(expression: string, variables: Record<string, number>): string {
    let result = expression;

    // مرتب‌سازی بر اساس طول (طولانی‌ترها اول) برای جلوگیری از تداخل
    const sortedVarNames = Object.keys(variables).sort((a, b) => b.length - a.length);

    for (const varName of sortedVarNames) {
      const value = variables[varName];
      if (value !== undefined && value !== null) {
        // استفاده از word boundary برای جلوگیری از replace اشتباه
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        result = result.replace(regex, value.toString());
      }
    }

    return result;
  }

  /**
   * بررسی امنیت expression قبل از eval
   */
  private isSafeExpression(expr: string): boolean {
    // فقط اعداد، فضای خالی، و عملگرهای ریاضی مجاز هستند
    const safePattern = /^[\d\s\+\-\*\/\(\)\.]+$/;
    return safePattern.test(expr);
  }

  /**
   * محاسبه ایمن expression ریاضی
   */
  private safeEval(expression: string): number {
    const trimmed = expression.trim();

    // اگر عدد ساده است
    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // بررسی division by zero
    if (/\/\s*0(?!\d)/.test(trimmed)) {
      throw new Error('تقسیم بر صفر');
    }

    try {
      // استفاده از Function constructor (امن‌تر از eval)
      const func = new Function('return ' + trimmed);
      const result = func();
      
      if (typeof result !== 'number') {
        throw new Error('نتیجه باید عدد باشد');
      }

      return result;
    } catch (error) {
      throw new Error(`خطا در محاسبه: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Topological Sort برای ترتیب اجرای فرمول‌ها (Kahn's Algorithm)
   */
  async resolveDependencies(formulas: Formula[]): Promise<Formula[]> {
    // ساخت گراف وابستگی
    const graph = new Map<number, number[]>(); // formulaId -> dependent formula IDs
    const inDegree = new Map<number, number>(); // formulaId -> in-degree count
    const formulaMap = new Map<number, Formula>();

    // مقداردهی اولیه
    for (const formula of formulas) {
      graph.set(formula.id, []);
      inDegree.set(formula.id, 0);
      formulaMap.set(formula.id, formula);
    }

    // ساخت یال‌های گراف
    for (const formula of formulas) {
      for (const depVariableId of formula.dependencies) {
        // پیدا کردن فرمول‌هایی که متغیر وابسته را محاسبه می‌کنند
        const dependentFormulas = formulas.filter(f => f.variableId === depVariableId);
        
        for (const depFormula of dependentFormulas) {
          // depFormula باید قبل از formula اجرا شود
          graph.get(depFormula.id)?.push(formula.id);
          inDegree.set(formula.id, (inDegree.get(formula.id) || 0) + 1);
        }
      }
    }

    // Kahn's Algorithm
    const queue: number[] = [];
    const sorted: Formula[] = [];

    // پیدا کردن نودهایی با in-degree صفر
    for (const [formulaId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(formulaId);
      }
    }

    // پردازش صف
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentFormula = formulaMap.get(currentId)!;
      sorted.push(currentFormula);

      // کاهش in-degree همسایگان
      const neighbors = graph.get(currentId) || [];
      for (const neighborId of neighbors) {
        const newDegree = (inDegree.get(neighborId) || 1) - 1;
        inDegree.set(neighborId, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighborId);
        }
      }
    }

    // بررسی circular dependency
    if (sorted.length !== formulas.length) {
      throw new Error(`Circular dependency detected! ${sorted.length} از ${formulas.length} فرمول قابل اجرا هستند`);
    }

    return sorted;
  }

  /**
   * استخراج نام متغیرهای استفاده شده در فرمول
   */
  parseFormula(formula: string): string[] {
    // حذف توابع از فرمول
    let cleaned = formula.replace(/ABS\(([^)]+)\)/g, '$1');
    cleaned = cleaned.replace(/SUM\(([^)]+)\)/g, '$1');
    cleaned = cleaned.replace(/AVERAGE\(([^)]+)\)/g, '$1');

    // پیدا کردن کلمات (متغیرها)
    const pattern = /\b[a-z_][a-z0-9_]*\b/gi;
    const matches = cleaned.match(pattern) || [];

    // فیلتر کردن duplicates
    return [...new Set(matches)];
  }

  /**
   * دریافت تمام فرمول‌ها از دیتابیس
   */
  private async getAllFormulas(): Promise<Formula[]> {
    try {
      const formulasResult = await db.execute(`
        SELECT 
          ff.id,
          ff.variable_id as variableId,
          ff.formula_expression as formulaExpression,
          ff.description,
          ff.execution_order as executionOrder,
          irv.name as variableName
        FROM financial_formulas ff
        JOIN investment_report_variables irv ON ff.variable_id = irv.id
        WHERE ff.is_active = true
        ORDER BY ff.execution_order
      `);

      const formulas: Formula[] = [];

      for (const row of formulasResult.rows) {
        const formula = row as any;
        
        // دریافت وابستگی‌ها
        const depsResult = await db.execute(`
          SELECT depends_on_variable_id as dependsOnVariableId
          FROM formula_dependencies
          WHERE formula_id = ?
        `, [formula.id]);

        const dependencies = depsResult.rows.map((dep: any) => dep.dependsOnVariableId);

        formulas.push({
          id: formula.id,
          variableId: formula.variableId,
          variableName: formula.variableName,
          formulaExpression: formula.formulaExpression,
          description: formula.description || '',
          executionOrder: formula.executionOrder,
          dependencies
        });
      }

      return formulas;

    } catch (error) {
      logger.error('Error fetching formulas', 'formula-engine', error as Error);
      throw new Error('خطا در دریافت فرمول‌ها از دیتابیس');
    }
  }

  /**
   * اعتبارسنجی ترازنامه (Assets = Equity + Liabilities)
   */
  validateBalanceSheet(values: Record<string, number>): {
    isValid: boolean;
    difference: number;
    message: string;
  } {
    const assets = values.total_assets || 0;
    const equityAndLiabilities = values.total_equity_and_liabilities || 0;
    const difference = Math.abs(assets - equityAndLiabilities);

    // تلرانس برای خطاهای رند کردن (کمتر از 5 میلیون ریال - برای مقیاس‌های بزرگ)
    const tolerance = 5;
    const isValid = difference < tolerance;

    return {
      isValid,
      difference,
      message: isValid 
        ? 'ترازنامه متوازن است ✓' 
        : `عدم توازن ترازنامه: اختلاف ${difference.toFixed(2)} میلیون ریال`
    };
  }

  /**
   * فرمت کردن نتیجه برای نمایش
   */
  formatValue(value: number, dataType: string = 'number'): string {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (dataType) {
      case 'currency':
        return value.toLocaleString('fa-IR') + ' میلیون ریال';
      case 'percentage':
        return (value * 100).toFixed(2) + '%';
      case 'number':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  }
}

export const formulaEngineService = new FormulaEngineService();

