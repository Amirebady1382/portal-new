import { Router } from "express";
import { reportsController } from "../controllers/reports.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

export const reportsRoutes = Router();

// System Statistics (Admin and CEO)
reportsRoutes.get("/admin/stats", authMiddleware, requireRole(["admin", "ceo"]) as any, (req, res) => reportsController.getSystemStats(req as any, res));

// Investment Statistics  
reportsRoutes.get("/investment/stats", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => reportsController.getInvestmentStats(req as any, res));

// Administrative Statistics
reportsRoutes.get("/administrative/stats", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => reportsController.getAdministrativeStats(req as any, res));

// Fund Overview Statistics
reportsRoutes.get("/fund/overview", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => reportsController.getFundOverview(req as any, res));

// General Reports
reportsRoutes.get("/reports", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => reportsController.generateReports(req as any, res)); 