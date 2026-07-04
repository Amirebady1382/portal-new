import { Router } from "express";
import { rasmioIntegrationController } from "../controllers/rasmio-integration.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

export const rasmioRoutes = Router();

// Company validation and enrichment (mounted under /api/companies)
export const companyRasmioRoutes = Router();
companyRasmioRoutes.post("/validate", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => rasmioIntegrationController.validateCompany(req as any, res));
companyRasmioRoutes.get("/:id/enrich", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => rasmioIntegrationController.enrichCompanyData(req as any, res));

// Rasmio API endpoints (mounted under /api/rasmio)
rasmioRoutes.get("/company/:nationalId", authMiddleware, (req, res) => rasmioIntegrationController.getCompanyByNationalId(req as any, res));
rasmioRoutes.get("/company/:nationalId/members", authMiddleware, (req, res) => rasmioIntegrationController.getCompanyMembers(req as any, res));
rasmioRoutes.get("/person/:nationalId", authMiddleware, (req, res) => rasmioIntegrationController.getPersonByNationalId(req as any, res));
rasmioRoutes.get("/health", authMiddleware, (req, res) => rasmioIntegrationController.checkHealth(req as any, res));

// Administrative endpoints
rasmioRoutes.post("/company/create", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => rasmioIntegrationController.createCompanyFromRasmio(req as any, res));
rasmioRoutes.put("/company/:id/update", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => rasmioIntegrationController.updateCompanyWithRasmio(req as any, res));

// Statistics and utilities
rasmioRoutes.get("/stats", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => rasmioIntegrationController.getServiceStats(req as any, res));
rasmioRoutes.post("/validate-id", (req, res) => rasmioIntegrationController.validateNationalId(req, res)); // No auth for utility endpoint 