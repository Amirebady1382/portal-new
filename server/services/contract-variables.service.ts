import { storage } from "../storage";
import type { 
  ContractVariable, 
  InsertContractVariable,
  ContractVariableMapping,
  InsertContractVariableMapping,
  BaleEmployeeMapping,
  InsertBaleEmployeeMapping
} from "../../shared/schema";

export interface ContractVariableWithMappings extends ContractVariable {
  mappings?: ContractVariableMapping[];
  templateCount?: number;
}

export interface TemplateVariableMapping {
  templateId: number;
  templateName: string;
  variables: Array<{
    variable: ContractVariable;
    mapping: ContractVariableMapping;
  }>;
}

export class ContractVariablesService {
  
  /**
   * Get all contract variables with optional filtering
   */
  async getContractVariables(filters?: {
    category?: string;
    source?: string;
    isActive?: boolean;
  }): Promise<ContractVariableWithMappings[]> {
    return await storage.getContractVariables(filters || {});
  }

  /**
   * Get contract variable by ID
   */
  async getContractVariable(id: number): Promise<ContractVariable | undefined> {
    const result = await storage.getContractVariable(id);
    return result || undefined;
  }

  /**
   * Get contract variable by name
   */
  async getContractVariableByName(name: string): Promise<ContractVariable | undefined> {
    const result = await storage.getContractVariableByName(name);
    return result || undefined;
  }

  /**
   * Create new contract variable
   */
  async createContractVariable(data: InsertContractVariable): Promise<ContractVariable> {
    // Validate variable name format
    if (!this.isValidVariableName(data.name)) {
      throw new Error("نام متغیر باید فقط شامل حروف انگلیسی، اعداد و خط زیر باشد");
    }

    return await storage.createContractVariable(data);
  }

  /**
   * Update contract variable
   */
  async updateContractVariable(id: number, data: Partial<InsertContractVariable>): Promise<ContractVariable> {
    if (data.name && !this.isValidVariableName(data.name)) {
      throw new Error("نام متغیر باید فقط شامل حروف انگلیسی، اعداد و خط زیر باشد");
    }

    return await storage.updateContractVariable(id, data);
  }

  /**
   * Delete contract variable
   */
  async deleteContractVariable(id: number): Promise<void> {
    // Check if variable is used in any templates
    const mappings = await storage.getVariableMappings(id);
    if (mappings.length > 0) {
      const templateNames = mappings.map(m => m.templateName).join('، ');
      throw new Error(`این متغیر در قالب‌های زیر استفاده می‌شود: ${templateNames}`);
    }

    await storage.deleteContractVariable(id);
  }

