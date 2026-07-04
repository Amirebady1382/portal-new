import type { Request, Response } from "express";
import { contractsService } from "../services/contracts.service";
import { templateValidationService } from "../services/template-validation.service";
import type { AuthRequest } from "../middleware/auth";
import * as path from "path";

export class ContractsController {
  /**
   * GET /api/contract-templates - Get all contract templates
   */
  async getContractTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templates = await contractsService.getContractTemplates();
      res.json({ templates });
    } catch (error) {
      console.error("Get contract templates error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/contract-templates - Create new contract template
   */
  async createContractTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, variables, category } = req.body;
      const file = req.file;

      console.log('📄 Creating contract template:', { name, description, category, variablesLength: variables?.length });

      if (!file) {
        res.status(400).json({
          success: false,
          message: "فایل قالب الزامی است"
        });
        return;
      }

      // ✅ SECURITY: Check file type before upload
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      const isValidType = validMimeTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.docx');

      if (!isValidType) {
        console.warn(`⚠️ Invalid file type: ${file.mimetype}`);
        res.status(400).json({
          success: false,
          message: "فقط فایل‌های Word با فرمت DOCX مجاز است"
        });
        return;
      }

      // 🚀 PERFORMANCE: Check file size limit (10MB for Word templates)
      const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_TEMPLATE_SIZE) {
        console.warn(`⚠️ Template file too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        res.status(400).json({
          success: false,
          message: `حجم فایل بیش از حد مجاز است. حداکثر: 10MB، فایل شما: ${(file.size / 1024 / 1024).toFixed(2)}MB`
        });
        return;
      }

      if (!name || !name.trim()) {
        res.status(400).json({ 
          success: false,
          message: "نام قالب الزامی است" 
        });
        return;
      }

      const template = await contractsService.createContractTemplate({
        name: name.trim(),
        description: description?.trim() || '',
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        variables: variables ? (typeof variables === 'string' ? variables : JSON.stringify(variables)) : null,
        category: category || null,
        version: '1.0',
        isActive: true,
        createdBy: req.user.userId
      });

      console.log('✅ Template created successfully:', template);

      res.status(201).json({
        success: true,
        template,
        message: `قالب "${name}" با موفقیت ایجاد شد`
      });
    } catch (error) {
      console.error("Create contract template error:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "خطای سیستم در ایجاد قالب" 
      });
    }
  }

  /**
   * GET /api/contract-form-data/:companyId/:templateId - Get contract form data
   */
  async getContractFormData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const templateId = parseInt(req.params.templateId);

      // Check access
      if (req.user.role === "customer") {
        const hasAccess = await contractsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "عدم دسترسی به این شرکت" });
          return;
        }
      }

      const formData = await contractsService.getContractFormData(companyId, templateId);
      res.json({ formData });
    } catch (error) {
      console.error("Get contract form data error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/contract-form-data - Save/update contract form data
   */
  async saveContractFormData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { companyId, templateId, formType, formData } = req.body;

      // Check access
      if (req.user.role === "customer") {
        const hasAccess = await contractsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "عدم دسترسی به این شرکت" });
          return;
        }
      }

      const result = await contractsService.saveContractFormData(
        companyId,
        templateId,
        formType,
        formData,
        req.user.userId
      );

      res.json({ formData: result });
    } catch (error) {
      console.error("Save contract form data error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/contracts/preview - Preview contract generation metadata
   */
  async previewContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId, companyId, contractNumber, customFields, variables } = req.body;

      if (!templateId || !companyId || !contractNumber) {
        res.status(400).json({ message: "اطلاعات ناکافی برای پیش‌نمایش" });
        return;
      }

      const result = await contractsService.previewContractGeneration(
        {
          templateId,
          companyId,
          contractNumber,
          customFields,
          variables
        },
        req.user.userId
      );

      res.json(result);
    } catch (error) {
      console.error("Preview contract error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "خطای سیستم در پیش‌نمایش قرارداد"
      });
    }
  }

  /**
   * POST /api/contracts/generate - Generate contract document
   */
  async generateContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId, companyId, contractNumber, customFields, variables } = req.body;

      console.log('🔍 === CONTRACT GENERATION REQUEST ===');
      console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
      console.log('📋 templateId:', templateId);
      console.log('🏢 companyId:', companyId);
      console.log('📄 contractNumber:', contractNumber);
      console.log('📝 customFields:', customFields);
      console.log('🔧 variables:', variables);

      if (!templateId || !companyId || !contractNumber) {
        res.status(400).json({ message: "اطلاعات ناکافی برای تولید قرارداد" });
        return;
      }

      const result = await contractsService.generateContract(
        {
          templateId,
          companyId,
          contractNumber,
          customFields,
          variables
        },
        req.user.userId
      );

      res.json(result);
    } catch (error) {
      console.error("Generate contract error:", error);
      
      // Handle specific error messages
      if (error instanceof Error) {
        if (error.message.includes("قالب قرارداد یافت نشد")) {
          res.status(404).json({ message: error.message });
          return;
        }
        if (error.message.includes("شرکت یافت نشد")) {
          res.status(404).json({ message: error.message });
          return;
        }
        if (error.message.includes("خطا در خواندن فایل قالب") || 
            error.message.includes("خطا در پردازش قالب قرارداد")) {
          res.status(500).json({ message: error.message });
          return;
        }
      }
      
      res.status(500).json({ message: "خطای سیستم در تولید قرارداد" });
    }
  }

  /**
   * GET /api/contracts/templates/:id/download - Download template file
   */
  async downloadTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.id);
      const template = await contractsService.getContractTemplate(templateId);

      if (!template) {
        res.status(404).json({ message: "قالب یافت نشد" });
        return;
      }

      const filePath = template.filePath;
      const fileName = template.fileName;

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('❌ Template download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "خطا در دانلود قالب" });
          }
        }
      });
    } catch (error) {
      console.error("Download template error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/contracts/download/:fileName - Download contract file
   */
  async downloadContract(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fileName = req.params.fileName;
      
      const filePath = await contractsService.getContractForDownload(fileName);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('❌ Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "خطا در دانلود فایل" });
          }
        } else {
          console.log('✅ Download completed successfully');
        }
      });

    } catch (error) {
      console.error("Download contract error:", error);
      
      if (error instanceof Error && error.message === "فایل یافت نشد") {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "خطای سیستم" });
      }
    }
  }

  /**
   * DELETE /api/contracts/templates/:id - Delete contract template
   */
  async deleteContractTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.id);
      const success = await contractsService.deleteContractTemplate(templateId);
      
      if (success) {
        res.json({ success: true, message: "قالب با موفقیت حذف شد" });
      } else {
        res.status(404).json({ success: false, message: "قالب یافت نشد" });
      }
    } catch (error) {
      console.error("Delete contract template error:", error);
      res.status(500).json({ success: false, message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/contract-templates/:id/validate - Validate template variables
   */
  async validateTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.id);
      const { autoCreateMissing = false } = req.body;

      const template = await contractsService.getContractTemplate(templateId);
      if (!template) {
        res.status(404).json({ success: false, message: "قالب یافت نشد" });
        return;
      }

      // تشخیص مسیر فایل
      let templatePath: string;
      if (template.fileName === 'zemaat-template.docx') {
        templatePath = path.resolve(process.cwd(), "uploads", "templates", "zemaat-template.docx");
      } else {
        templatePath = template.filePath;
      }

      const validationResult = await templateValidationService.validateTemplateVariables(
        templatePath,
        autoCreateMissing,
        autoCreateMissing ? req.user.userId : undefined
      );

      // Combine valid and missing variables for a complete list with metadata
      // This ensures the variables have their full extraction properties (source, type, label)
      const extraction = await templateValidationService.getExtractionDetails(templatePath);
      const allVariablesWithMetadata = extraction.variables.map(v => ({
        id: v.id || v.name,
        name: v.name,
        label: v.label || v.name,
        type: v.type,
        source: v.source,
        required: v.required,
        category: v.category
      }));

      // 💾 PERSISTENCE: Save the detected variables to the template in database
      await contractsService.updateContractTemplate(templateId, {
        variables: JSON.stringify(allVariablesWithMetadata)
      });

      console.log(`💾 Persisted ${allVariablesWithMetadata.length} variables to template ${templateId}`);

      res.json({
        success: true,
        validation: validationResult,
        variables: allVariablesWithMetadata,
        message: validationResult.isValid 
          ? 'تمام متغیرهای قالب معتبر هستند و در سیستم ثبت شدند' 
          : `${validationResult.stats.missing} متغیر ناموجود شناسایی شد`
      });

    } catch (error) {
      console.error("Validate template error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }
}

export const contractsController = new ContractsController(); 