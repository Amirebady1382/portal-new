import type { Request, Response } from "express";
import { documentsService } from "../services/documents.service";
import { storage } from "../storage";
import type { AuthRequest } from "../middleware/auth";

export class DocumentsController {
  /**
   * GET /api/companies/:companyId/documents - Get documents for a company
   */
  async getCompanyDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);

      // Check access permissions
      if (req.user.role === "customer") {
        const hasAccess = await documentsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const documents = await documentsService.getDocumentsByCompany(companyId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/companies/:companyId/documents - Upload document for a company
   */
  async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const { category, description } = req.body;

      if (!req.file) {
        res.status(400).json({ message: "فایل الزامی است" });
        return;
      }

      // Check access permissions
      if (req.user.role === "customer") {
        const hasAccess = await documentsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      // Log upload details for debugging
      console.log("Upload request details:", {
        companyId,
        userId: req.user.userId,
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path
        },
        category,
        description
      });

      const document = await documentsService.createDocument({
        companyId,
        uploadedById: req.user.userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        category: category || "other",
        description: description || "",
        filePath: req.file.path,
        status: "pending",
        version: 1,
        metadata: null
      });

      // 🔥 Hook: اگر فایل اظهارنامه مالیاتی است، پردازش خودکار را شروع کن
      if (category === 'اظهارنامه مالیاتی') {
        console.log(`📊 شروع پردازش خودکار اظهارنامه مالیاتی برای شرکت ${companyId}`);
        
        // Import dynamically to avoid circular dependency
        import('../services/financial-processing-job.service').then(({ financialProcessingJobService }) => {
          financialProcessingJobService.processTaxDeclaration(companyId, document.id, req.file!.path)
            .then(() => {
              console.log(`✅ پردازش اظهارنامه تکمیل شد: شرکت ${companyId}`);
            })
            .catch((error) => {
              console.error(`❌ خطا در پردازش خودکار اظهارنامه: ${error.message}`);
            });
        });
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/documents/:id/download - Download a document
   */
  async downloadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseInt(req.params.id);
      const document = await documentsService.getDocument(documentId);

      if (!document) {
        res.status(404).json({ message: "فایل یافت نشد" });
        return;
      }

      // Handle both camelCase and snake_case
      const docCompanyId = (document as any).companyId || (document as any).company_id;

      // Check access permissions
      if (req.user.role === "customer") {
        const hasAccess = await documentsService.userHasAccessToCompany(req.user.userId, docCompanyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const fileInfo = await documentsService.getFileForDownload(documentId);
      if (!fileInfo) {
        res.status(404).json({ message: "فایل در سیستم یافت نشد" });
        return;
      }

      // Log download
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "download",
        resource: "document",
        resourceId: documentId,
        details: JSON.stringify({ filename: fileInfo.originalName }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.setHeader("Content-Disposition", `attachment; filename="${fileInfo.originalName}"`);
      res.setHeader("Content-Type", fileInfo.mimeType);
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      console.error("Download document error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/companies/:companyId/documents/download-zip - Download multiple documents as ZIP
   */
  async downloadDocumentsZip(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const { documentIds } = req.body;

      // Check access permissions
      if (req.user.role === "customer") {
        const hasAccess = await documentsService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const { zipName, createZipStream } = await documentsService.createDocumentZip(companyId, documentIds);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

      await createZipStream(res);

      // Log bulk download
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "bulk_download",
        resource: "documents",
        resourceId: companyId,
        details: JSON.stringify({ documentCount: documentIds?.length || 0 }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
    } catch (error) {
      console.error("Bulk download error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * GET /api/documents - Get all documents (admin/employee view)
   */
  async getAllDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      let documents = [];
      
      if (req.user.role === "admin" || req.user.role === "employee") {
        // Admin and employees can see all documents
        documents = await documentsService.getDocumentsForStaff();
      } else {
        // Customers can only see their own company documents
        documents = await documentsService.getDocumentsForCustomer(req.user.userId);
      }

      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * PATCH /api/documents/:id - Update document (admin/employee only)
   */
  async updateDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseInt(req.params.id);
      const { status } = req.body;

      const document = await documentsService.updateDocument(documentId, { status });

      if (!document) {
        res.status(404).json({ message: "سند یافت نشد" });
        return;
      }

      // Log status change
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "status_change",
        resource: "document",
        resourceId: documentId,
        details: JSON.stringify({ newStatus: status }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json(document);
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * DELETE /api/documents/:id - Delete document
   */
  async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documentId = parseInt(req.params.id);
      const document = await documentsService.getDocument(documentId);

      if (!document) {
        res.status(404).json({ message: "سند یافت نشد" });
        return;
      }

      // Check permissions - customers can only delete their own documents
      if (req.user.role === "customer") {
        const hasAccess = await documentsService.userHasAccessToCompany(req.user.userId, document.companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const deleted = await documentsService.deleteDocument(documentId);
      if (!deleted) {
        res.status(500).json({ message: "خطا در حذف سند" });
        return;
      }

      // Log deletion
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "delete",
        resource: "document",
        resourceId: documentId,
        details: JSON.stringify({ filename: document.originalName }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({ message: "سند با موفقیت حذف شد" });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }
}

export const documentsController = new DocumentsController(); 