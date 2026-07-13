import type { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { db } from "../db";
import { investmentReportsService } from "../services/investment-reports.service";
import { aiReportGenerationService } from "../services/ai-report-generation.service";
import { formulaEngineService } from "../services/formula-engine.service";
import type { AuthRequest } from "../middleware/auth";
import { logger } from "../utils/logger";
import { storage } from "../storage";

export class InvestmentReportsController {
  
  /**
   * GET /api/investment-reports/templates - دریافت قالب‌های گزارش
   */
  async getReportTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, isActive } = req.query;
      
      const filters: any = {};
      if (category) filters.category = category as string;
      if (isActive) filters.isActive = isActive === 'true';

      const templates = await investmentReportsService.getReportTemplates(filters);
      res.json({ success: true, templates });
    } catch (error) {
      logger.error("Get report templates error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/investment-reports/templates/:id - دریافت یک قالب
   */
  async getReportTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.id);
      const template = await investmentReportsService.getReportTemplate(templateId);

      if (!template) {
        res.status(404).json({ success: false, message: "قالب گزارش یافت نشد" });
        return;
      }

      res.json({ success: true, template });
    } catch (error) {
      logger.error("Get report template error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/investment-reports/templates - ایجاد قالب جدید
   */
  async createReportTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, category, variables, sections, chartConfigs } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, message: "فایل قالب الزامی است" });
        return;
      }

      // ✅ SECURITY: Check file type before upload
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      const isValidType = validMimeTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.docx');

      if (!isValidType) {
        logger.warn(`Invalid file type uploaded: ${file.mimetype}`, 'investment-reports-controller');
        res.status(400).json({
          success: false,
          message: "فقط فایل‌های Word با فرمت DOCX مجاز است"
        });
        return;
      }

      // بررسی حجم فایل قالب (حداکثر 10MB)
      const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_TEMPLATE_SIZE) {
        res.status(413).json({
          success: false,
          message: `حجم فایل قالب (${Math.round(file.size / 1024 / 1024)}MB) از حد مجاز (10MB) بیشتر است`
        });
        return;
      }

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: "نام قالب الزامی است" });
        return;
      }

      const template = await investmentReportsService.createReportTemplate({
        name: name.trim(),
        description: description?.trim() || '',
        category: category || 'general',
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        variables: variables ? (typeof variables === 'string' ? JSON.parse(variables) : variables) : [],
        sections: sections ? (typeof sections === 'string' ? JSON.parse(sections) : sections) : [],
        chartConfigs: chartConfigs ? (typeof chartConfigs === 'string' ? JSON.parse(chartConfigs) : chartConfigs) : null,
        createdBy: req.user.userId
      });

      res.status(201).json({
        success: true,
        template,
        message: `قالب "${name}" با موفقیت ایجاد شد`
      });
    } catch (error) {
      logger.error("Create report template error", 'investment-reports-controller', error as Error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "خطای سیستم در ایجاد قالب" 
      });
    }
  }

  /**
   * POST /api/investment-reports/generate - تولید گزارش ارزیابی
   */
  async generateReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        templateId, 
        companyId, 
        reportNumber, 
        reportType,
        customFields, 
        variables,
        includeCharts 
      } = req.body;

      logger.info('INVESTMENT REPORT GENERATION REQUEST', 'investment-reports-controller');
      logger.info(`User: ${req.user.userId}, Template: ${templateId}, Company: ${companyId}`, 'investment-reports-controller');

      // Validation ورودی‌ها
      if (!templateId || !companyId) {
        res.status(400).json({ 
          success: false, 
          message: "اطلاعات ناکافی برای تولید گزارش" 
        });
        return;
      }

      // بررسی که templateId و companyId عدد صحیح مثبت باشند
      const parsedTemplateId = parseInt(String(templateId), 10);
      const parsedCompanyId = parseInt(String(companyId), 10);

      if (isNaN(parsedTemplateId) || parsedTemplateId <= 0) {
        res.status(400).json({ 
          success: false, 
          message: "شناسه قالب نامعتبر است" 
        });
        return;
      }

      if (isNaN(parsedCompanyId) || parsedCompanyId <= 0) {
        res.status(400).json({ 
          success: false, 
          message: "شناسه شرکت نامعتبر است" 
        });
        return;
      }

      // بررسی دسترسی
      if (req.user.role === "customer") {
        const hasAccess = await investmentReportsService.userHasAccessToCompany(req.user.userId, parsedCompanyId);
        if (!hasAccess) {
          res.status(403).json({ success: false, message: "عدم دسترسی به این شرکت" });
          return;
        }
      }

      const result = await investmentReportsService.generateReport(
        {
          templateId: parsedTemplateId,
          companyId: parsedCompanyId,
          reportNumber,
          reportType,
          customFields,
          variables,
          includeCharts
        },
        req.user.userId
      );

      res.json(result);
    } catch (error) {
      logger.error("Generate report error", 'investment-reports-controller', error as Error);
      
      if (error instanceof Error) {
        // خطاهای Not Found
        if (error.message.includes("قالب گزارش یافت نشد") || error.message.includes("Template not found")) {
          res.status(404).json({ success: false, message: "قالب گزارش مورد نظر یافت نشد" });
          return;
        }
        if (error.message.includes("شرکت یافت نشد") || error.message.includes("Company not found")) {
          res.status(404).json({ success: false, message: "شرکت مورد نظر یافت نشد" });
          return;
        }
        
        // خطاهای Validation
        if (error.message.includes("نامعتبر") || error.message.includes("invalid")) {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
        
        // خطاهای حجم فایل
        if (error.message.includes("حجم فایل") || error.message.includes("file size")) {
          res.status(413).json({ success: false, message: error.message });
          return;
        }
        
        // سایر خطاها با پیام اصلی
        res.status(500).json({ success: false, message: `خطا در تولید گزارش: ${error.message}` });
        return;
      }
      
      res.status(500).json({ success: false, message: "خطای سیستم در تولید گزارش" });
    }
  }

  /**
   * GET /api/investment-reports/download/:fileName - دانلود گزارش
   */
  async downloadReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fileName = req.params.fileName;
      
      // دریافت فایل با بررسی دسترسی
      const result = await investmentReportsService.getReportForDownload(
        fileName,
        req.user.userId,
        req.user.role
      );

      // Audit log برای دانلود (non-blocking)
      storage.createAuditLog({
        userId: req.user.userId,
        action: "download_investment_report",
        resource: "investment_report",
        resourceId: result.companyId,
        details: JSON.stringify({ 
          fileName,
          companyId: result.companyId,
          reportId: result.report.id,
          timestamp: new Date().toISOString()
        }),
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
      }).catch(err => {
        logger.warn('Audit log failed for report download', 'investment-reports-controller', err as Error);
      });

      res.download(result.filePath, fileName, (err) => {
        if (err) {
          logger.error('Download error', 'investment-reports-controller', err as Error);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: "خطا در دانلود فایل" });
          }
        } else {
          logger.info(`Download completed: ${fileName}, user=${req.user.userId}`, 'investment-reports-controller');
        }
      });

    } catch (error) {
      logger.error("Download report error", 'investment-reports-controller', error as Error);
      
      if (error instanceof Error) {
        if (error.message.includes("فایل گزارش یافت نشد") || error.message.includes("گزارش در سیستم یافت نشد")) {
          res.status(404).json({ success: false, message: error.message });
        } else if (error.message.includes('نامعتبر')) {
          res.status(400).json({ success: false, message: error.message });
        } else if (error.message.includes('دسترسی') || error.message.includes('غیرمجاز')) {
          res.status(403).json({ success: false, message: error.message });
        } else {
          res.status(500).json({ success: false, message: "خطای سیستم" });
        }
      } else {
        res.status(500).json({ success: false, message: "خطای سیستم" });
      }
    }
  }

  /**
   * GET /api/investment-reports/company/:companyId - دریافت گزارش‌های یک شرکت
   */
  async getCompanyReports(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);

      // بررسی دسترسی
      if (req.user.role === "customer") {
        const hasAccess = await investmentReportsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ success: false, message: "عدم دسترسی به این شرکت" });
          return;
        }
      }

      const reports = await investmentReportsService.getCompanyReports(companyId);
      res.json({ success: true, reports });
    } catch (error) {
      logger.error("Get company reports error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/investment-reports/form-data/:companyId/:templateId - دریافت داده‌های فرم
   */
  async getReportFormData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const templateId = parseInt(req.params.templateId);

      // بررسی دسترسی
      if (req.user.role === "customer") {
        const hasAccess = await investmentReportsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ success: false, message: "عدم دسترسی به این شرکت" });
          return;
        }
      }

      const formData = await investmentReportsService['getReportFormData'](companyId, templateId);
      res.json({ success: true, formData });
    } catch (error) {
      logger.error("Get report form data error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/investment-reports/form-data - ذخیره داده‌های فرم
   */
  async saveReportFormData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { companyId, templateId, formData } = req.body;

      if (!companyId || !templateId || !formData) {
        res.status(400).json({ 
          success: false, 
          message: "اطلاعات ناقص است" 
        });
        return;
      }

      // بررسی دسترسی
      if (req.user.role === "customer") {
        const hasAccess = await investmentReportsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ success: false, message: "عدم دسترسی به این شرکت" });
          return;
        }
      }

      const result = await investmentReportsService.saveReportFormData(
        companyId,
        templateId,
        formData,
        req.user.userId
      );

      res.json({ success: true, formData: result });
    } catch (error) {
      logger.error("Save report form data error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * PUT /api/investment-reports/:id/status - به‌روزرسانی وضعیت گزارش
   */
  async updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const reportId = parseInt(req.params.id);
      const { status, notes } = req.body;

      if (!status || !['draft', 'finalized', 'approved', 'rejected'].includes(status)) {
        res.status(400).json({ 
          success: false, 
          message: "وضعیت نامعتبر است" 
        });
        return;
      }

      // فقط admin و ceo می‌توانند وضعیت را تغییر دهند
      if (!['admin', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ 
          success: false, 
          message: "شما مجاز به تغییر وضعیت گزارش نیستید" 
        });
        return;
      }

      await investmentReportsService.updateReportStatus(
        reportId,
        status,
        req.user.userId,
        notes
      );

      res.json({ 
        success: true, 
        message: `وضعیت گزارش به "${status}" تغییر یافت` 
      });
    } catch (error) {
      logger.error("Update report status error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/investment-reports/generate-ai - تولید گزارش با AI بدون قالب
   */
  async generateAIReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        companyId,
        serviceId,
        customText,
        usePerplexity = true,
        detailLevel = 'detailed',
        perplexityOptions
      } = req.body;

      console.log('🔍 === AI REPORT GENERATION (NO TEMPLATE) ===');
      console.log('🏢 companyId:', companyId);
      console.log('🎯 serviceId:', serviceId || 'none (general analysis)');
      console.log('📝 customText length:', customText?.length || 0);
      console.log('🔍 usePerplexity:', usePerplexity);
      console.log('📊 detailLevel:', detailLevel);

      if (!companyId) {
        res.status(400).json({
          success: false,
          message: "شناسه شرکت الزامی است"
        });
        return;
      }

      // بررسی دسترسی
      if (req.user.role === "customer") {
        res.status(403).json({ success: false, message: "دسترسی محدود" });
        return;
      }

      const result = await aiReportGenerationService.generateReport({
        companyId,
        serviceId,
        customText,
        usePerplexity,
        perplexityOptions: perplexityOptions || {
          researchCompany: true,
          researchIndustry: true
        },
        detailLevel
      });

      // Save generated report to filesystem & database so we can list history
      let dbReportId = null;
      let htmlFileName = "";
      try {
        const reportsDir = path.resolve(process.cwd(), "uploads", "investment-reports");
        await fs.mkdir(reportsDir, { recursive: true });
        
        // Use allowed filename pattern
        htmlFileName = `investment_report_AI_${companyId}_${Date.now()}.html`;
        const filePath = path.join(reportsDir, htmlFileName);
        await fs.writeFile(filePath, result.content);
        
        const reportNumber = `AI-${companyId}-${Date.now()}`;
        const dbResult = await db.execute({
          sql: `INSERT INTO generated_investment_reports 
            (company_id, template_id, report_number, report_type, file_name, file_path, file_size, 
             report_data, status, generated_by, is_public)
            VALUES (?, ?, ?, 'ai_freetext', ?, ?, ?, ?, 'finalized', ?, ?) RETURNING id`,
          args: [
            companyId,
            1, // templateId
            reportNumber,
            htmlFileName,
            filePath,
            result.content.length,
            JSON.stringify({
              html: result.content,
              metadata: result.metadata,
              perplexityResearch: result.perplexityResearch
            }),
            req.user.userId,
            false
          ]
        });
        if (dbResult && dbResult.rows && dbResult.rows[0]) {
          dbReportId = dbResult.rows[0].id;
        }
        logger.info(`✅ AI HTML report saved to database with id ${dbReportId}`, 'investment-reports-controller');
      } catch (saveError) {
        logger.error("Failed to save AI report database/file backup", 'investment-reports-controller', saveError as Error);
      }

      res.json({
        success: true,
        report: {
          ...result,
          id: dbReportId,
          fileName: htmlFileName
        },
        message: 'گزارش با موفقیت تولید شد'
      });

    } catch (error) {
      logger.error("Generate AI report error", 'investment-reports-controller', error as Error);

      if (error instanceof Error) {
        if (error.message.includes('شرکت یافت نشد')) {
          res.status(404).json({ success: false, message: error.message });
          return;
        }
        if (error.message.includes('API')) {
          res.status(502).json({ 
            success: false, 
            message: `خطا در ارتباط با سرویس AI: ${error.message}` 
          });
          return;
        }
        if (error.message.includes('ANTHROPIC_API_KEY')) {
          res.status(500).json({
            success: false,
            message: 'سرویس AI پیکربندی نشده است'
          });
          return;
        }
      }

      res.status(500).json({ success: false, message: "خطای سیستم در تولید گزارش" });
    }
  }

  /**
   * GET /api/investment-reports/variables - دریافت لیست متغیرهای گزارش
   */
  async getReportVariables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, source } = req.query;
      
      const filters: any = {};
      if (category) filters.category = category as string;
      if (source) filters.source = source as string;

      const variables = await storage.getInvestmentReportVariables(filters);
      
      res.json({ 
        success: true, 
        variables,
        total: variables.length
      });
    } catch (error) {
      logger.error("Get report variables error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطا در دریافت متغیرها" });
    }
  }

  /**
   * GET /api/investment-reports/formulas - دریافت لیست فرمول‌های محاسباتی
   */
  async getFormulas(req: AuthRequest, res: Response): Promise<void> {
    try {
      const formulas = await storage.getFinancialFormulas();
      
      // افزودن اطلاعات dependencies به هر فرمول
      const formulasWithDeps = await Promise.all(
        formulas.map(async (formula: any) => ({
          ...formula,
          dependencies: await storage.getFormulaDependencies(formula.id)
        }))
      );

      res.json({ 
        success: true, 
        formulas: formulasWithDeps,
        total: formulasWithDeps.length
      });
    } catch (error) {
      logger.error("Get formulas error", 'investment-reports-controller', error as Error);
      res.status(500).json({ success: false, message: "خطا در دریافت فرمول‌ها" });
    }
  }

  /**
   * POST /api/investment-reports/calculate - محاسبه متغیرهای مالی
   */
  async calculateMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inputData = req.body;

      if (!inputData || Object.keys(inputData).length === 0) {
        res.status(400).json({ success: false, message: "داده‌های ورودی الزامی است" });
        return;
      }

      console.log('📊 Calculating financial metrics...');

      // محاسبه با Formula Engine
      const result = await formulaEngineService.calculateAll(inputData);

      // اعتبارسنجی ترازنامه
      const balanceSheetValidation = formulaEngineService.validateBalanceSheet(result.values);

      res.json({
        success: result.success,
        values: result.values,
        executionLog: result.executionLog,
        errors: result.errors,
        validation: {
          balanceSheet: balanceSheetValidation
        }
      });

    } catch (error) {
      logger.error("Calculate metrics error", 'investment-reports-controller', error as Error);
      res.status(500).json({ 
        success: false, 
        message: "خطا در محاسبه متغیرها",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const investmentReportsController = new InvestmentReportsController();

