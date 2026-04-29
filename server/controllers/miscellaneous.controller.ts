import type { Request, Response } from "express";
import { miscellaneousService } from "../services/miscellaneous.service";

export class MiscellaneousController {
  /**
   * GET /api/health - System health check
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = miscellaneousService.getHealthStatus();
      res.json(healthStatus);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "ERROR",
        timestamp: new Date().toISOString(),
        message: "خطا در بررسی وضعیت سرور"
      });
    }
  }

  /**
   * GET /api/system-info - Detailed system information
   */
  async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      const systemInfo = miscellaneousService.getSystemInfo();
      res.json(systemInfo);
    } catch (error) {
      console.error("System info error:", error);
      res.status(500).json({ message: "خطا در دریافت اطلاعات سیستم" });
    }
  }

  /**
   * GET /api/readiness - System readiness check
   */
  async getReadinessStatus(req: Request, res: Response): Promise<void> {
    try {
      const readiness = await miscellaneousService.validateSystemReadiness();
      
      if (readiness.ready) {
        res.json({
          ready: true,
          message: "سیستم آماده است",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          ready: false,
          message: "سیستم آماده نیست",
          issues: readiness.issues,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Readiness check error:", error);
      res.status(500).json({
        ready: false,
        message: "خطا در بررسی آمادگی سیستم",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/endpoints - API endpoints documentation
   */
  async getAPIEndpoints(req: Request, res: Response): Promise<void> {
    try {
      const endpoints = miscellaneousService.getAPIEndpoints();
      res.json({
        message: "لیست endpoint های موجود",
        endpoints,
        totalModules: Object.keys(endpoints).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("API endpoints error:", error);
      res.status(500).json({ message: "خطا در دریافت لیست endpoint ها" });
    }
  }
}

export const miscellaneousController = new MiscellaneousController(); 