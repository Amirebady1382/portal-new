import { Router } from "express";
import { documentRequirementsController } from "../controllers/document-requirements.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

export const documentRequirementsRoutes = Router();

// Document Requirements routes
documentRequirementsRoutes.get("/", authMiddleware, (req, res) => documentRequirementsController.getDocumentRequirements(req as any, res));
documentRequirementsRoutes.post("/", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => documentRequirementsController.createDocumentRequirement(req as any, res));

// Statistics route - باید قبل از parametric routes باشد
documentRequirementsRoutes.get("/stats", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => documentRequirementsController.getStatistics(req as any, res));

documentRequirementsRoutes.get("/:id", authMiddleware, (req, res) => documentRequirementsController.getDocumentRequirement(req as any, res));
documentRequirementsRoutes.put("/:id", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => documentRequirementsController.updateDocumentRequirement(req as any, res));
documentRequirementsRoutes.delete("/:id", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => documentRequirementsController.deleteDocumentRequirement(req as any, res));

// Form Submissions routes
export const formSubmissionsRoutes = Router();

formSubmissionsRoutes.get("/", authMiddleware, (req, res) => documentRequirementsController.getFormSubmissions(req as any, res));
formSubmissionsRoutes.post("/", authMiddleware, (req, res) => documentRequirementsController.createFormSubmission(req as any, res));

// Pending route - باید قبل از parametric routes باشد
formSubmissionsRoutes.get("/pending", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => documentRequirementsController.getPendingSubmissions(req as any, res));

formSubmissionsRoutes.get("/:id", authMiddleware, (req, res) => documentRequirementsController.getFormSubmission(req as any, res));
formSubmissionsRoutes.patch("/:id", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => documentRequirementsController.updateFormSubmission(req as any, res));
formSubmissionsRoutes.delete("/:id", authMiddleware, requireRole(["admin", "employee"]) as any, (req, res) => documentRequirementsController.deleteFormSubmission(req as any, res)); 