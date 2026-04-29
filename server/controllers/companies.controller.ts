import type { Request, Response } from "express";
import { companiesService } from "../services/companies.service";
import { storage } from "../storage";
import type { AuthRequest } from "../middleware/auth";

export class CompaniesController {
  /**
   * GET /api/companies - Get companies with filters
   */
  async getCompanies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, status, search, department } = req.query;

      const companies = await companiesService.getCompanies({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        search: search as string,
        department: department as string,
        userId: req.user.role === "customer" ? req.user.userId : undefined,
      });

      res.json(companies);
    } catch (error) {
      console.error("Get companies error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/companies/:id - Get single company
   */
  async getCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      const company = await companiesService.getCompany(companyId);

      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      // Check access permissions
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      res.json(company);
    } catch (error) {
      console.error("Get company error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/companies - Create new company
   */
  async createCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyData = req.body;
      const company = await companiesService.createCompany(companyData);

      // If customer is creating company, associate them as owner
      if (req.user.role === "customer") {
        await companiesService.associateUserWithCompany(req.user.userId, company.id, true);
      }

      res.status(201).json(company);
    } catch (error) {
      console.error("Create company error:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "خطای سیستم"
      });
    }
  }

  /**
   * PATCH /api/companies/:id - Update company
   */
  async updateCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      const updateData = req.body;

      // Check permissions
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const company = await companiesService.updateCompany(companyId, updateData);

      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      // Log status change if status was updated
      if (updateData.status) {
        await storage.createAuditLog({
          userId: req.user.userId,
          action: "status_change",
          resource: "company",
          resourceId: companyId,
          details: JSON.stringify({ newStatus: updateData.status }),
          ipAddress: req.ip || null,
          userAgent: req.get("User-Agent") || null,
        });
      }

      res.json(company);
    } catch (error) {
      console.error("Update company error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }


  /**
   * POST /api/companies/validate - Validate company with Rasmio API
   */
  async validateCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nationalId, companyName } = req.body;
      const validation = await companiesService.validateCompany(nationalId, companyName);

      res.json(validation);
    } catch (error) {
      console.error("خطا در اعتبارسنجی شرکت:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "خطا در اعتبارسنجی شرکت"
      });
    }
  }

  /**
   * GET /api/companies/:id/enrich - Enrich company data with Rasmio API
   */
  async enrichCompanyData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      const enrichedData = await companiesService.enrichCompanyData(companyId);

      // 🆕 ذخیره داده‌های رسمیو در دیتابیس
      if (enrichedData && !enrichedData.error) {
        console.log(`📝 Saving Rasmio data for company ${companyId}...`);
        console.log(`   - News count: ${enrichedData.news?.length || 0}`);

        await storage.updateCompany(companyId, {
          rasmioData: JSON.stringify(enrichedData)
        });

        console.log(`✅ Rasmio data saved successfully`);
      }

      res.json(enrichedData);
    } catch (error) {
      console.error("خطا در تکمیل اطلاعات شرکت:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "خطا در تکمیل اطلاعات شرکت"
      });
    }
  }

  /**
   * GET /api/companies/:id/ai-analysis - AI Analysis for a company
   * Query params: 
   *   - forceRefresh=true to bypass cache
   *   - serviceId=<number> to focus analysis on specific service
   */
  async getCompanyAIAnalysis(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      const forceRefresh = req.query.forceRefresh === 'true';
      const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined;

      console.log(`🎯 Controller: AI Analysis request for company ${companyId}, forceRefresh: ${forceRefresh}, serviceId: ${serviceId || 'none'}`);

      // Check access permissions
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const analysisResult = await companiesService.getCompanyAIAnalysis(companyId, forceRefresh, serviceId);

      res.json(analysisResult);
    } catch (error) {
      console.error("❌ خطا در تحلیل هوش مصنوعی:", error);
      res.status(500).json({ message: "خطا در تحلیل هوش مصنوعی" });
    }
  }

  /**
   * PUT /api/companies/:id/info/:type - Update company info panels
   */
  async updateCompanyInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      const infoType = req.params.type as 'teamInfo' | 'productInfo' | 'marketInfo' | 'financialInfo';
      const data = req.body;

      // Check permissions
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      // Update company info
      const updatedCompany = await companiesService.updateCompanyInfo(companyId, infoType, data);

      if (!updatedCompany) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      // Log the update
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "update_company_info",
        resource: "company",
        resourceId: companyId,
        details: JSON.stringify({ infoType, data }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({
        message: "اطلاعات با موفقیت به‌روزرسانی شد",
        company: updatedCompany
      });
    } catch (error) {
      console.error("Update company info error:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "خطای سیستم"
      });
    }
  }

  /**
   * GET /api/companies/:id/financial-summary - دریافت خلاصه مالی
   */
  async getFinancialSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);

      // Check access
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      const status = (company as any).financialSummaryStatus || 'pending';
      const data = (company as any).financialSummaryData;
      const error = (company as any).financialSummaryError;
      const lastUpdated = (company as any).financialSummaryLastUpdated;

      // Debug logging
      console.log(`🔍 Financial Summary Debug for company ${companyId}:`);
      console.log(`   Status: ${status}`);
      console.log(`   Has Data: ${!!data}`);
      console.log(`   Data Length: ${data ? (typeof data === 'string' ? data.length : JSON.stringify(data).length) : 0}`);
      console.log(`   Last Updated: ${lastUpdated}`);

      if (status === 'completed' && data) {
        res.json({
          success: true,
          status,
          data,
          lastUpdated
        });
      } else if (status === 'processing') {
        res.json({
          success: false,
          status,
          message: 'در حال پردازش اظهارنامه مالیاتی...'
        });
      } else if (status === 'error') {
        res.json({
          success: false,
          status,
          message: 'خطا در پردازش',
          error
        });
      } else {
        res.json({
          success: false,
          status: 'pending',
          message: 'نیاز به آپلود اظهارنامه مالیاتی'
        });
      }
    } catch (error) {
      console.error("Get financial summary error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/companies/:id/reprocess-tax-declaration - پردازش مجدد اظهارنامه
   */
  async reprocessTaxDeclaration(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);

      // Only admins and employees can trigger reprocessing
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      console.log(`🔄 درخواست پردازش مجدد اظهارنامه: شرکت ${companyId}`);

      // Import service
      const { financialProcessingJobService } = await import('../services/financial-processing-job.service');

      // Trigger reprocessing (async)
      financialProcessingJobService.reprocessTaxDeclaration(companyId)
        .then(() => {
          console.log(`✅ پردازش مجدد تکمیل شد: شرکت ${companyId}`);
        })
        .catch((error) => {
          console.error(`❌ خطا در پردازش مجدد: ${error.message}`);
        });

      res.json({
        success: true,
        message: 'پردازش مجدد شروع شد. لطفاً چند لحظه صبر کنید...'
      });

    } catch (error) {
      console.error("Reprocess tax declaration error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "خطای سیستم"
      });
    }
  }

  /**
   * GET /api/companies/:id/tax-declaration-status - بررسی وضعیت اظهارنامه
   */
  async getTaxDeclarationStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);

      // Check access
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      const documents = await storage.getDocumentsByCompany(companyId);
      const taxDeclaration = documents.find((doc: any) => doc.category === 'اظهارنامه مالیاتی');

      res.json({
        hasTaxDeclaration: !!taxDeclaration,
        status: (company as any).financialSummaryStatus || 'pending',
        lastUpdated: (company as any).financialSummaryLastUpdated,
        error: (company as any).financialSummaryError,
        document: taxDeclaration ? {
          id: taxDeclaration.id,
          filename: taxDeclaration.originalName,
          uploadedAt: taxDeclaration.createdAt,
          fileSize: taxDeclaration.fileSize
        } : null
      });

    } catch (error) {
      console.error("Get tax declaration status error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/companies/:id/financial-trends - نمودارهای تحلیلی
   */
  async getFinancialTrends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);

      // Check access
      if (req.user.role === "customer") {
        const hasAccess = await companiesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      const data = (company as any).financialSummaryData;
      if (!data) {
        res.status(404).json({ message: "خلاصه مالی یافت نشد" });
        return;
      }

      const financialSummary = data;

      // آماده‌سازی داده‌ها برای نمودار
      const trends = {
        revenue: [
          { year: financialSummary.metadata.fiscalYears[0], value: financialSummary.directItems.revenue.year1 },
          { year: financialSummary.metadata.fiscalYears[1], value: financialSummary.directItems.revenue.year2 }
        ],
        netProfit: [
          { year: financialSummary.metadata.fiscalYears[0], value: financialSummary.directItems.netProfit.year1 },
          { year: financialSummary.metadata.fiscalYears[1], value: financialSummary.directItems.netProfit.year2 }
        ],
        totalAssets: [
          { year: financialSummary.metadata.fiscalYears[0], value: financialSummary.directItems.totalAssets.year1 },
          { year: financialSummary.metadata.fiscalYears[1], value: financialSummary.directItems.totalAssets.year2 }
        ],
        equity: [
          { year: financialSummary.metadata.fiscalYears[0], value: financialSummary.directItems.equity.year1 },
          { year: financialSummary.metadata.fiscalYears[1], value: financialSummary.directItems.equity.year2 }
        ]
      };

      res.json({
        success: true,
        trends,
        summary: financialSummary
      });

    } catch (error) {
      console.error("Get financial trends error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * DELETE /api/admin/companies/:id - حذف شرکت (فقط Admin)
   */
  async deleteCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);

      console.log(`🗑️ درخواست حذف شرکت: ${companyId}`);

      const company = await storage.getCompany(companyId);
      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      // حذف شرکت (cascade delete مدارک و سایر موارد مرتبط)
      const deleted = await storage.deleteCompany(companyId);

      if (!deleted) {
        res.status(500).json({ message: "خطا در حذف شرکت" });
        return;
      }

      // ثبت در audit log
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "delete_company",
        resource: "company",
        resourceId: companyId,
        details: JSON.stringify({
          companyName: company.name,
          nationalId: company.nationalId
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      console.log(`✅ شرکت حذف شد: ${company.name} (ID: ${companyId})`);

      res.json({
        success: true,
        message: "شرکت با موفقیت حذف شد"
      });

    } catch (error) {
      console.error("Delete company error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "خطای سیستم"
      });
    }
  }
}

export const companiesController = new CompaniesController(); 