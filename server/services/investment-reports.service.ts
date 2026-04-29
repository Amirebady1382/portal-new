/**
 * سرویس تولید گزارش ارزیابی هوشمند
 * مشابه contracts.service.ts اما برای گزارش‌های سرمایه‌گذاری
 */

import { storage } from "../storage";
import { settingsService } from "./settings.service";
import * as fs from "fs/promises";
import * as path from "path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { unifiedVariableManager } from './unified-variable-manager.service';
import { chartGeneratorService } from './chart-generator.service';
import { formulaEngineService } from './formula-engine.service';
import { logger } from '../utils/logger';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { generateQRCode } from '../utils/qrcode';

export interface InvestmentReportTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  variables: string[];
  sections?: any[];
  chartConfigs?: any;
  version: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportGenerationRequest {
  templateId: number;
  companyId: number;
  reportNumber?: string;
  reportType?: 'evaluation' | 'progress' | 'final' | 'risk_assessment';
  customFields?: any;
  variables?: any;
  includeCharts?: boolean;
}

export interface GeneratedReport {
  success: boolean;
  reportNumber: string;
  companyName: string;
  templateName: string;
  fileName: string;
  downloadUrl: string;
  reportData?: any;
  scores?: any;
  generatedAt: string;
}

export class InvestmentReportsService {
  
  /**
   * دریافت تمام قالب‌های گزارش
   */
  async getReportTemplates(filters?: { category?: string; isActive?: boolean }): Promise<InvestmentReportTemplate[]> {
    const query = `
      SELECT * FROM investment_report_templates 
      WHERE 1=1
      ${filters?.category ? 'AND category = ?' : ''}
      ${filters?.isActive !== undefined ? 'AND is_active = ?' : ''}
      ORDER BY created_at DESC
    `;
    
    const params: any[] = [];
    if (filters?.category) params.push(filters.category);
    if (filters?.isActive !== undefined) params.push(filters.isActive ? 1 : 0);
    
    const result = await db.execute({ sql: query, args: params });
    const templates = result.rows;
    
    return templates.map((t: any) => ({
      ...t,
      variables: t.variables ? safeJsonParse(t.variables, []) : [],
      sections: t.sections ? safeJsonParse(t.sections, []) : [],
      chartConfigs: t.chart_configs ? safeJsonParse(t.chart_configs, null) : null
    }));
  }

  /**
   * دریافت یک قالب گزارش
   */
  async getReportTemplate(templateId: number): Promise<InvestmentReportTemplate | null> {
    const result = await db.execute({
      sql: 'SELECT * FROM investment_report_templates WHERE id = ?',
      args: [templateId]
    });
    const template = result.rows[0];
    
    if (!template) return null;
    
    return {
      id: template.id as number,
      name: template.name as string,
      description: template.description as string,
      category: template.category as string,
      fileName: template.file_name as string,
      filePath: template.file_path as string,
      fileSize: template.file_size as number,
      variables: safeJsonParseArray(template.variables, []),
      sections: safeJsonParseArray(template.sections, []),
      chartConfigs: safeJsonParseObject(template.chart_configs, null),
      version: template.version as string,
      isActive: template.is_active === 1,
      createdBy: template.created_by as number,
      createdAt: template.created_at as string,
      updatedAt: template.updated_at as string
    };
  }

