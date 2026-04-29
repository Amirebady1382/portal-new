import type { Request, Response } from "express";
import { rasmioIntegrationService } from "../services/rasmio-integration.service";
import type { AuthRequest } from "../middleware/auth";

export class RasmioIntegrationController {
  /**
   * POST /api/companies/validate - Validate company using Rasmio API
   */
  async validateCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nationalId, companyName } = req.body;
      
      const validation = await rasmioIntegrationService.validateCompany(nationalId, companyName);
      res.json(validation);
    } catch (error) {
      if (error instanceof Error && error.message === "شناسه ملی و نام شرکت الزامی است") {
        res.status(400).json({ error: error.message });
      } else {
        console.error("خطا در اعتبارسنجی شرکت:", error);
        res.status(500).json({ error: "خطا در اعتبارسنجی شرکت" });
      }
    }
  }

  /**
   * GET /api/companies/:id/enrich - Enrich company data with Rasmio API
   */
  async enrichCompanyData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      
      const enrichedData = await rasmioIntegrationService.enrichCompanyData(companyId);
      res.json(enrichedData);
    } catch (error) {
      if (error instanceof Error && error.message === "شرکت یافت نشد") {
        res.status(404).json({ error: error.message });
      } else {
        console.error("خطا در تکمیل اطلاعات شرکت:", error);
        res.status(500).json({ error: "خطا در تکمیل اطلاعات شرکت" });
      }
    }
  }

  /**
   * GET /api/rasmio/company/:nationalId - Get company data by national ID
   */
  async getCompanyByNationalId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const nationalId = req.params.nationalId;
      
      const enrichedData = await rasmioIntegrationService.getCompanyByNationalId(nationalId);
      
      if (!enrichedData) {
        res.status(404).json({ error: "شرکت با این شناسه ملی در سیستم رسمیو یافت نشد" });
        return;
      }
      
      res.json(enrichedData);
    } catch (error) {
      if (error instanceof Error && error.message === "شناسه ملی ۱۱ رقمی الزامی است") {
        res.status(400).json({ error: error.message });
      } else {
        console.error("خطا در دریافت اطلاعات شرکت از رسمیو:", error);
        res.status(500).json({ error: "خطا در دریافت اطلاعات شرکت از رسمیو" });
      }
    }
  }

  /**
   * GET /api/rasmio/person/:nationalId - Get person data by national ID
   */
  async getPersonByNationalId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const nationalId = req.params.nationalId;
      
      const personData = await rasmioIntegrationService.getPersonByNationalId(nationalId);
      
      if (!personData) {
        res.status(404).json({ error: "شخص با این کد ملی در سیستم رسمیو یافت نشد" });
        return;
      }
      
      res.json(personData);
    } catch (error) {
      if (error instanceof Error && error.message === "کد ملی ۱۰ رقمی الزامی است") {
        res.status(400).json({ error: error.message });
      } else {
        console.error("خطا در دریافت اطلاعات شخص از رسمیو:", error);
        res.status(500).json({ error: "خطا در دریافت اطلاعات شخص از رسمیو" });
      }
    }
  }

  /**
   * GET /api/rasmio/health - Check Rasmio service health
   */
  async checkHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const healthStatus = await rasmioIntegrationService.checkServiceHealth();
      res.json(healthStatus);
    } catch (error) {
      console.error("خطا در بررسی وضعیت سرویس رسمیو:", error);
      res.status(500).json({
        isOnline: false,
        error: error instanceof Error ? error.message : "خطای ناشناخته"
      });
    }
  }

  /**
   * POST /api/rasmio/company/create - Create company from Rasmio data
   */
  async createCompanyFromRasmio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nationalId } = req.body;
      
      const newCompany = await rasmioIntegrationService.createCompanyFromRasmio(nationalId);
      res.status(201).json(newCompany);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "شناسه ملی ۱۱ رقمی الزامی است") {
          res.status(400).json({ error: error.message });
          return;
        }
        if (error.message === "شرکت با این شناسه ملی در سیستم رسمیو یافت نشد") {
          res.status(404).json({ error: error.message });
          return;
        }
      }
      
      console.error("خطا در ایجاد شرکت از داده‌های راسمیو:", error);
      res.status(500).json({ error: "خطا در ایجاد شرکت از داده‌های راسمیو" });
    }
  }

  /**
   * PUT /api/rasmio/company/:id/update - Update company with Rasmio data
   */
  async updateCompanyWithRasmio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.id);
      
      const updatedCompany = await rasmioIntegrationService.updateCompanyWithRasmioData(companyId);
      res.json(updatedCompany);
    } catch (error) {
      if (error instanceof Error && error.message === "شرکت یافت نشد") {
        res.status(404).json({ error: error.message });
      } else {
        console.error("خطا در به‌روزرسانی شرکت با داده‌های راسمیو:", error);
        res.status(500).json({ error: "خطا در به‌روزرسانی شرکت با داده‌های راسمیو" });
      }
    }
  }

  /**
   * GET /api/rasmio/stats - Get Rasmio service statistics
   */
  async getServiceStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await rasmioIntegrationService.getServiceStatistics();
      res.json(stats);
    } catch (error) {
      console.error("خطا در دریافت آمار سرویس راسمیو:", error);
      res.status(500).json({ error: "خطا در دریافت آمار سرویس" });
    }
  }

  /**
   * POST /api/rasmio/validate-id - Validate national ID format
   */
  async validateNationalId(req: Request, res: Response): Promise<void> {
    try {
      const { nationalId, type = "company" } = req.body;
      const expectedLength = type === "company" ? 11 : 10;
      
      const isValid = rasmioIntegrationService.validateNationalId(nationalId, expectedLength);
      
      res.json({
        isValid,
        nationalId,
        type,
        expectedLength,
        message: isValid ? "شناسه معتبر است" : `شناسه باید ${expectedLength} رقم باشد`
      });
    } catch (error) {
      console.error("خطا در اعتبارسنجی شناسه:", error);
      res.status(500).json({ error: "خطا در اعتبارسنجی شناسه" });
    }
  }
}

export const rasmioIntegrationController = new RasmioIntegrationController(); 