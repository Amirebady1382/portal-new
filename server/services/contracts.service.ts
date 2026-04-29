import { storage } from "../storage";
import { settingsService } from "./settings.service";
import * as fs from "fs/promises";
import * as path from "path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { unifiedVariableManager } from './unified-variable-manager.service';
import { safeJsonParseArray, safeJsonParseObject, parseRasmioData } from '../utils/safe-json';
import { extractFromRasmio } from '../utils/rasmio-field-mapping';
import { db } from "../db";
import { logger, PerformanceTimer } from "../utils/logger";

export interface ContractTemplate {
  id: number;
  name: string;
  description: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  variables: any[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractTemplateData {
  name: string;
  description: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  variables: string | null;
  createdBy: number;
  category: string | null;
  version: string;
  isActive: boolean;
}

export interface ContractFormData {
  id?: number;
  companyId: number;
  templateId: number;
  formType: string;
  formData: string;
  isComplete: boolean;
  lastUsedAt: string;
  createdBy: number;
  updatedBy: number;
}

export interface ContractGenerationRequest {
  templateId: number;
  companyId: number;
  contractNumber: string;
  customFields?: any;
  variables?: any;
}

export class ContractsService {
  /**
   * Get all contract templates
   */
  async getContractTemplates(): Promise<any[]> {
    return await storage.getContractTemplates();
  }

  /**
   * Get single contract template by ID
   */
  async getContractTemplate(templateId: number): Promise<any> {
    return await storage.getContractTemplate(templateId);
  }

  /**
   * Create new contract template
   */
  async createContractTemplate(templateData: CreateContractTemplateData): Promise<any> {
    return await storage.createContractTemplate(templateData);
  }

  /**
   * Get contract form data for specific company and template
   */
  async getContractFormData(companyId: number, templateId: number): Promise<any> {
    return await storage.getContractFormData(companyId, templateId);
  }

  /**
   * Create contract form data
   */
  async createContractFormData(formData: ContractFormData): Promise<any> {
    const data = {
      ...formData,
      formData: JSON.stringify(formData.formData),
      lastUsedAt: new Date().toISOString()
    };
    
    return await storage.createContractFormData(data);
  }

  /**
   * Update contract form data
   */
  async updateContractFormData(id: number, updateData: any): Promise<any> {
    const data = {
      ...updateData,
      lastUsedAt: new Date().toISOString()
    };
    
    return await storage.updateContractFormData(id, data);
  }

  /**
   * Save or update contract form data
   */
  async saveContractFormData(
    companyId: number, 
    templateId: number, 
    formType: string, 
    formData: any, 
    userId: number
  ): Promise<any> {
    // Check if exists
    const existing = await this.getContractFormData(companyId, templateId);
    
    if (existing) {
      // Update existing
      return await this.updateContractFormData(existing.id, {
        formData: JSON.stringify(formData),
        updatedBy: userId
      });
    } else {
      // Create new
      return await this.createContractFormData({
        companyId,
        templateId,
        formType,
        formData: JSON.stringify(formData),
        isComplete: false,
        lastUsedAt: new Date().toISOString(),
        createdBy: userId,
        updatedBy: userId
      });
    }
  }

  /**
   * Prepare contract data from all sources
   */
  async prepareContractData(
    companyId: number,
    templateId: number,
    contractNumber: string,
    customFields: any = {},
    variables: any = {}
  ): Promise<{
    mergedData: Record<string, any>,
    replacementData: Record<string, any>,
    template: any,
    company: any,
    variableStatus: any[]
  }> {
    logger.info('🔍 === PREPARING CONTRACT DATA ===', 'contracts');

    // Get template and company info
    const template = await this.getContractTemplate(templateId);
    const company = await storage.getCompany(companyId);

    if (!template) {
      throw new Error("قالب قرارداد یافت نشد");
    }

    if (!company) {
      throw new Error("شرکت یافت نشد");
    }

    // 🆕 دریافت داده‌ها از فرم‌ها با استفاده از variable_form_field_mappings
    let mappedFormData: any = {};
    try {
      const formSubmissions = await storage.getFormSubmissions({ companyId });
      logger.info(`📋 Found ${formSubmissions.length} form submissions for company ${companyId}`, 'contracts');

      if (formSubmissions.length > 0) {
        // دریافت variables template
        const templateVariables = template.variables || [];
        const formVariables = templateVariables.filter((v: any) =>
          v.source === 'form' && typeof v === 'object' && v.name
        );

        logger.info(`🔍 Found ${formVariables.length} form-sourced variables in template`, 'contracts');

        // 🚀 دریافت تمام mappings برای همه variables یکجا
        const variableIds = formVariables.map((v: any) => v.id).filter(Boolean);

        if (variableIds.length > 0) {
          logger.info(`📊 Fetching mappings for ${variableIds.length} variables`, 'contracts');

          // دریافت mappings با batch query
          const allMappings = await db.execute(`
            SELECT
              vffm.*,
              cv.name as variable_name
            FROM variable_form_field_mappings vffm
            JOIN contract_variables cv ON vffm.variable_id = cv.id
            WHERE vffm.variable_id IN (${variableIds.map(() => '?').join(',')})
              AND vffm.is_active = 1
            ORDER BY vffm.variable_id, vffm.priority DESC
          `, variableIds);

          // گروه‌بندی mappings بر اساس variable_id
          const mappingsByVariable = new Map<number, any[]>();
          for (const mapping of allMappings.rows) {
            const varId = (mapping as any).variable_id;
            if (!mappingsByVariable.has(varId)) {
              mappingsByVariable.set(varId, []);
            }
            mappingsByVariable.get(varId)!.push(mapping);
          }

          logger.info(`✅ Loaded mappings for ${mappingsByVariable.size} variables`, 'contracts');

          // ایجاد Map برای دسترسی سریع به form submissions
          const submissionMap = new Map(formSubmissions.map(s => [s.requirementId, s]));

          // پردازش هر variable با استفاده از mappings (priority-based fallback)
          for (const variable of formVariables) {
            if (!variable.id || !variable.name) continue;

            const mappings = mappingsByVariable.get(variable.id);
            if (mappings && mappings.length > 0) {
              // استفاده از mapping (روش جدید)
              for (const mapping of mappings) {
                const mappingDetails = mapping as any;
                const submission = submissionMap.get(mappingDetails.requirement_id);
                if (!submission) continue;

                const formData = safeJsonParseObject(submission.formData, {}) as Record<string, any>;
                const fieldValue = formData[mappingDetails.field_name];

                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                  mappedFormData[variable.name] = fieldValue;
                  break; // پیدا شد، به variable بعدی برو
                }
              }
            }
          }
        }

        // 📦 Fallback: استفاده از variableName مستقیم در fields (برای backward compatibility)
        const requirementIds = formSubmissions.map(s => s.requirementId);
        const uniqueRequirementIds = Array.from(new Set(requirementIds));
        const requirements = await storage.getDocumentRequirementsByIds(uniqueRequirementIds);
        const requirementMap = new Map(requirements.map(r => [r.id, r]));

        for (const submission of formSubmissions) {
          const requirement = requirementMap.get(submission.requirementId);
          if (!requirement) continue;

          const fields = safeJsonParseArray(requirement.fields, []);
          const submittedData = safeJsonParseObject(submission.formData, {}) as Record<string, any>;

          // فقط برای variableهایی که از mapping پیدا نشدن
          fields.forEach((field: any) => {
            if (field.variableName && field.name && submittedData[field.name as string]) {
              // فقط اگر قبلا از mapping پیدا نشده بود
              if (!mappedFormData[field.variableName]) {
                mappedFormData[field.variableName as string] = submittedData[field.name as string];
              }
            }
          });
        }
      }
    } catch (error) {
      logger.warn('⚠️ Error loading form submissions:', 'contracts', { error });
    }

    // دریافت form data ذخیره شده (fallback)
    let savedFormData: any = {};
    try {
      const contractFormData = await this.getContractFormData(companyId, templateId);
      if (contractFormData && contractFormData.formData) {
        savedFormData = safeJsonParseObject(contractFormData.formData, {});
      }
    } catch (error) {
      logger.warn('⚠️ No saved form data found:', 'contracts', { error: error instanceof Error ? error.message : 'Unknown' });
    }

    // 🆕 دریافت داده‌های رسمیو برای متغیرهای source: "rasmio"
    let rasmioData: any = {};
    try {
      if (company && company.rasmioData) {
        const { extractFromRasmio } = require('../utils/rasmio-field-mapping');
        // دریافت لیست تمام متغیرهای قالب که source: "rasmio" دارند
        const allVariables = await storage.getContractVariables({});
        const rasmioVariables = allVariables.filter((v: any) => v.source === 'rasmio');

        for (const variable of rasmioVariables) {
          try {
            // سعی کن مقدار را از داده رسمیو extract کنی
            const value = extractFromRasmio(variable.name, company.rasmioData);

            if (value !== null && value !== undefined) {
              rasmioData[variable.name] = value;
            }
          } catch (extractError) {
            logger.debug(`   ❌ Error extracting ${variable.name}:`, 'contracts', { error: extractError instanceof Error ? extractError.message : 'Unknown' });
          }
        }
      }
    } catch (error) {
      logger.warn('⚠️ Error loading Rasmio data:', 'contracts', { error: error instanceof Error ? error.message : 'Unknown' });
    }

    // Merge all data sources (اولویت: customFields > variables > mappedFormData > rasmioData > savedFormData)
    const mergedData = { ...savedFormData, ...rasmioData, ...mappedFormData, ...variables, ...customFields };

    // Generate replacement data
    const replacementData = await this.buildReplacementData(mergedData, company, contractNumber);

    // Calculate variable status (missing/filled)
    const variableStatus: any[] = [];
    const templateVariables = template.variables || [];

    if (templateVariables && Array.isArray(templateVariables)) {
        for (const tv of templateVariables) {
            const val = replacementData[tv.name];
            variableStatus.push({
                name: tv.name,
                label: tv.label || tv.name,
                source: tv.source || 'unknown',
                required: tv.required || false,
                value: val,
                isFilled: val !== undefined && val !== null && val !== '',
                type: tv.type || 'text'
            });
        }
    }

    return { mergedData, replacementData, template, company, variableStatus };
  }

  /**
   * Preview contract generation
   */
  async previewContractGeneration(requestData: ContractGenerationRequest, userId: number): Promise<any> {
    const { replacementData, variableStatus, template } = await this.prepareContractData(
      requestData.companyId,
      requestData.templateId,
      requestData.contractNumber,
      requestData.customFields,
      requestData.variables
    );

    // Check if any REQUIRED variable is missing
    const missing = variableStatus.filter(v => v.required && !v.isFilled);

    return {
      templateName: template.name,
      variables: variableStatus,
      missingCount: missing.length,
      readyToGenerate: missing.length === 0,
      previewData: replacementData
    };
  }

  /**
   * Generate contract document
   */
  async generateContract(requestData: ContractGenerationRequest, userId: number): Promise<any> {
    const timer = new PerformanceTimer('generateContract');
    const { templateId, companyId, contractNumber, customFields = {}, variables = {} } = requestData;

    logger.info('🔍 === CONTRACT GENERATION REQUEST ===', 'contracts', { templateId, companyId, contractNumber });

    try {
      // 1. Prepare Data
      const { replacementData, template, company, variableStatus } = await this.prepareContractData(
        companyId,
        templateId,
        contractNumber,
        customFields,
        variables
      );

      // Validate Required Variables
      const missing = variableStatus.filter(v => v.required && !v.isFilled);
      if (missing.length > 0) {
        const missingNames = missing.map(v => v.label || v.name).join(', ');
        throw new Error(`متغیرهای اجباری زیر مقداردهی نشده‌اند: ${missingNames}`);
      }

      // Validate Variable Types
      for (const v of variableStatus) {
        if (v.isFilled) {
          this.validateVariableType(v);
        }
      }

      // Read template file
      let templateBuffer: Buffer;
      let templatePath: string;

      if (template.fileName === 'zemaat-template.docx') {
        templatePath = path.resolve(process.cwd(), "uploads", "templates", "zemaat-template.docx");
      } else {
        templatePath = template.filePath;
      }

      try {
        templateBuffer = await fs.readFile(templatePath);
        logger.info('✅ Template file read successfully', 'contracts', { size: templateBuffer.length });

        const MAX_SAFE_SIZE = 10 * 1024 * 1024; // 10MB
        if (templateBuffer.length > MAX_SAFE_SIZE) {
          logger.warn(`⚠️ Large template file detected: ${(templateBuffer.length / 1024 / 1024).toFixed(2)}MB - may cause memory issues`, 'contracts');
        }
      } catch (readError) {
        logger.error('❌ Template file read error', 'contracts', readError instanceof Error ? readError : new Error(String(readError)));
        throw new Error("خطا در خواندن فایل قالب");
      }

      // Detect file type
      const isValidDocx = templateBuffer.slice(0, 4).toString() === 'PK\x03\x04';
      if (!isValidDocx) {
        throw new Error('Invalid file format: Only DOCX files are supported');
      }

      logger.info('🔄 Final replacement data keys:', 'contracts', { count: Object.keys(replacementData).length });

      // Process template
      logger.info('🔧 Starting template processing...', 'contracts');
      const outputBuffer = await this.processTemplate(templateBuffer, replacementData);
      logger.info(`✅ Template processed`, 'contracts', { outputSize: outputBuffer.length });

      // Save generated contract
      const fileName = await this.saveGeneratedContract(outputBuffer, contractNumber);

      // Create audit log
      try {
        await storage.createAuditLog({
          userId,
          action: "generate_contract",
          resource: "contract",
          resourceId: companyId,
          details: JSON.stringify({
            contractNumber,
            templateName: template.name,
            companyName: company.name,
            guaranteeAmount: this.extractGuaranteeAmount(replacementData)
          }),
          ipAddress: null,
          userAgent: null,
        });
      } catch (auditError) {
        logger.warn('⚠️ Audit log failed (non-critical):', 'contracts', { error: auditError });
      }

      timer.end();

      return {
        success: true,
        contractNumber,
        companyName: company.name,
        templateName: template.name,
        fileName,
        downloadUrl: `/api/contracts/download/${encodeURIComponent(fileName)}`,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating contract', 'contracts', error instanceof Error ? error : new Error(String(error)));
      timer.end(false, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Build comprehensive replacement data for contract
   */
  private async buildReplacementData(mergedData: any, company: any, contractNumber: string): Promise<Record<string, any>> {
    // استفاده از mapping مرکزی Rasmio
    const { extractFromRasmio, extractMultipleFromRasmio } = require('../utils/rasmio-field-mapping');
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(startDate.getFullYear() + 1);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get fund info and contract defaults from settings
    const fundInfo = await settingsService.getFundInfo();
    const contractDefaults = await settingsService.getContractDefaults();

    // Financial calculations
    const guaranteeAmountNum = this.extractGuaranteeAmount(mergedData);
    const defaultAnnualFeeRate = parseFloat(contractDefaults.default_annual_fee_rate || '0.02');
    const annualFee = Math.floor(guaranteeAmountNum * defaultAnnualFeeRate);
    const defaultCommissionRate = parseFloat(contractDefaults.default_commission_rate || '2');
    const commissionRate = parseFloat(mergedData.commission_rate || defaultCommissionRate.toString());
    const commissionAmount = Math.floor(guaranteeAmountNum * commissionRate / 100);
    const cashDepositAmount = parseInt(mergedData.cash_deposit_amount?.toString().replace(/[^\d]/g, '') || '0');
    const cashDepositPercentage = guaranteeAmountNum > 0 ? ((cashDepositAmount / guaranteeAmountNum) * 100).toFixed(2) : '0';

    logger.debug('💰 Financial calculations:', 'contracts', {
      guaranteeAmountNum, 
      annualFee,
      commissionRate,
      commissionAmount,
      cashDepositAmount,
      cashDepositPercentage
    });

    // استخراج داده‌های Rasmio با استفاده از mapping مرکزی
    const rasmioVariables = [
      'company_name', 'name',
      'company_national_id', 'national_id', 'nationalId',
      'company_registration_number', 'registration_number',
      'company_address', 'address',
      'company_phone', 'phone',
      'company_email', 'email',
      'company_postal_code', 'postal_code',
      'capital', 'company_type',
      'city', 'website', 'registration_date'
    ];
    
    const rasmioData = extractMultipleFromRasmio(rasmioVariables, company.rasmioData);
    logger.info('📊 استخراج از Rasmio:', 'contracts', { count: Object.keys(rasmioData).filter(k => rasmioData[k]).length });

    // Parse rasmioData برای استفاده در getRepresentativeFromRasmio
    let rasmioCompanyData: any = null;
    try {
      if (company.rasmioData) {
        rasmioCompanyData = typeof company.rasmioData === 'string' 
          ? JSON.parse(company.rasmioData) 
          : company.rasmioData;
        logger.debug('✅ rasmioCompanyData parsed successfully', 'contracts');
      }
    } catch (error) {
      logger.warn('⚠️ Error parsing rasmioData for representative info:', 'contracts', { error });
      rasmioCompanyData = null;
    }

    // ساخت replacement data با اولویت صحیح:
    // 1. Rasmio (برای متغیرهای شرکتی)
    // 2. Form data (برای متغیرهای ورودی کاربر)
    // 3. Defaults (فقط در صورت نیاز)
    const replacementData: Record<string, any> = {};

    // === متغیرهای Rasmio (اولویت اول) ===
    for (const [key, value] of Object.entries(rasmioData)) {
      if (value) {
        replacementData[key] = value;
      }
    }

    return {
      // استفاده از داده‌های استخراج شده از Rasmio
      ...replacementData,
      
      // Fallback به DB data اگر Rasmio نداشت
      company_name: replacementData.company_name || company.name || '',
      company_national_id: replacementData.company_national_id || company.nationalId || '',
      national_id: replacementData.national_id || company.nationalId || '',
      company_address: replacementData.company_address || company.address || '',
      company_phone: replacementData.company_phone || company.phone || '',
      company_email: replacementData.company_email || company.email || contractDefaults.default_company_email || '',
      company_postal_code: replacementData.company_postal_code || contractDefaults.default_company_postal_code || '',
      capital: replacementData.capital || company.capital || '',

      // Contract info (System)
      contract_number: contractNumber,
      contract_date: this.formatPersianDate(new Date()),
      current_date: mergedData.current_date || this.formatPersianDate(new Date()),
      start_date: this.formatPersianDate(startDate),
      end_date: this.formatPersianDate(endDate),
      duration_days: durationDays.toString(),

      // Fund info (System - از تنظیمات)
      fund_name: fundInfo.fund_name || 'صندوق پژوهش و فناوری غیردولتی گیلان',
      fund_address: fundInfo.fund_address || 'استان گیلان، رشت',
      fund_phone: fundInfo.fund_phone || '013-12345678',
      fund_email: fundInfo.fund_email || 'info@gilanfund.ir',
      fund_registration_number: fundInfo.fund_registration_number || '12345',
      fund_national_id: fundInfo.fund_national_id || '10123456789',
      fund_representative_name: fundInfo.fund_representative_name || contractDefaults.default_fund_representative || 'نماینده صندوق',
      fund_representative_position: fundInfo.fund_representative_position || 'مدیر عامل صندوق',

      // Financial info
      guarantee_amount: guaranteeAmountNum.toLocaleString('fa-IR'),
      guarantee_amount_numbers: guaranteeAmountNum.toLocaleString('fa-IR'),
      guarantee_amount_words: this.numberToPersianWords(guaranteeAmountNum),
      total_amount: guaranteeAmountNum.toLocaleString('fa-IR'),
      total_amount_numbers: guaranteeAmountNum.toLocaleString('fa-IR'),
      total_amount_words: this.numberToPersianWords(guaranteeAmountNum),
      annual_fee_numbers: annualFee.toLocaleString('fa-IR'),
      annual_fee_words: this.numberToPersianWords(annualFee),
      
      // Commission info
      commission_rate: commissionRate.toString(),
      commission_amount: commissionAmount.toLocaleString('fa-IR'),
      commission_amount_words: this.numberToPersianWords(commissionAmount),
      
      // Cash deposit info
      cash_deposit_amount: cashDepositAmount.toLocaleString('fa-IR'),
      cash_deposit_amount_words: this.numberToPersianWords(cashDepositAmount),
      cash_deposit_percentage: cashDepositPercentage,

      // Representative info (from Rasmio managers if available, otherwise use form data or defaults)
      company_representative_name: this.getRepresentativeFromRasmio(rasmioCompanyData, 'name') || mergedData.company_representative_name || contractDefaults.default_representative_name || 'علی احمدی',
      company_representative_father_name: mergedData.company_representative_father_name || contractDefaults.default_representative_father_name || 'محمد',
      company_representative_birth_date: mergedData.company_representative_birth_date || contractDefaults.default_representative_birth_date || '1370/01/01',
      company_representative_birth_place: mergedData.company_representative_birth_place || contractDefaults.default_representative_birth_place || 'رشت',
      company_representative_national_id: this.getRepresentativeFromRasmio(rasmioCompanyData, 'nationalId') || mergedData.company_representative_national_id || contractDefaults.default_representative_national_id || '1234567890',
      company_representative_position: this.getRepresentativeFromRasmio(rasmioCompanyData, 'position') || mergedData.company_representative_position || contractDefaults.default_representative_position || 'مدیرعامل',

      // Gazette info
      gazette_page: mergedData.gazette_page || contractDefaults.default_gazette_page || '12',
      gazette_number: mergedData.gazette_number || contractDefaults.default_gazette_number || '25678',
      gazette_date: mergedData.gazette_date || contractDefaults.default_gazette_date || '1403/08/15',

      // Guarantor info (use form data or defaults)
      guarantor_name: mergedData.guarantor_name || contractDefaults.default_guarantor_name || 'احمد محمدی',
      guarantor_father_name: mergedData.guarantor_father_name || contractDefaults.default_guarantor_father_name || 'حسن',
      guarantor_birth_date: mergedData.guarantor_birth_date || contractDefaults.default_guarantor_birth_date || '1350/05/15',
      guarantor_birth_place: mergedData.guarantor_birth_place || contractDefaults.default_guarantor_birth_place || 'رشت',
      guarantor_certificate_number: mergedData.guarantor_certificate_number || contractDefaults.default_guarantor_certificate_number || '123456',
      guarantor_national_id: mergedData.guarantor_national_id || contractDefaults.default_guarantor_national_id || '0987654321',
      guarantor_address: mergedData.guarantor_address || contractDefaults.default_guarantor_address || 'استان گیلان، شهرستان رشت، خیابان شهدا، پلاک ۵',
      guarantor_postal_code: mergedData.guarantor_postal_code || contractDefaults.default_guarantor_postal_code || '4193619849',
      guarantor_mobile: mergedData.guarantor_mobile || contractDefaults.default_guarantor_mobile || '09131234567',

      // Financial defaults
      sepas_code: mergedData.sepas_code || contractDefaults.default_sepas_code || '67890',
      beneficiary_name: mergedData.beneficiary_name || contractDefaults.default_beneficiary_name || 'شرکت بهره‌بردار',
      fund_representative: contractDefaults.default_fund_representative || 'نماینده فند',
      company_check_amount: mergedData.company_check_amount || contractDefaults.default_company_check_amount || '0',
      company_check_amount_words: mergedData.company_check_amount_words || contractDefaults.default_company_check_amount_words || 'صفر ریال',
      personal_check_amount: mergedData.personal_check_amount || contractDefaults.default_personal_check_amount || '0',
      personal_check_amount_words: mergedData.personal_check_amount_words || contractDefaults.default_personal_check_amount_words || 'صفر ریال',
      bill_amount: mergedData.bill_amount || contractDefaults.default_bill_amount || '0',
      bill_amount_words: mergedData.bill_amount_words || contractDefaults.default_bill_amount_words || 'صفر ریال',

      // Fund info from settings
      ...fundInfo,

      // Pass through any remaining custom fields
      ...Object.keys(mergedData).reduce((acc, key) => {
        if (!acc[key]) { // Only add if not already set above
          acc[key] = mergedData[key];
        }
        return acc;
      }, {} as Record<string, any>)
    };
  }

  /**
   * Extract representative info from Rasmio data (managers/boardMembers)
   */
  private getRepresentativeFromRasmio(rasmioData: any, field: 'name' | 'nationalId' | 'position'): string | null {
    if (!rasmioData || (!rasmioData.managers && !rasmioData.boardMembers)) {
      return null;
    }

    const managers = rasmioData.managers || rasmioData.boardMembers || [];
    if (managers.length === 0) return null;

    // Try to find CEO/Managing Director first
    const ceo = managers.find((m: any) => 
      m.position?.includes('مدیرعامل') || 
      m.position?.includes('مدیر عامل') ||
      m.role?.includes('مدیرعامل')
    );

    const representative = ceo || managers[0]; // Fall back to first manager

    switch (field) {
      case 'name':
        return representative.fullName || representative.name || null;
      case 'nationalId':
        return representative.nationalId || representative.nationalCode || null;
      case 'position':
        return representative.position || representative.role || 'مدیرعامل';
      default:
        return null;
    }
  }



  /**
   * Process DOCX template with data replacement
   */
  private async processTemplate(templateBuffer: Buffer, replacementData: Record<string, any>): Promise<Buffer> {
    const timer = new PerformanceTimer('processTemplate');
    try {
      logger.info('🔧 Processing template using Unified Variable Manager...', 'contracts');
      logger.debug('📊 Replacement data keys:', 'contracts', { keys: Object.keys(replacementData) });
      
      // Create a temporary file path for processing
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      // Use timestamp + random string to avoid race conditions
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const tempFilePath = path.join(tempDir, `temp_template_${uniqueId}.docx`);
      
      try {
        // Save template buffer to temp file
        await fs.writeFile(tempFilePath, templateBuffer);
        
        // Process using Unified Variable Manager
        const result = await unifiedVariableManager.processDocumentWithVariables(
          tempFilePath,
          replacementData,
          {
            preserveOriginal: true,
            fixBrokenVariables: true
          }
        );
        
        if (!result.success || !result.processedBuffer) {
          throw new Error(`Variable processing failed: ${result.errors.join(', ')}`);
        }
        
        logger.info(`✅ Template processed successfully`, 'contracts');
        logger.info(`📝 Replaced: ${result.replacedCount} variables`, 'contracts');
        
        if (result.warnings.length > 0) {
          logger.warn('⚠️ Processing warnings:', 'contracts', { warnings: result.warnings });
        }
        
        if (result.replacedCount === 0) {
          logger.warn('⚠️⚠️⚠️ هیچ متغیری جایگذاری نشد!', 'contracts');
          logger.warn('   ممکن است قالب متغیر نداشته باشد یا format متغیرها {{variable_name}} نباشد.', 'contracts');
        }
        
        timer.end();
        return result.processedBuffer;
        
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          logger.warn('⚠️ Could not delete temp file:', 'contracts', { error: cleanupError });
        }
      }
      
    } catch (error) {
      logger.error('❌ Unified template processing error', 'contracts', error instanceof Error ? error : new Error(String(error)));
      timer.end(false, { error: error instanceof Error ? error.message : String(error) });
      
      // Fallback to legacy method if unified manager fails
      logger.info('🔄 Falling back to legacy processing...', 'contracts');
      return this.legacyProcessTemplate(templateBuffer, replacementData);
    }
  }
  
  /**
   * Legacy template processing method (fallback)
   */
  private async legacyProcessTemplate(templateBuffer: Buffer, replacementData: Record<string, any>): Promise<Buffer> {
    try {
      logger.warn('⚠️ Using legacy template processing...', 'contracts');
      
      const doc = new Docxtemplater(new PizZip(templateBuffer), {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData(replacementData);
      doc.render();

      return doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
      
    } catch (error) {
      logger.error('❌ Legacy template processing also failed', 'contracts', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Emergency fallback processing using direct XML manipulation
   */
  private async emergencyFallbackProcessing(templateBuffer: Buffer, replacementData: Record<string, any>): Promise<Buffer> {
    const emergencyZip = new PizZip(templateBuffer);
    const documentXmlFile = emergencyZip.file('word/document.xml');
    
    if (documentXmlFile) {
      let xmlContent = documentXmlFile.asText();
      
      // Simple replacement for emergency fallback
      let emergencyReplacedCount = 0;
      Object.keys(replacementData).forEach(key => {
        const value = replacementData[key] || '';
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        const originalContent = xmlContent;
        xmlContent = xmlContent.replace(regex, value);
        if (originalContent !== xmlContent) {
          logger.debug(`🚨 Emergency replaced: ${key} -> ${value.toString().substring(0, 30)}...`, 'contracts');
          emergencyReplacedCount++;
        }
      });
      
      // Advanced pattern replacements for emergency
      const emergencyPatterns = [
        /\{\{[^}]*<\/w:t>[^<]*<[^>]*>[^<]*<w:t[^>]*>[^}]*\}\}/g,
        /\{\{[^<]*<\/w:t>.*?<w:t[^>]*>[^}]*\}\}/g
      ];
      
      emergencyPatterns.forEach(pattern => {
        const matches = xmlContent.match(pattern);
        if (matches) {
          logger.debug(`🔍 Found ${matches.length} emergency pattern matches`, 'contracts');
          matches.forEach(match => {
            Object.keys(replacementData).forEach(key => {
              if (match.includes(key)) {
                xmlContent = xmlContent.replace(match, replacementData[key] || '');
                logger.debug(`🚨 Emergency pattern fix: ${key}`, 'contracts');
                emergencyReplacedCount++;
              }
            });
          });
        }
      });
      
      logger.info(`🚨 Emergency fallback replaced ${emergencyReplacedCount} variables total`, 'contracts');
      
      // Update content and generate
      emergencyZip.file('word/document.xml', xmlContent);
      const outputBuffer = emergencyZip.generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
      
      logger.info('🚨 Emergency fallback completed', 'contracts', { outputSize: outputBuffer.length });
      return outputBuffer;
    } else {
      throw new Error('Emergency fallback failed: No document.xml found');
    }
  }

  /**
   * Save generated contract to file system
   */
  private async saveGeneratedContract(outputBuffer: Buffer, contractNumber: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `contract_${contractNumber}_${timestamp}.docx`;
    const contractsDir = path.resolve(process.cwd(), "uploads", "contracts");
    const filePath = path.resolve(contractsDir, fileName);

    logger.info('💾 === FILE SAVING ===', 'contracts');
    logger.debug('📁 Generated fileName:', 'contracts', { fileName, filePath });

    // Ensure contracts directory exists
    try {
      await fs.mkdir(contractsDir, { recursive: true });
      logger.debug('✅ Contracts directory ensured:', 'contracts', { contractsDir });
    } catch (error) {
      // Ignored
    }

    // Save contract file
    await fs.writeFile(filePath, outputBuffer);
    logger.info(`✅ Contract saved successfully: ${fileName}`, 'contracts');

    return fileName;
  }

  /**
   * Get contract file for download with security checks
   */
  async getContractForDownload(fileName: string): Promise<string> {
    logger.info('🔍 === CONTRACT DOWNLOAD REQUEST ===', 'contracts');
    logger.debug('📁 Requested fileName:', 'contracts', { fileName });

    // ✅ SECURITY: Sanitize filename to prevent directory traversal
    const sanitizedFileName = path.basename(fileName);

    // ✅ SECURITY: Validate filename pattern (prevent malicious names)
    // Pattern: contract_<contract_number>_<timestamp>.docx
    if (!/^contract_[A-Z0-9\-]+_\d+\.docx$/i.test(sanitizedFileName)) {
      logger.warn(`⚠️ Invalid contract filename format: ${sanitizedFileName}`, 'contracts');
      throw new Error('نام فایل نامعتبر است');
    }

    const filePath = path.resolve(process.cwd(), "uploads", "contracts", sanitizedFileName);
    logger.debug('📍 Resolved filePath:', 'contracts', { filePath });

    // ✅ SECURITY: Ensure file is within allowed directory (prevent path traversal)
    const contractsDir = path.resolve(process.cwd(), "uploads", "contracts");
    if (!filePath.startsWith(contractsDir + path.sep)) {
      logger.error(`❌ Unauthorized file access attempt: ${filePath}`, 'contracts');
      throw new Error('دسترسی غیرمجاز به فایل');
    }

    // Check file existence
    try {
      await fs.access(filePath);
      logger.info('✅ File exists and validated, ready for download', 'contracts');
      return filePath;
    } catch (accessError) {
      logger.error('❌ File not found', 'contracts', accessError instanceof Error ? accessError : new Error(String(accessError)));
      throw new Error("فایل یافت نشد");
    }
  }

  // Helper methods
  private validateVariableType(variable: any): void {
    const { value, type, label, name } = variable;
    const variableLabel = label || name;

    if (value === null || value === undefined || value === '') return;

    switch (type) {
      case 'number':
      case 'currency':
        // Allow commas and Persian digits, strip them for validation
        const cleanValue = String(value)
          .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
          .replace(/[,،]/g, '');

        if (isNaN(Number(cleanValue))) {
          throw new Error(`مقدار متغیر "${variableLabel}" باید عدد باشد.`);
        }
        break;
      case 'date':
        // Check if valid date string YYYY/MM/DD or YYYY-MM-DD (Persian or Gregorian)
        // Allow simple format check for Persian dates (1403/01/01)
        const datePattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
        if (typeof value === 'string' && !datePattern.test(value) && isNaN(Date.parse(value))) {
             throw new Error(`مقدار متغیر "${variableLabel}" باید تاریخ معتبر باشد.`);
        }
        break;
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value === 'string' && !emailPattern.test(value)) {
            throw new Error(`مقدار متغیر "${variableLabel}" ایمیل معتبر نیست.`);
        }
        break;
    }
  }

  private extractGuaranteeAmount(data: any): number {
    try {
      const rawAmount = data.guarantee_amount?.toString().replace(/[^\d]/g, '') || '0';
      const amount = parseInt(rawAmount, 10);
      
      if (isNaN(amount)) {
        logger.warn('⚠️ Invalid guarantee amount, defaulting to 0', 'contracts');
        return 0;
      }
      
      if (amount < 0) {
        throw new Error('مبلغ ضمانت نمی‌تواند منفی باشد');
      }
      
      if (amount > 999999999999) { // 999 billion max
        throw new Error('مبلغ ضمانت بیش از حد مجاز است');
      }
      
      logger.debug(`💰 Extracted guarantee amount: ${amount.toLocaleString('fa-IR')} ریال`, 'contracts');
      return amount;
    } catch (error) {
      if (error instanceof Error && error.message.includes('نمی‌تواند')) {
        throw error; // Re-throw validation errors
      }
      logger.error('❌ Error extracting guarantee amount', 'contracts', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  private formatPersianDate(date: Date): string {
    const persianYear = date.getFullYear() - 621;
    const persianMonth = date.getMonth() + 1;
    const persianDay = date.getDate();
    return `${persianYear}/${persianMonth.toString().padStart(2, '0')}/${persianDay.toString().padStart(2, '0')}`;
  }

  private numberToPersianWords(num: number): string {
    // Validation for invalid numbers
    if (isNaN(num)) {
      return 'صفر ریال';
    }
    
    if (!isFinite(num)) {
      return 'نامحدود';
    }
    
    if (num < 0) {
      return 'منفی ' + this.numberToPersianWords(Math.abs(num));
    }
    
    if (num === 0) return 'صفر ریال';
    
    // Support up to trillion (10^12)
    if (num >= 1000000000000) {
      return num.toLocaleString('fa-IR') + ' ریال';
    }
    
    const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
    const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
    const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
    const scales = ['', 'هزار', 'میلیون', 'میلیارد'];
    
    const convertHundreds = (n: number): string => {
      let result = '';
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const o = n % 10;
      
      if (h > 0) result += hundreds[h];
      
      if (t === 1) {
        const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
        result += (result ? ' و ' : '') + teens[o];
      } else {
        if (t > 1) result += (result ? ' و ' : '') + tens[t];
        if (o > 0) result += (result ? ' و ' : '') + ones[o];
      }
      
      return result;
    };
    
    const groups = [];
    let tempNum = num;
    
    while (tempNum > 0) {
      groups.push(tempNum % 1000);
      tempNum = Math.floor(tempNum / 1000);
    }
    
    let result = '';
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] > 0) {
        const groupText = convertHundreds(groups[i]);
        if (groupText) {
          result += (result ? ' و ' : '') + groupText;
          if (i > 0) result += ' ' + scales[i];
        }
      }
    }
    
    return result + ' ریال';
  }

  /**
   * Check if user has access to company (for form data operations)
   */
  async userHasAccessToCompany(userId: number, companyId: number): Promise<boolean> {
    return await storage.userHasAccessToCompany(userId, companyId);
  }

  /**
   * Helper to warn about hard-coded fallback values
   */
  private warnHardcoded(field: string, value: string): string {
    logger.warn(`⚠️ Using hard-coded fallback for "${field}": ${value}`, 'contracts');
    return value;
  }
}

export const contractsService = new ContractsService();