  /**
   * ایجاد قالب گزارش جدید
   */
  async createReportTemplate(templateData: {
    name: string;
    description: string;
    category: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    variables: string[];
    sections?: any[];
    chartConfigs?: any;
    createdBy: number;
  }): Promise<InvestmentReportTemplate> {
    const result = await db.execute({
      sql: `INSERT INTO investment_report_templates 
        (name, description, category, file_name, file_path, file_size, variables, sections, chart_configs, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        templateData.name,
        templateData.description,
        templateData.category,
        templateData.fileName,
        templateData.filePath,
        templateData.fileSize,
        JSON.stringify(templateData.variables),
        templateData.sections ? JSON.stringify(templateData.sections) : null,
        templateData.chartConfigs ? JSON.stringify(templateData.chartConfigs) : null,
        templateData.createdBy
      ]
    });

    // Get the last inserted ID from result
    const insertId = result.lastInsertRowid;
    if (!insertId) {
      throw new Error('Failed to get inserted template ID');
    }
    
    const template = await this.getReportTemplate(Number(insertId));
    if (!template) {
      throw new Error('Failed to retrieve created template');
    }
    return template;
  }

  /**
   * تولید گزارش ارزیابی
   */
  async generateReport(
    requestData: ReportGenerationRequest,
    userId: number
  ): Promise<GeneratedReport> {
    const { 
      templateId, 
      companyId, 
      reportType = 'evaluation',
      customFields = {}, 
      variables = {},
      includeCharts = true
    } = requestData;

    logger.info('=== INVESTMENT REPORT GENERATION ===', 'investment-reports');
    logger.info(`templateId: ${templateId}, companyId: ${companyId}, reportType: ${reportType}`, 'investment-reports');

    // دریافت قالب و اطلاعات شرکت
    const template = await this.getReportTemplate(templateId);
    const company = await storage.getCompany(companyId);

    if (!template) {
      logger.error(`Template not found: templateId=${templateId}`, 'investment-reports');
      throw new Error(`قالب گزارش با شناسه ${templateId} یافت نشد`);
    }

    if (!company) {
      logger.error(`Company not found: companyId=${companyId}`, 'investment-reports');
      throw new Error(`شرکت با شناسه ${companyId} یافت نشد`);
    }

    // تولید شماره گزارش
    const reportNumber = requestData.reportNumber || this.generateReportNumber(reportType);

    // دریافت تحلیل AI موجود
    const aiAnalysis = await this.getCompanyAIAnalysis(companyId);
    
    // دریافت داده‌های از فرم‌های تکمیل شده (با mapping)
    let mappedFormData: any = {};
    try {
      const formSubmissions = await storage.getFormSubmissions({ companyId });
      logger.info(`Found ${formSubmissions.length} form submissions for company ${companyId}`, 'investment-reports');
      
      for (const submission of formSubmissions) {
        try {
          const requirement = await storage.getDocumentRequirement(submission.requirementId);
          if (!requirement) continue;
          
          const fields = typeof requirement.fields === 'string' 
            ? safeJsonParse(requirement.fields, [])
            : requirement.fields || [];
          
          const submittedData = typeof submission.formData === 'string'
            ? safeJsonParse(submission.formData, {})
            : submission.formData || {};
          
          // Map fields to variables
          // ⚠️ FIX: شامل کردن فیلدهای خالی هم تا UI بتواند نمایششان دهد
          if (Array.isArray(fields) && submittedData && typeof submittedData === 'object') {
            fields.forEach((field: any) => {
              if (field.variableName && field.name) {
                const fieldValue = (submittedData as Record<string, any>)[field.name];
                // همیشه متغیر را اضافه کن، حتی اگر خالی باشد
                // این باعث می‌شود UI بداند که این فیلد وجود دارد و باید پر شود
                mappedFormData[field.variableName] = fieldValue !== undefined && fieldValue !== null ? fieldValue : '';

                // ذخیره متادیتای فیلد برای رندر در UI
                if (!mappedFormData.__field_metadata) {
                  mappedFormData.__field_metadata = {};
                }
                mappedFormData.__field_metadata[field.variableName] = {
                  type: field.type || 'text',
                  source: field.source || 'form',
                  required: field.required || false,
                  label: field.label || field.name,
                  placeholder: field.placeholder || ''
                };
              }
            });
          }
        } catch (err) {
          logger.warn('Error processing form submission', 'investment-reports', err as Error);
        }
      }
    } catch (error) {
      logger.error('Error loading form submissions', 'investment-reports', error as Error);
    }

    // دریافت داده‌های فرم ذخیره شده
    const savedFormData = await this.getReportFormData(companyId, templateId);

    // ترکیب تمام منابع داده
    const mergedData = await this.aggregateReportData({
      company,
      aiAnalysis,
      savedFormData,
      mappedFormData,
      customFields,
      variables,
      reportNumber,
      reportType
    });

    // Generate Verification Hash and QR Code
    const verificationHash = uuidv4();
    // Default to private until finalized
    mergedData.verification_hash = verificationHash;
    mergedData.is_public = 0;

    const verificationLink = `${process.env.APP_URL || 'https://gfund.ir'}/verify/${verificationHash}`;
    mergedData.verification_link = verificationLink;

    try {
        const qrCodeDataUrl = await generateQRCode(verificationLink);
        mergedData.verification_qr_code = qrCodeDataUrl;
    } catch (e) {
        logger.warn('Failed to generate QR code', 'investment-reports', e as Error);
    }

    logger.debug(`Merged report data keys: ${Object.keys(mergedData).join(', ')}`, 'investment-reports');

    // محاسبه امتیازات
    const scores = this.calculateScores(mergedData);
    mergedData.overall_score = scores.overall;
    mergedData.scores_breakdown = JSON.stringify(scores);

    // تولید جداول برای گزارش
    if (includeCharts) {
      const scoreTable = chartGeneratorService.generateScoreTable(scores);
      mergedData.score_table = chartGeneratorService.tableToWordXML(scoreTable);
      mergedData.score_table_html = chartGeneratorService.generateHTMLTable(scoreTable);
    }

    // اعتبارسنجی و خواندن فایل قالب
    this.validateTemplatePath(template.filePath);
    
    // بررسی وجود فایل قبل از خواندن
    try {
      await fs.access(template.filePath);
    } catch (error) {
      logger.error(`Template file not found: ${template.filePath}`, 'investment-reports', error as Error);
      throw new Error(`فایل قالب یافت نشد: ${template.name}`);
    }
    
    const templateBuffer = await fs.readFile(template.filePath);
    
    if (!this.isValidDocxFile(templateBuffer)) {
      throw new Error('فایل قالب معتبر نیست');
    }

    // پردازش قالب
    const outputBuffer = await this.processReportTemplate(templateBuffer, mergedData);

    // ذخیره گزارش
    const fileName = await this.saveGeneratedReport(
      outputBuffer,
      reportNumber,
      companyId,
      templateId,
      reportType,
      mergedData,
      scores,
      userId,
      verificationHash,
      0 // isPublic default false
    );

    // ثبت در audit log (non-blocking)
    storage.createAuditLog({
      userId,
      action: "generate_investment_report",
      resource: "investment_report",
      resourceId: companyId,
      details: JSON.stringify({ 
        reportNumber,
        reportType,
        templateName: template.name,
        companyName: company.name,
        overallScore: scores.overall,
        fileName,
        timestamp: new Date().toISOString()
      }),
      ipAddress: null,
      userAgent: null,
    }).catch(auditError => {
      logger.warn('Audit log failed (non-critical)', 'investment-reports', auditError as Error);
    });

    return {
      success: true,
      reportNumber,
      companyName: company.name,
      templateName: template.name,
      fileName,
      downloadUrl: `/api/investment-reports/download/${encodeURIComponent(fileName)}`,
      reportData: mergedData,
      scores,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * ترکیب داده‌ها از منابع مختلف
   */
  private async aggregateReportData(params: {
    company: any;
    aiAnalysis: any;
    savedFormData: any;
    mappedFormData?: any;
    customFields: any;
    variables: any;
    reportNumber: string;
    reportType: string;
  }): Promise<Record<string, any>> {
    const { company, aiAnalysis, savedFormData, mappedFormData = {}, customFields, variables, reportNumber, reportType } = params;

    // اطلاعات پایه
    const baseData: Record<string, any> = {
      // اطلاعات شرکت
      company_name: company.name,
      company_national_id: company.nationalId,
      company_registration_number: company.registrationNumber || 'N/A',
      company_address: company.address || '',
      company_phone: company.phone || '',
      company_email: company.email || '',
      company_established_year: company.establishedYear || '',
      company_industry: company.industry || '',

      // اطلاعات گزارش
      report_number: reportNumber,
      report_type: this.getReportTypeLabel(reportType),
      evaluation_date: this.formatPersianDate(new Date()),
      evaluator_name: 'سیستم هوشمند ارزیابی',

      // تاریخ‌ها
      current_date: this.formatPersianDate(new Date()),
      report_generated_at: new Date().toLocaleString('fa-IR')
    };

    // افزودن داده‌های تحلیل AI
    if (aiAnalysis) {
      Object.assign(baseData, {
        // Team
        team_score: aiAnalysis.teamAnalysis?.score || 0,
        team_strengths: this.formatArray(aiAnalysis.teamAnalysis?.strengths),
        team_weaknesses: this.formatArray(aiAnalysis.teamAnalysis?.weaknesses),
        team_summary: aiAnalysis.teamAnalysis?.summary || '',

        // Product
        product_score: aiAnalysis.productAnalysis?.score || 0,
        product_market_potential: aiAnalysis.productAnalysis?.marketPotential || '',
        product_competitive_advantage: aiAnalysis.productAnalysis?.competitiveAdvantage || '',
        product_summary: aiAnalysis.productAnalysis?.summary || '',

        // Market
        market_score: aiAnalysis.marketAnalysis?.score || 0,
        market_size: aiAnalysis.marketAnalysis?.marketSize || '',
        market_competition: aiAnalysis.marketAnalysis?.competition || '',
        market_trends: aiAnalysis.marketAnalysis?.trends || '',
        market_summary: aiAnalysis.marketAnalysis?.summary || '',

        // Financial
        financial_score: aiAnalysis.financialAnalysis?.score || 0,
        financial_capital_structure: aiAnalysis.financialAnalysis?.capitalStructure || '',
        financial_growth_potential: aiAnalysis.financialAnalysis?.growthPotential || '',
        financial_summary: aiAnalysis.financialAnalysis?.summary || '',

        // Risk
        risk_score: aiAnalysis.riskAnalysis?.score || 0,
        risk_main_risks: this.formatArray(aiAnalysis.riskAnalysis?.mainRisks),
        risk_mitigation_strategies: this.formatArray(aiAnalysis.riskAnalysis?.mitigationStrategies),
        risk_summary: aiAnalysis.riskAnalysis?.summary || '',

        // Overall
        overall_recommendation: aiAnalysis.overallRecommendation?.recommendation || 'neutral',
        overall_reasoning: aiAnalysis.overallRecommendation?.reasoning || '',
        next_steps: this.formatArray(aiAnalysis.overallRecommendation?.nextSteps),

        // Company Overview
        company_overview: aiAnalysis.companyOverview || ''
      });
    }

    // افزودن داده‌های فرم‌های map شده (از فرم‌های تکمیل شده)
    Object.assign(baseData, mappedFormData);

    // افزودن داده‌های فرم ذخیره شده (fallback)
    if (savedFormData && savedFormData.formData) {
      const formDataParsed = typeof savedFormData.formData === 'string' 
        ? safeJsonParse(savedFormData.formData, {})
        : savedFormData.formData;
      Object.assign(baseData, formDataParsed);
    }

    // افزودن custom fields و variables (بالاترین اولویت)
    Object.assign(baseData, customFields, variables);

    // محاسبه متغیرهای مالی با Formula Engine (با استخراج از فرم‌ها)
    const financialCalculations = await this.calculateFinancialMetrics(baseData, params.company.id);
    Object.assign(baseData, financialCalculations);

    return baseData;
  }

  /**
   * استخراج داده‌های مالی از فرم‌های تکمیل شده شرکت
   * با استفاده از variableName mapping (سازگار با UI)
   */
  private async extractFinancialDataFromForms(companyId: number): Promise<Record<string, number>> {
    try {
      console.log('📋 Extracting financial data from company forms...');

      // دریافت تمام فرم‌های تکمیل شده شرکت
      const formSubmissions = await storage.getFormSubmissions({ companyId });
      
      if (formSubmissions.length === 0) {
        console.log('⚠️ No form submissions found for company');
        return {};
      }

      console.log(`✓ Found ${formSubmissions.length} form submissions`);

      // استخراج requirement IDs برای فرم‌های مالی
      const financialFormTitles = [
        'اطلاعات پایه ارزیابی مالی',
        'صورت سود و زیان',
        'ترازنامه - دارایی‌ها',
        'ترازنامه - حقوق مالکانه و بدهی‌ها'
      ];

      // دریافت فرم‌های مالی
      const requirements = await storage.getDocumentRequirements();
      const financialForms = requirements.filter(req => financialFormTitles.includes(req.title));

      console.log(`✓ Found ${financialForms.length} financial form templates`);

      // فیلتر فرم‌های مالی که شرکت پر کرده
      const financialFormIds = financialForms.map(f => f.id);
      const financialSubmissions = formSubmissions.filter(sub => 
        financialFormIds.includes(sub.requirementId)
      );

      console.log(`✓ Company has submitted ${financialSubmissions.length} financial forms`);

      // استخراج و نگاشت داده‌ها با variableName
      const financialData: Record<string, number> = {};
      let totalFieldsExtracted = 0;
      const processedVariables = new Set<string>(); // برای جلوگیری از تکرار

      for (const submission of financialSubmissions) {
        try {
          // دریافت requirement برای خواندن fields
          const requirement = financialForms.find(f => f.id === submission.requirementId);
          if (!requirement) continue;

          // Parse fields با safe parsing (که الان variableName دارند)
          const fields = safeJsonParseArray(requirement.fields, []);

          // Parse form data با safe parsing
          const formData = safeJsonParseObject(submission.formData, {});

          console.log(`  📄 Processing form: ${requirement.title} (${fields.length} fields)`);

          // استخراج هر فیلد با variableName mapping
          for (const field of fields) {
            const fieldValue = formData[field.name];

            // اگر مقدار وجود دارد
            if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
              
              // تبدیل به عدد
              let numValue: number;

              if (typeof fieldValue === 'number') {
                numValue = fieldValue;
              } else {
                // پاکسازی: حذف کاما، فاصله، و کاراکترهای غیرعددی (به جز - و .)
                const cleanValue = String(fieldValue).replace(/,/g, '').replace(/\s/g, '').trim();
                numValue = parseFloat(cleanValue);
              }

              // اگر عدد معتبر است
              if (!isNaN(numValue) && isFinite(numValue)) {
                
                // استفاده از variableName برای نگاشت (سازگار با UI)
                const targetVariable = field.variableName || field.name;
                
                // جلوگیری از تکرار: فقط اولین مقدار را بگیر
                if (!processedVariables.has(targetVariable)) {
                  financialData[targetVariable] = numValue;
                  processedVariables.add(targetVariable);
                  totalFieldsExtracted++;
                  console.log(`    ✓ ${field.name} → ${targetVariable} = ${numValue}`);
                } else {
                  console.log(`    ⚠️ Duplicate variable ${targetVariable}, skipping`);
                }
              }
            }
          }
        } catch (parseError) {
          console.warn(`⚠️ Error parsing form submission ${submission.id}:`, parseError);
        }
      }

      console.log(`✅ Extracted ${totalFieldsExtracted} unique financial variables from forms`);
      console.log(`   Variables: ${Object.keys(financialData).join(', ')}`);

      return financialData;

    } catch (error) {
      logger.error('Error extracting financial data from forms', 'investment-reports', error as Error);
      return {};
    }
  }

  /**
   * محاسبه متغیرهای مالی با Formula Engine
   */
  private async calculateFinancialMetrics(inputData: Record<string, any>, companyId?: number): Promise<Record<string, number>> {
    try {
      console.log('📊 Calculating financial metrics with Formula Engine...');

      // استخراج داده‌های عددی مالی
      let financialInputs: Record<string, number> = {};

      // اگر companyId داریم، ابتدا از فرم‌های تکمیل شده استخراج کن
      if (companyId) {
        const formsData = await this.extractFinancialDataFromForms(companyId);
        financialInputs = { ...formsData };
        console.log(`✓ Loaded ${Object.keys(formsData).length} variables from company forms`);
      }
      
      // لیست متغیرهای ورودی مالی
      const inputVariables = [
        'revenue', 'cost_of_goods_sold', 'admin_selling_expenses', 'other_income', 
        'other_expenses', 'financial_expenses', 'non_operating_income_expense', 
        'tax_expense', 'depreciation',
        'tangible_fixed_assets', 'intangible_fixed_assets', 'long_term_investments',
        'prepayments', 'inventory', 'accounts_receivable', 'cash',
        'capital', 'legal_reserve', 'retained_earnings', 'long_term_payables',
        'employee_benefits_reserve', 'accounts_payable', 'short_term_facilities',
        'tax_payable', 'advance_receipts'
      ];

      // تبدیل به عدد و پاکسازی (inputData اولویت دارد)
      for (const varName of inputVariables) {
        if (inputData[varName] !== undefined && inputData[varName] !== null) {
          const value = parseFloat(String(inputData[varName]).replace(/,/g, ''));
          if (!isNaN(value)) {
            financialInputs[varName] = value; // Override form data if provided
          }
        }
      }

      // اگر داده‌های ورودی کافی نداریم، محاسبه نمی‌کنیم
      if (Object.keys(financialInputs).length < 5) {
        console.log('⚠️ Not enough financial input data for calculation');
        return {};
      }

      console.log(`✓ Total ${Object.keys(financialInputs).length} input variables ready for calculation`);

      // محاسبه با Formula Engine
      const result = await formulaEngineService.calculateAll(financialInputs);

      if (!result.success) {
        logger.warn('Formula calculation had errors', 'investment-reports', new Error('Formula errors'));
      } else {
        console.log(`✅ Calculated ${result.executionLog.length} formulas successfully`);
      }

      // اعتبارسنجی ترازنامه
      const balanceSheetValidation = formulaEngineService.validateBalanceSheet(result.values);
      console.log(`📋 Balance Sheet Validation: ${balanceSheetValidation.message}`);

      // افزودن نتیجه validation به داده‌های خروجی
      result.values['balance_sheet_valid'] = balanceSheetValidation.isValid ? 1 : 0;
      result.values['balance_sheet_difference'] = balanceSheetValidation.difference;

      return result.values;

    } catch (error) {
      logger.error('Error calculating financial metrics', 'investment-reports', error as Error);
      return {};
    }
  }

  /**
   * محاسبه امتیازات کلی
   */
  private calculateScores(data: Record<string, any>): {
    overall: number;
    team: number;
    product: number;
    market: number;
    financial: number;
    risk: number;
    breakdown: Record<string, number>;
  } {
    // Parse و validation امتیازات با default value = 0
    const team = this.validateScore(parseFloat(data.team_score), 'team');
    const product = this.validateScore(parseFloat(data.product_score), 'product');
    const market = this.validateScore(parseFloat(data.market_score), 'market');
    const financial = this.validateScore(parseFloat(data.financial_score), 'financial');
    const risk = this.validateScore(parseFloat(data.risk_score), 'risk');

    // محاسبه میانگین وزن‌دار
    const weights = {
      team: 0.25,
      product: 0.25,
      market: 0.20,
      financial: 0.20,
      risk: 0.10
    };

    const overall = (
      team * weights.team +
      product * weights.product +
      market * weights.market +
      financial * weights.financial +
      risk * weights.risk
    );

    // Validation نتیجه نهایی
    const validatedOverall = this.validateScore(overall, 'overall');

    return {
      overall: Math.round(validatedOverall * 10) / 10,
      team,
      product,
      market,
      financial,
      risk,
      breakdown: {
        team,
        product,
        market,
        financial,
        risk
      }
    };
  }

  /**
   * اعتبارسنجی امتیاز (باید بین 0 تا 10 باشد)
   */
  private validateScore(score: number, name: string): number {
    if (isNaN(score) || !isFinite(score)) {
      logger.warn(`Invalid score for ${name}: ${score}, using 0 as default`, 'investment-reports');
      return 0;
    }
    
    if (score < 0) {
      logger.warn(`Score for ${name} is negative (${score}), clamping to 0`, 'investment-reports');
      return 0;
    }
    
    if (score > 10) {
      logger.warn(`Score for ${name} exceeds maximum (${score}), clamping to 10`, 'investment-reports');
      return 10;
    }
    
    return score;
  }

  /**
   * پردازش قالب گزارش
   */
  private async processReportTemplate(
    templateBuffer: Buffer,
    replacementData: Record<string, any>
  ): Promise<Buffer> {
    let tempFilePath: string | null = null;
    
    try {
      logger.info('Processing report template using Unified Variable Manager', 'investment-reports');
      
      // ایجاد فایل موقت با unique ID برای جلوگیری از race condition
      const tempDir = path.join(process.cwd(), 'temp');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
      } catch (mkdirError) {
        logger.error('Failed to create temp directory', 'investment-reports', mkdirError as Error);
        throw new Error('خطا در ایجاد پوشه موقت');
      }
      
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${process.pid}`;
      tempFilePath = path.join(tempDir, `temp_report_${uniqueId}.docx`);
      
      await fs.writeFile(tempFilePath, templateBuffer);
      
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
      
      logger.info(`Report template processed: ${result.replacedCount} variables replaced`, 'investment-reports');
      return result.processedBuffer;
      
    } catch (error) {
      logger.error('Report template processing error', 'investment-reports', error as Error);
      
      // Fallback به روش legacy
      logger.warn('Falling back to legacy processing', 'investment-reports');
      return this.legacyProcessTemplate(templateBuffer, replacementData);
      
    } finally {
      // Cleanup فایل موقت در هر صورت
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
          logger.debug('Temp file cleaned up successfully', 'investment-reports');
        } catch (cleanupError) {
          logger.warn('Could not delete temp file', 'investment-reports', cleanupError as Error);
        }
      }
    }
  }

  /**
   * روش legacy پردازش (fallback)
   */
  private legacyProcessTemplate(
    templateBuffer: Buffer,
    replacementData: Record<string, any>
  ): Buffer {
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
  }

  /**
   * ذخیره گزارش تولید شده
   */
  private async saveGeneratedReport(
    outputBuffer: Buffer,
    reportNumber: string,
    companyId: number,
    templateId: number,
    reportType: string,
    reportData: any,
    scores: any,
    userId: number,
    verificationHash?: string,
    isPublic: number = 0
  ): Promise<string> {
    // بررسی حجم فایل (حداکثر 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (outputBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`حجم فایل گزارش (${Math.round(outputBuffer.length / 1024 / 1024)}MB) از حد مجاز (50MB) بیشتر است`);
    }

    const timestamp = Date.now();
    const fileName = `investment_report_${reportNumber}_${timestamp}.docx`;
    const reportsDir = path.resolve(process.cwd(), "uploads", "investment-reports");
    const filePath = path.resolve(reportsDir, fileName);

    logger.info(`Saving investment report: ${fileName}`, 'investment-reports');

    let fileCreated = false;

    try {
      // اطمینان از وجود directory
      try {
        await fs.mkdir(reportsDir, { recursive: true });
      } catch (mkdirError) {
        logger.error('Failed to create reports directory', 'investment-reports', mkdirError as Error);
        throw new Error('خطا در ایجاد پوشه گزارشات');
      }

      // ذخیره فایل
      try {
        await fs.writeFile(filePath, outputBuffer);
        fileCreated = true;
        logger.debug(`File written successfully: ${fileName}`, 'investment-reports');
      } catch (writeError) {
        logger.error('Failed to write report file', 'investment-reports', writeError as Error);
        throw new Error('خطا در ذخیره فایل گزارش');
      }

      // ثبت در دیتابیس
      try {
        await db.execute({
          sql: `INSERT INTO generated_investment_reports 
            (company_id, template_id, report_number, report_type, file_name, file_path, file_size, 
             report_data, scores, status, generated_by, verification_hash, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
          args: [
            companyId,
            templateId,
            reportNumber,
            reportType,
            fileName,
            filePath,
            outputBuffer.length,
            JSON.stringify(reportData),
            JSON.stringify(scores),
            userId,
            verificationHash || null,
            isPublic
          ]
        });
        
        logger.info('Report saved successfully to database', 'investment-reports');
        return fileName;
        
      } catch (dbError) {
        logger.error('Failed to save report to database', 'investment-reports', dbError as Error);
        
        // Rollback: حذف فایل اگر ثبت در DB fail شد
        if (fileCreated) {
          try {
            await fs.unlink(filePath);
            logger.info('Rolled back: deleted report file after DB failure', 'investment-reports');
          } catch (unlinkError) {
            logger.error('Failed to rollback (delete file)', 'investment-reports', unlinkError as Error);
          }
        }
        
        throw new Error('خطا در ثبت گزارش در پایگاه داده');
      }
      
    } catch (error) {
      // مدیریت خطاها
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('خطای نامشخص در ذخیره گزارش');
    }
  }

  /**
   * دریافت تحلیل AI شرکت
   */
  private async getCompanyAIAnalysis(companyId: number): Promise<any | null> {
    try {
      const result = await db.execute({
        sql: 'SELECT analysis_result FROM ai_chat_sessions WHERE company_id = ? ORDER BY created_at DESC LIMIT 1',
        args: [companyId]
      });

      const row = result.rows[0];
      if (row && row.analysis_result) {
        return typeof row.analysis_result === 'string' 
          ? safeJsonParse(row.analysis_result, null)
          : row.analysis_result;
      }

      return null;
    } catch (error) {
      logger.warn('Could not fetch AI analysis for company', 'investment-reports', error as Error);
      return null;
    }
  }

  /**
   * دریافت داده‌های فرم گزارش
   */
  private async getReportFormData(companyId: number, templateId: number): Promise<any | null> {
    try {
      const result = await db.execute({
        sql: 'SELECT * FROM investment_report_form_data WHERE company_id = ? AND template_id = ?',
        args: [companyId, templateId]
      });
      return result.rows[0] || null;
    } catch (error) {
      logger.warn('Could not fetch report form data', 'investment-reports', error as Error);
      return null;
    }
  }

  /**
   * ذخیره داده‌های فرم گزارش
   */
  async saveReportFormData(
    companyId: number,
    templateId: number,
    formData: any,
    userId: number
  ): Promise<any> {
    const existing = await this.getReportFormData(companyId, templateId);

    if (existing) {
      await db.execute({
        sql: `UPDATE investment_report_form_data 
          SET form_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        args: [JSON.stringify(formData), userId, existing.id]
      });

      return this.getReportFormData(companyId, templateId);
    } else {
      await db.execute({
        sql: `INSERT INTO investment_report_form_data 
          (company_id, template_id, form_data, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?)`,
        args: [companyId, templateId, JSON.stringify(formData), userId, userId]
      });

      return this.getReportFormData(companyId, templateId);
    }
  }

  /**
   * دریافت گزارش برای دانلود با اعتبارسنجی امنیتی
   */
  async getReportForDownload(fileName: string, userId?: number, userRole?: string): Promise<{
    filePath: string;
    companyId: number;
    report: any;
  }> {
    // Sanitize filename - حذف کاراکترهای مخرب
    const sanitizedFileName = path.basename(fileName);
    
    // بررسی الگوی نام فایل (باید با الگوی استاندارد ما مطابقت داشته باشد)
    if (!/^investment_report_[A-Z]{3}-\d{8}-\d+-\d+\.docx$/.test(sanitizedFileName)) {
      logger.warn(`Invalid report filename format: ${sanitizedFileName}`, 'investment-reports');
      throw new Error('نام فایل نامعتبر است');
    }
    
    const filePath = path.resolve(process.cwd(), "uploads", "investment-reports", sanitizedFileName);
    
    // بررسی که فایل در پوشه مجاز باشد (جلوگیری از Path Traversal)
    const reportsDir = path.resolve(process.cwd(), "uploads", "investment-reports");
    if (!filePath.startsWith(reportsDir + path.sep)) {
      logger.error(`Unauthorized file access attempt: ${filePath}`, 'investment-reports');
      throw new Error('دسترسی غیرمجاز به فایل');
    }

    // دریافت اطلاعات گزارش از دیتابیس برای بررسی دسترسی
    const result = await db.execute({
      sql: 'SELECT * FROM generated_investment_reports WHERE file_name = ?',
      args: [sanitizedFileName]
    });
    
    const report = result.rows[0];
    if (!report) {
      logger.warn(`Report not found in database: ${sanitizedFileName}`, 'investment-reports');
      throw new Error("گزارش در سیستم یافت نشد");
    }

    const companyId = report.company_id as number;

    // بررسی دسترسی کاربر به شرکت (اگر customer باشد)
    if (userId && userRole === 'customer') {
      const hasAccess = await this.userHasAccessToCompany(userId, companyId);
      if (!hasAccess) {
        logger.warn(`Unauthorized download attempt: userId=${userId}, fileName=${sanitizedFileName}`, 'investment-reports');
        throw new Error('شما به این گزارش دسترسی ندارید');
      }
    }

    // بررسی وجود فایل
    try {
      await fs.access(filePath);
      logger.info(`Report download authorized: ${sanitizedFileName}, user=${userId}`, 'investment-reports');
      return { filePath, companyId, report };
    } catch (error) {
      logger.error(`Report file not found on disk: ${sanitizedFileName}`, 'investment-reports', error as Error);
      throw new Error("فایل گزارش یافت نشد");
    }
  }

  // Helper Methods
  
  private isValidDocxFile(buffer: Buffer): boolean {
    return buffer.slice(0, 4).toString() === 'PK\x03\x04';
  }

  /**
   * اعتبارسنجی مسیر فایل قالب برای جلوگیری از Path Traversal
   */
  private validateTemplatePath(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(filePath);
    
    // بررسی که فایل در پوشه uploads باشد
    if (!resolvedPath.startsWith(uploadsDir)) {
      logger.error(`Invalid template path: outside uploads directory - ${filePath}`, 'investment-reports');
      throw new Error('مسیر فایل قالب نامعتبر است');
    }
    
    // بررسی عدم وجود کاراکترهای مخرب
    if (filePath.includes('..') || filePath.includes('~')) {
      logger.error(`Invalid template path: contains unsafe characters - ${filePath}`, 'investment-reports');
      throw new Error('مسیر فایل قالب حاوی کاراکترهای غیرمجاز است');
    }
    
    return true;
  }

  private generateReportNumber(reportType: string): string {
    const now = new Date(); // یکبار ایجاد برای consistency
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Validation reportType برای امنیت
    const validTypes = ['evaluation', 'progress', 'final', 'risk_assessment'];
    const safeType = validTypes.includes(reportType) ? reportType : 'evaluation';
    const typePrefix = safeType.substring(0, 3).toUpperCase();
    
    return `${typePrefix}-${year}${month}${day}-${timestamp}-${random}`;
  }

  private formatPersianDate(date: Date): string {
    try {
      return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      // Fallback در صورت خطا
      logger.warn('Persian date formatting failed, using ISO format', 'investment-reports', error as Error);
      return date.toISOString().split('T')[0];
    }
  }

  private formatArray(arr: any[] | undefined | null): string {
    try {
      if (!arr || !Array.isArray(arr)) return '';
      return arr.map((item, index) => `${index + 1}. ${item}`).join('\n');
    } catch (error) {
      logger.warn('Error formatting array', 'investment-reports', error as Error);
      return '';
    }
  }

  private getReportTypeLabel(reportType: string): string {
    const labels: Record<string, string> = {
      'evaluation': 'گزارش ارزیابی اولیه',
      'progress': 'گزارش پیشرفت',
      'final': 'گزارش نهایی',
      'risk_assessment': 'گزارش ارزیابی ریسک'
    };
    return labels[reportType] || 'گزارش عمومی';
  }

  /**
   * دریافت تمام گزارش‌های یک شرکت
   */
  async getCompanyReports(companyId: number): Promise<any[]> {
    const result = await db.execute({
      sql: `SELECT * FROM generated_investment_reports 
        WHERE company_id = ? 
        ORDER BY generated_at DESC`,
      args: [companyId]
    });
    return result.rows;
  }

  /**
   * به‌روزرسانی وضعیت گزارش
   */
  async updateReportStatus(
    reportId: number,
    status: 'draft' | 'finalized' | 'approved' | 'rejected',
    userId: number,
    notes?: string
  ): Promise<void> {
    // ابتدا گزارش فعلی را دریافت می‌کنیم تا وضعیت هش را بررسی کنیم
    const currentResult = await db.execute({
      sql: 'SELECT verification_hash, is_public FROM generated_investment_reports WHERE id = ?',
      args: [reportId]
    });

    const currentReport = currentResult.rows[0];
    if (!currentReport) {
      throw new Error(`Report with ID ${reportId} not found`);
    }

    let verificationHash = currentReport.verification_hash;
    let isPublic = currentReport.is_public;

    // اگر وضعیت به نهایی یا تایید شده تغییر می‌کند
    if (status === 'finalized' || status === 'approved') {
      // اگر هش ندارد، تولید کن
      if (!verificationHash) {
        verificationHash = uuidv4();
        logger.info(`Generated verification hash for report ${reportId}: ${verificationHash}`, 'investment-reports');
      }
      // عمومی کردن گزارش برای اعتبارسنجی
      isPublic = 1;
    }

    await db.execute({
      sql: `UPDATE generated_investment_reports 
        SET status = ?, 
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            approval_notes = ?,
            verification_hash = ?,
            is_public = ?
        WHERE id = ?`,
      args: [status, userId, notes || null, verificationHash, isPublic, reportId]
    });
  }

  /**
   * دریافت گزارش عمومی با استفاده از هش (برای اعتبارسنجی)
   */
  async getPublicReportByHash(hash: string): Promise<any> {
    const result = await db.execute({
      sql: `SELECT
        r.report_number,
        r.report_type,
        r.generated_at,
        r.status,
        r.file_name,
        c.name as company_name,
        c.national_id as company_national_id,
        t.name as template_name
      FROM generated_investment_reports r
      JOIN companies c ON r.company_id = c.id
      JOIN investment_report_templates t ON r.template_id = t.id
      WHERE r.verification_hash = ? AND r.is_public = 1`,
      args: [hash]
    });

    return result.rows[0] || null;
  }

  /**
   * بررسی دسترسی کاربر به شرکت
   */
  async userHasAccessToCompany(userId: number, companyId: number): Promise<boolean> {
    return await storage.userHasAccessToCompany(userId, companyId);
  }
}

export const investmentReportsService = new InvestmentReportsService();

