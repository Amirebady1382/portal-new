import * as fs from 'fs/promises';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { 
  unifiedVariableManager,
  type Variable,
  type ExtractionResult as UnifiedExtractionResult,
  type ProcessingResult
} from './unified-variable-manager.service';

// Compatibility types for existing code
export interface ExtractedVariable extends Variable {}

export interface ExtractionResult extends UnifiedExtractionResult {}

/**
 * سرویس استخراج متغیر پیشرفته - با استفاده از Unified Variable Manager
 * 
 * @deprecated استفاده مستقیم از unifiedVariableManager توصیه می‌شود
 * این کلاس برای سازگاری با کد موجود باقی مانده است
 */
export class EnhancedVariableExtractionService {
  
  /**
   * استخراج متغیرها از فایل Word
   * 
   * @param filePath مسیر فایل Word
   * @param useCache استفاده از cache
   * @returns نتیجه استخراج
   */
  async extractVariables(
    filePath: string,
    useCache: boolean = true
  ): Promise<ExtractionResult> {
    console.log('🔄 Using Enhanced Variable Extraction Service (delegating to Unified Manager)');
    
    return await unifiedVariableManager.extractVariables(filePath, {
      useCache,
      fixBrokenVariables: true,
      detectSource: true,
      generateRecommendations: true
    });
  }

  // تمام متدهای قدیمی حذف شدند و به unifiedVariableManager منتقل شدند

  /**
   * اعمال متغیرها به سند Word
   * 
   * @param filePath مسیر فایل Word
   * @param variables متغیرها
   * @param replacementData داده‌های جایگزین
   * @returns Buffer فایل پردازش شده
   */
  async applyVariablesAdvanced(
    filePath: string,
    variables: ExtractedVariable[],
    replacementData: Record<string, any>
  ): Promise<Buffer> {
    console.log('🔄 Applying variables using Unified Variable Manager');
    
    const result = await unifiedVariableManager.processDocumentWithVariables(
      filePath,
      replacementData,
      {
        fixBrokenVariables: true
      }
    );
    
    if (!result.success || !result.processedBuffer) {
      throw new Error(`خطا در اعمال متغیرها: ${result.errors.join(', ')}`);
    }
    
    console.log(`✅ Variables applied: ${result.replacedCount} replacements`);
    return result.processedBuffer;
  }

  /**
   * پاکسازی cache
   */
  clearCache(): void {
    unifiedVariableManager.clearCache();
    console.log('🗑️ Variable extraction cache cleared (via Unified Manager)');
  }
}

export const enhancedVariableExtractionService = new EnhancedVariableExtractionService();