  /**
   * Get variable categories
   */
  async getVariableCategories(): Promise<Array<{ category: string; count: number }>> {
    // این متد را باید در storage پیاده‌سازی کنیم، فعلاً یک implementation ساده
    const variables = await storage.getContractVariables({});
    const categoryMap = new Map<string, number>();
    
    variables.forEach((v: any) => {
      const cat = v.category || 'other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    
    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count
    }));
  }

  /**
   * Get variables for a specific template
   */
  async getTemplateVariables(templateId: number): Promise<Array<{
    variable: ContractVariable;
    mapping: ContractVariableMapping;
  }>> {
    return await storage.getTemplateVariables(templateId);
  }

  /**
   * Map variable to template
   */
  async mapVariableToTemplate(data: InsertContractVariableMapping): Promise<ContractVariableMapping> {
    return await storage.createVariableMapping(data);
  }

  /**
   * Update variable mapping
   */
  async updateVariableMapping(id: number, data: Partial<InsertContractVariableMapping>): Promise<ContractVariableMapping> {
    return await storage.updateVariableMapping(id, data);
  }

  /**
   * Remove variable from template
   */
  async removeVariableFromTemplate(templateId: number, variableId: number): Promise<void> {
    await storage.deleteVariableMapping(templateId, variableId);
  }

  /**
   * Get all template-variable mappings
   */
  async getTemplateVariableMappings(): Promise<TemplateVariableMapping[]> {
    return await storage.getTemplateVariableMappings();
  }

  /**
   * Bulk update template variables with transaction support
   */
  async bulkUpdateTemplateVariables(
    templateId: number, 
    variables: Array<{
      variableId: number;
      isRequired?: boolean;
      defaultValue?: string;
      sortOrder?: number;
    }>
  ): Promise<void> {
    try {
      // Remove existing mappings
      await storage.clearTemplateVariables(templateId);

      // Add new mappings
      const mappingPromises = variables.map(variable =>
        storage.createVariableMapping({
          templateId,
          variableId: variable.variableId,
          isRequired: variable.isRequired || false,
          defaultValue: variable.defaultValue || null,
          sortOrder: variable.sortOrder || 0,
        })
      );

      await Promise.all(mappingPromises);
      
      console.log(`✅ Bulk updated ${variables.length} template variables for template ${templateId}`);
    } catch (error) {
      console.error(`❌ Error in bulk update for template ${templateId}:`, error);
      throw new Error(`خطا در به‌روزرسانی گروهی متغیرها: ${error instanceof Error ? error.message : 'خطای نامشخص'}`);
    }
  }

  /**
   * Get Bale employee mappings
   */
  async getBaleEmployeeMappings(): Promise<Array<BaleEmployeeMapping & { 
    employeeName: string; 
    employeeDepartment: string 
  }>> {
    return await storage.getBaleEmployeeMappings();
  }

  /**
   * Create Bale employee mapping
   */
  async createBaleEmployeeMapping(data: InsertBaleEmployeeMapping): Promise<BaleEmployeeMapping> {
    // Check if chat ID is already mapped
    const existingMapping = await storage.getBaleEmployeeMappingByChatId(data.baleChatId);
    if (existingMapping) {
      throw new Error("این Chat ID قبلاً به کارمند دیگری اختصاص داده شده است");
    }

    return await storage.createBaleEmployeeMapping(data);
  }

  /**
   * Update Bale employee mapping
   */
  async updateBaleEmployeeMapping(id: number, data: Partial<InsertBaleEmployeeMapping>): Promise<BaleEmployeeMapping> {
    if (data.baleChatId) {
      const existingMapping = await storage.getBaleEmployeeMappingByChatId(data.baleChatId);
      if (existingMapping && existingMapping.id !== id) {
        throw new Error("این Chat ID قبلاً به کارمند دیگری اختصاص داده شده است");
      }
    }

    return await storage.updateBaleEmployeeMapping(id, data);
  }

  /**
   * Delete Bale employee mapping
   */
  async deleteBaleEmployeeMapping(id: number): Promise<void> {
    await storage.deleteBaleEmployeeMapping(id);
  }

  /**
   * Get employee by Bale chat ID
   */
  async getEmployeeByBaleChat(chatId: string): Promise<BaleEmployeeMapping | undefined> {
    return await storage.getBaleEmployeeMappingByChatId(chatId);
  }

  /**
   * Validate variable name format
   */
  private isValidVariableName(name: string): boolean {
    // Only letters, numbers and underscores, must start with letter
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Generate variable configuration for forms
   */
  async generateVariableConfig(templateId: number): Promise<Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    source: string;
    category: string;
  }>> {
    const templateVariables = await this.getTemplateVariables(templateId);
    
    return templateVariables.map(({ variable, mapping }) => ({
      name: variable.name,
      label: variable.label,
      type: variable.dataType,
      required: mapping.isRequired,
      placeholder: variable.placeholder || undefined,
      defaultValue: mapping.defaultValue || variable.defaultValue || undefined,
      source: variable.source,
      category: variable.category || 'other'
    }));
  }

  /**
   * Auto-detect variables from template content
   */
  async detectTemplateVariables(templateContent: string): Promise<string[]> {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = templateContent.match(variablePattern) || [];
    
    const variables = matches
      .map(match => match.replace(/\{\{|\}\}/g, '').trim())
      .filter(variable => variable && !variable.includes('<') && !variable.includes('>'))
      .filter((variable, index, array) => array.indexOf(variable) === index) // Remove duplicates
      .sort();

    return variables;
  }

  /**
   * Suggest variable mappings based on name patterns
   */
  suggestVariableSource(variableName: string): {
    source: 'rasmio' | 'form' | 'calculated' | 'system';
    category: string;
    label: string;
  } {
    const name = variableName.toLowerCase();

    // استفاده از isRasmioVariable مرکزی
    const { isRasmioVariable } = require('../utils/rasmio-field-mapping');
    if (isRasmioVariable(variableName)) {
      return {
        source: 'rasmio',
        category: 'company',
        label: this.generatePersianLabel(variableName)
      };
    }

    // Calculated variables (محاسباتی)
    const calculatedPatterns = [
      /_words$/,
      /_percentage$/,
      /^duration/,
      /^annual_fee/,
      /^commission_amount/,
      /^cash_deposit_percentage$/
    ];
    
    if (calculatedPatterns.some(pattern => pattern.test(name))) {
      return {
        source: 'calculated',
        category: name.includes('amount') || name.includes('fee') ? 'financial' : 'other',
        label: this.generatePersianLabel(variableName)
      };
    }

    // System variables (سیستمی)
    const systemPatterns = [
      /^contract_number$/,
      /^contract_date$/,
      /^current_date$/,
      /^system_/
    ];
    
    if (systemPatterns.some(pattern => pattern.test(name))) {
      return {
        source: 'system',
        category: 'technical',
        label: this.generatePersianLabel(variableName)
      };
    }

    // Date variables (تاریخ - فرم)
    if ((name.includes('date') || name.includes('time')) && 
        !name.startsWith('contract_') && 
        !name.startsWith('current_') &&
        !name.startsWith('registration')) {
      return {
        source: 'form',
        category: 'dates',
        label: this.generatePersianLabel(variableName)
      };
    }

    // Financial variables (مالی - فرم)
    // فقط مبالغی که کاربر باید وارد کنه
    const formFinancialPatterns = [
      /^total_amount$/,
      /^guarantee_amount$/,
      /^cash_deposit_amount$/,
      /^commission_rate$/
    ];
    
    if (formFinancialPatterns.some(pattern => pattern.test(name))) {
      return {
        source: 'form',
        category: 'financial',
        label: this.generatePersianLabel(variableName)
      };
    }

    // Personal info variables (اطلاعات شخصی - فرم)
    if (name.includes('representative') || name.includes('guarantor') || name.includes('signatory')) {
      return {
        source: 'form',
        category: 'personal',
        label: this.generatePersianLabel(variableName)
      };
    }

    // Default to form input
    return {
      source: 'form',
      category: 'other',
      label: this.generatePersianLabel(variableName)
    };
  }

  /**
   * Generate Persian label from English variable name
   */
  private generatePersianLabel(variableName: string): string {
    const translations: Record<string, string> = {
      'company_name': 'نام شرکت',
      'company_national_id': 'شناسه ملی شرکت',
      'company_address': 'آدرس شرکت',
      'company_phone': 'تلفن شرکت',
      'contract_type': 'نوع قرارداد',
      'contract_subject': 'موضوع قرارداد',
      'contract_number': 'شماره قرارداد',
      'total_amount': 'مبلغ کل',
      'start_date': 'تاریخ شروع',
      'end_date': 'تاریخ پایان',
      'duration_days': 'مدت قرارداد (روز)',
      'total_amount_words': 'مبلغ به حروف',
    };

    if (translations[variableName]) {
      return translations[variableName];
    }

    // Generate from pattern
    return variableName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const contractVariablesService = new ContractVariablesService();
