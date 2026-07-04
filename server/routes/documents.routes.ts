import { Router } from "express";
import { documentsController } from "../controllers/documents.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { uploadMiddleware } from "../middleware/upload";
import { uploadLimiter } from "../middleware/security";

export const documentsRoutes = Router();

// Document management routes
documentsRoutes.get("/", authMiddleware, (req, res) => documentsController.getAllDocuments(req as any, res));
documentsRoutes.patch("/:id", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => documentsController.updateDocument(req as any, res));
documentsRoutes.delete("/:id", authMiddleware, (req, res) => documentsController.deleteDocument(req as any, res));

// Download routes
documentsRoutes.get("/:id/download", authMiddleware, (req, res) => documentsController.downloadDocument(req as any, res));

// Company-specific document routes (will be mounted under /api/companies)
export const companyDocumentsRoutes = Router();

// Routes for /api/companies/:companyId/documents
companyDocumentsRoutes.get("/:companyId/documents", authMiddleware, (req, res) => documentsController.getCompanyDocuments(req as any, res));
companyDocumentsRoutes.post("/:companyId/documents", authMiddleware, uploadLimiter, uploadMiddleware as any, (req, res) => documentsController.uploadDocument(req as any, res));
companyDocumentsRoutes.post("/:companyId/documents/download-zip", authMiddleware, (req, res) => documentsController.downloadDocumentsZip(req as any, res)); 