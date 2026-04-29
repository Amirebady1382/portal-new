import type { Request, Response } from "express";
import { adminService } from "../services/admin.service";
import { logger } from "../utils/logger";
import type { AuthRequest } from "../middleware/auth";

export class AdminController {
  /**
   * GET /api/admin/monitoring - Get system health and monitoring data
   */
  async getSystemMonitoring(req: AuthRequest, res: Response): Promise<void> {
    try {
      const systemData = await adminService.getSystemHealth();
      res.json(systemData);
    } catch (error) {
      logger.error("خطا در دریافت آمار monitoring", "monitoring-api", error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ message: "خطا در دریافت آمار سیستم" });
    }
  }

  /**
   * GET /api/admin/users - Get all users in the system
   */
  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "مشاهده کاربران");
      
      const users = await adminService.getAllUsers();
      res.json(users);
    } catch (error) {
      if (error instanceof Error && error.message.includes("فقط برای مدیران سیستم مجاز است")) {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Get users error:", error);
        res.status(500).json({ message: "خطای سیستم" });
      }
    }
  }

  /**
   * POST /api/admin/users - Create new user (Admin only)
   */
  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "ایجاد کاربر");
      
      const result = await adminService.createUser(req.body, req.user.userId);

      // Create audit log
      await adminService.createAuditLog(
        req.user.userId,
        "create_user",
        "user",
        result.id,
        result,
        req.ip,
        req.get("User-Agent")
      );

      res.status(201).json({
        message: "کاربر با موفقیت ایجاد شد",
        user: {
          id: result.id,
          username: result.username,
          fullName: result.fullName,
          role: result.role,
          phone: result.phone,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("فقط برای مدیران سیستم مجاز است")) {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Create user error:", error);
        res.status(400).json({ 
          message: error instanceof Error ? error.message : "خطای سیستم" 
        });
      }
    }
  }

  /**
   * PATCH /api/admin/users/:id - Update user (Admin only)
   */
  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "ویرایش کاربر");
      
      const userId = parseInt(req.params.id);
      const result = await adminService.updateUser(userId, req.body, req.user.userId);

      // Create audit log
      await adminService.createAuditLog(
        req.user.userId,
        "update_user",
        "user",
        userId,
        result,
        req.ip,
        req.get("User-Agent")
      );

      res.json({
        message: "کاربر با موفقیت بروزرسانی شد",
        user: {
          id: result.id,
          username: result.username,
          fullName: result.fullName,
          role: result.role,
          phone: result.phone,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("فقط برای مدیران سیستم مجاز است")) {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Update user error:", error);
        res.status(400).json({ 
          message: error instanceof Error ? error.message : "خطای سیستم" 
        });
      }
    }
  }

  /**
   * GET /api/admin/stats - Get admin dashboard statistics
   */
  async getSystemStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "مشاهده آمار سیستم");
      
      const stats = await adminService.getSystemStatistics();
      res.json(stats);
    } catch (error) {
      if (error instanceof Error && error.message.includes("فقط برای مدیران سیستم مجاز است")) {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Get system stats error:", error);
        res.status(500).json({ message: "خطا در دریافت آمار سیستم" });
      }
    }
  }

  /**
   * DELETE /api/admin/users/:id - Delete user from system
   */
  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "حذف کاربر");
      
      const userId = parseInt(req.params.id);
      
      const result = await adminService.deleteUser(userId, req.user.userId);

      // Create audit log
      if (result.userData) {
        await adminService.createAuditLog(
          req.user.userId,
          "delete_user",
          "user",
          userId,
          result.userData,
          req.ip,
          req.get("User-Agent")
        );
      }

      res.json({ message: result.message });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "نمی‌توانید خودتان را حذف کنید") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "کاربر یافت نشد") {
          res.status(404).json({ message: error.message });
          return;
        }
        if (error.message.includes("فقط برای مدیران سیستم مجاز است")) {
          res.status(403).json({ message: error.message });
          return;
        }
      }
      
      console.error("Delete user error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * DELETE /api/admin/companies/:id - Delete company from system
   */
  async deleteCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "حذف شرکت");
      
      const companyId = parseInt(req.params.id);
      
      const result = await adminService.deleteCompany(companyId);

      // Create audit log
      if (result.companyData) {
        await adminService.createAuditLog(
          req.user.userId,
          "delete_company",
          "company",
          companyId,
          result.companyData,
          req.ip,
          req.get("User-Agent")
        );
      }

      res.json({ message: result.message });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "شرکت یافت نشد") {
          res.status(404).json({ message: error.message });
          return;
        }
        if (error.message.includes("فقط برای مدیران سیستم مجاز است")) {
          res.status(403).json({ message: error.message });
          return;
        }
      }
      
      console.error("Delete company error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/admin/update-phones - Update phone numbers for all users (emergency function)
   */
  async updatePhoneNumbers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await adminService.updateAllPhoneNumbers();

      // Create audit log
      if (req.user) {
        await adminService.createAuditLog(
          req.user.userId,
          "update_phone_numbers",
          "system",
          0, // No specific resource ID
          { result },
          req.ip,
          req.get("User-Agent")
        );
      }

      res.json(result);
    } catch (error) {
      console.error("Update phones error:", error);
      res.status(500).json({ 
        success: false,
        message: "خطا در تنظیم شماره‌های تماس",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/admin/summary - Get system summary for dashboard
   */
  async getSystemSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "مشاهده خلاصه سیستم");
      
      const summary = await adminService.getSystemSummary();
      res.json(summary);
    } catch (error) {
      if (error instanceof Error && error.message.includes("فقط برای مدیران سیستم مجاز است")) {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Get system summary error:", error);
        res.status(500).json({ message: "خطا در دریافت خلاصه سیستم" });
      }
    }
  }

  /**
   * GET /api/admin/audit-logs - Get audit logs for monitoring
   */
  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      adminService.validateAdminOperation(req.user.role, "مشاهده لاگ‌های سیستم");
      
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await adminService.getAuditLogs(limit, offset);
      res.json({
        logs,
        pagination: {
          limit,
          offset,
          total: logs.length // This should be the actual total count from storage
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("فقط برای مدیران سیستم مجاز است")) {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Get audit logs error:", error);
        res.status(500).json({ message: "خطا در دریافت لاگ‌های سیستم" });
      }
    }
  }
}

export const adminController = new AdminController(); 