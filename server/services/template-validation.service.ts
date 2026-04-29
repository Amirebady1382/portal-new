import { storage } from '../storage';
import { unifiedVariableManager } from './unified-variable-manager.service';
import * as fs from 'fs/promises';
import PizZip from 'pizzip';

interface ValidationResult {
  isValid: boolean;
  missingVariables: Array<{
    name: string;
    context: string;
    suggestions: {
      shouldCreate: boolean;
      suggestedLabel: string;
      suggestedType: string;
      suggestedSource: string;
    };
  }>;
  validVariables: string[];
  warnings: string[];
  errors: string[];
  stats: {
    total: number;
    valid: number;
    missing: number;
  };
}

export class TemplateValidationService {
  
  /**
   * Validate template variables against system variables
   */
  async validateTemplateVariables(
    templatePath: string,
    autoCreateMissing = false,
    createdBy?: number
  ): Promise<ValidationResult> {
    console.log(`🔍 Validating template variables: ${templatePath}`);

    const result: ValidationResult = {
      isValid: true,
      missingVariables: [],
      validVariables: [],
      warnings: [],
      errors: [],
      stats: {
        total: 0,
        valid: 0,
        missing: 0
      }
    };

    try {
      // استخراج متغیرها از قالب
      const extraction = await unifiedVariableManager.extractVariables(templatePath, {
        useCache: false,
        fixBrokenVariables: true,
        detectSource: true
      });

      result.stats.total = extraction.variables.length;

      // بررسی تگ‌های خراب (Malformed Tags)
      try {
        const templateBuffer = await fs.readFile(templatePath);
        const zip = new PizZip(templateBuffer);
        const docXml = zip.file('word/document.xml');

        if (docXml) {
          const xmlContent = docXml.asText();
          const openBraces = (xmlContent.match(/\{\{/g) || []).length;
          const closeBraces = (xmlContent.match(/\}\}/g) || []).length;

          if (openBraces !== closeBraces) {
            result.warnings.push(`هشدار: عدم توازن در تگ‌ها ({{ ${openBraces} مورد، }} ${closeBraces} مورد). لطفاً فایل را بررسی کنید.`);
          }

          // Check for {{ nested inside {{ (e.g. {{ var {{ )
          if (/\{\{[^}]*\{\{/.test(xmlContent)) {
             result.warnings.push('هشدار: تگ‌های تو در تو شناسایی شد ({{ ... {{). این معمولاً نشان‌دهنده خطای تایپی است.');
          }
        }
      } catch (e) {
        console.warn('Malformed tag check failed:', e);
      }

      // بررسی هر متغیر
      for (const variable of extraction.variables) {
        // چک کردن وجود در سیستم
        const systemVariable = await storage.getContractVariableByName(variable.name);

        if (systemVariable) {
          result.validVariables.push(variable.name);
          result.stats.valid++;
        } else {
          result.isValid = false;
          result.stats.missing++;
          
          result.missingVariables.push({
            name: variable.name,
            context: variable.context || '',
            suggestions: {
              shouldCreate: true,
              suggestedLabel: variable.label || variable.name,
              suggestedType: variable.type as string,
              suggestedSource: variable.source as string
            }
          });

          // خودکار ایجاد متغیر (اگر فعال باشد)
          if (autoCreateMissing && createdBy) {
            try {
              await storage.createContractVariable({
                name: variable.name,
                label: variable.label || variable.name,
                description: `متغیر خودکار شناسایی شده از قالب`,
                dataType: variable.type as string || 'text',
                source: variable.source as string || 'form',
                category: variable.category as string || 'other',
                defaultValue: null,
                isRequired: variable.required || false,
                validationRules: null,
                placeholder: null,
                isActive: true,
                sortOrder: 0,
                createdBy
              } as any);
              
              console.log(`✅ Auto-created variable: ${variable.name}`);
              result.warnings.push(`متغیر "${variable.name}" به صورت خودکار ایجاد شد`);
            } catch (error) {
              console.error(`❌ Failed to auto-create variable ${variable.name}:`, error);
              result.errors.push(`خطا در ایجاد خودکار متغیر "${variable.name}"`);
            }
          }
        }
      }

      // اضافه کردن warnings
      if (result.missingVariables.length > 0 && !autoCreateMissing) {
        result.warnings.push(
          `${result.missingVariables.length} متغیر در سیستم تعریف نشده است. لطفاً ابتدا این متغیرها را تعریف کنید.`
        );
      }

      console.log(`✅ Validation completed: ${result.stats.valid}/${result.stats.total} valid`);

      return result;

    } catch (error) {
      console.error('❌ Template validation error:', error);
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'خطا در اعتبارسنجی قالب');
      return result;
    }
  }

  /**
   * Get missing variables that need to be created
   */
  async getMissingVariables(templatePath: string): Promise<string[]> {
    const validation = await this.validateTemplateVariables(templatePath, false);
    return validation.missingVariables.map(v => v.name);
  }

  /**
   * Auto-create missing variables for a template
   */
  async autoCreateMissingVariables(
    templatePath: string,
    createdBy: number
  ): Promise<{ created: number; errors: string[] }> {
    const validation = await this.validateTemplateVariables(templatePath, true, createdBy);
    
    return {
      created: validation.stats.missing,
      errors: validation.errors
    };
  }
}

export const templateValidationService = new TemplateValidationService();

