import { Router } from "express";
import { contractsController } from "../controllers/contracts.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { uploadMiddleware } from "../middleware/upload";
import { contractGenerationRateLimit, variableExtractionRateLimit } from "../middleware/rate-limiter";

export const contractsRoutes = Router();

// Contract Templates routes
contractsRoutes.get("/templates", authMiddleware, (req, res) => contractsController.getContractTemplates(req as any, res));
contractsRoutes.post("/templates", authMiddleware, requireRole(["admin", "employee"]) as any, uploadMiddleware as any, (req, res) => contractsController.createContractTemplate(req as any, res));
contractsRoutes.post("/templates/:id/validate", authMiddleware, requireRole(["admin", "employee"]) as any, variableExtractionRateLimit as any, (req, res) => contractsController.validateTemplate(req as any, res));

// Contract Form Data routes
contractsRoutes.get("/form-data/:companyId/:templateId", authMiddleware, requireRole(["admin", "employee", "customer"]) as any, (req, res) => contractsController.getContractFormData(req as any, res));
contractsRoutes.post("/form-data", authMiddleware, requireRole(["admin", "employee", "customer"]) as any, (req, res) => contractsController.saveContractFormData(req as any, res));

// Contract Generation routes (با rate limiting)
contractsRoutes.post("/preview", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => contractsController.previewContract(req as any, res));
contractsRoutes.post("/generate", authMiddleware, requireRole(["admin", "employee"]) as any, contractGenerationRateLimit as any, (req, res) => contractsController.generateContract(req as any, res));

// Contract Download routes
contractsRoutes.get("/download/:fileName", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => contractsController.downloadContract(req as any, res)); 