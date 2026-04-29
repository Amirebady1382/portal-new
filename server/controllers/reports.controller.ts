import type { Request, Response } from "express";
import { reportsService } from "../services/reports.service";
import type { AuthRequest } from "../middleware/auth";

export class ReportsController {
  /**
   * GET /api/admin/stats - Get system-wide statistics
   */
  async getSystemStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await reportsService.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/investment/stats - Get investment unit statistics
   */
  async getInvestmentStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await reportsService.getInvestmentStats();
      res.json(stats);
    } catch (error) {
      console.error("Investment stats error:", error);
      res.status(500).json({ message: "خطا در دریافت آمار" });
    }
  }

  /**
   * GET /api/administrative/stats - Get administrative unit statistics
   */
  async getAdministrativeStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await reportsService.getAdministrativeStats();
      res.json(stats);
    } catch (error) {
      console.error("Administrative stats error:", error);
      res.status(500).json({ message: "خطا در دریافت آمار" });
    }
  }

  /**
   * GET /api/fund/overview - Get fund overview statistics
   */
  async getFundOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const overview = await reportsService.getFundOverview();
      res.json(overview);
    } catch (error) {
      console.error("Fund overview error:", error);
      res.status(500).json({ message: "خطا در دریافت آمار صندوق" });
    }
  }

  /**
   * GET /api/reports - Generate custom reports
   */
  async generateReports(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, startDate, endDate } = req.query;
      
      // Parse dates if provided
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const report = await reportsService.generateReport(
        type as string || "general",
        start,
        end
      );
      
      res.json(report);
    } catch (error) {
      console.error("Reports error:", error);
      res.status(500).json({ message: "خطا در تولید گزارش" });
    }
  }
}

export const reportsController = new ReportsController(); 