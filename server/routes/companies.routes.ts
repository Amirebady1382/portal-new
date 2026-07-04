import { Router } from "express";
import { companiesController } from "../controllers/companies.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

export const companiesRoutes = Router();

// Companies CRUD routes
companiesRoutes.get("/", authMiddleware, (req, res) => companiesController.getCompanies(req as any, res));
companiesRoutes.get("/:id", authMiddleware, (req, res) => companiesController.getCompany(req as any, res));
companiesRoutes.post("/", authMiddleware, requireRole(["admin", "customer"]), (req, res) => companiesController.createCompany(req as any, res));
companiesRoutes.patch("/:id", authMiddleware, (req, res) => companiesController.updateCompany(req as any, res));

// Company validation and enrichment
companiesRoutes.post("/validate", authMiddleware, requireRole(["admin", "ceo", "employee"]), (req, res) => companiesController.validateCompany(req as any, res));
companiesRoutes.get("/:id/enrich", authMiddleware, requireRole(["admin", "ceo", "employee"]), (req, res) => companiesController.enrichCompanyData(req as any, res));

// AI Analysis
companiesRoutes.get("/:id/ai-analysis", authMiddleware, requireRole(["admin", "ceo", "employee"]), (req, res) => companiesController.getCompanyAIAnalysis(req as any, res));

// Financial Summary routes
companiesRoutes.get("/:id/tax-declaration-status", authMiddleware, (req, res) => companiesController.getTaxDeclarationStatus(req as any, res));
companiesRoutes.get("/:id/financial-summary", authMiddleware, (req, res) => companiesController.getFinancialSummary(req as any, res));
companiesRoutes.post("/:id/reprocess-tax-declaration", authMiddleware, requireRole(["admin", "ceo", "employee"]), (req, res) => companiesController.reprocessTaxDeclaration(req as any, res));
companiesRoutes.get("/:id/financial-trends", authMiddleware, (req, res) => companiesController.getFinancialTrends(req as any, res));

// Company info panels
companiesRoutes.put("/:id/info/:type", authMiddleware, (req, res) => companiesController.updateCompanyInfo(req as any, res));

// Admin-only routes (will be mounted under /api/admin)
export const adminCompaniesRoutes = Router();
adminCompaniesRoutes.delete("/companies/:id", authMiddleware, requireRole(["admin"]), (req, res) => companiesController.deleteCompany(req as any, res)); 