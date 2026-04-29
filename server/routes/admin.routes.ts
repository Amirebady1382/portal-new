import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { storage } from "../storage";

export const adminRoutes = Router();

// System Monitoring (Admin only)
adminRoutes.get("/monitoring", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getSystemMonitoring(req as any, res));

// User Management (Admin only)
adminRoutes.get("/users", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getAllUsers(req as any, res));
adminRoutes.post("/users", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.createUser(req as any, res));
adminRoutes.patch("/users/:id", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.updateUser(req as any, res));
adminRoutes.delete("/users/:id", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.deleteUser(req as any, res));

// Document Requirements Management (Admin only)
adminRoutes.get("/document-requirements", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  try {
    const requirements = await storage.getDocumentRequirements();
    res.json({
      success: true,
      requirements,
      count: requirements.length
    });
  } catch (error) {
    console.error("Error fetching document requirements for admin:", error);
    res.status(500).json({
      success: false,
      message: "خطا در دریافت لیست فرم‌ها"
    });
  }
});

// Company Management (Admin only) 
adminRoutes.delete("/companies/:id", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.deleteCompany(req as any, res));

// System Summary (Admin only)
adminRoutes.get("/summary", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getSystemSummary(req as any, res));
adminRoutes.get("/stats", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getSystemStats(req as any, res));

// Audit Logs (Admin only)
adminRoutes.get("/audit-logs", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getAuditLogs(req as any, res));

// Emergency Phone Update (Admin only - secured)
adminRoutes.get("/update-phones", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.updatePhoneNumbers(req as any, res));