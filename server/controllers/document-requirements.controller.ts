import type { Request, Response } from "express";
import { documentRequirementsService } from "../services/document-requirements.service";
import type { AuthRequest } from "../middleware/auth";

export class DocumentRequirementsController {
  /**
   * GET /api/document-requirements - Get document requirements
   */
  async getDocumentRequirements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { department, companyId } = req.query;
      
      let parsedCompanyId: number | undefined = undefined;
      if (companyId) {
        parsedCompanyId = parseInt(companyId as string);
      }

      const requirements = await documentRequirementsService.getDocumentRequirements(
        req.user.userId,
        req.user.role,
        parsedCompanyId,
        department as string
      );
      
      res.json(requirements);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "companyId نامعتبر است") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "companyId الزامی است") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "دسترسی محدود") {
          res.status(403).json({ message: error.message });
          return;
        }
      }
      
      console.error("Get document requirements error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/document-requirements - Create document requirement
   */
  async createDocumentRequirement(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log("📝 Controller: Creating document requirement");
      console.log("Request body:", req.body);
      console.log("User:", req.user);
      
      const requirementData = {
        ...req.body,
        createdBy: req.user.userId
      };
      
      const requirement = await documentRequirementsService.createDocumentRequirement(requirementData);
      res.status(201).json(requirement);
    } catch (error) {
      console.error("❌ Create document requirement error:", error);
      if (error instanceof Error && error.message === "برای accessType = specific باید companyIds ارسال شود") {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : "خطای سیستم" });
      }
    }
  }

  /**
   * PUT /api/document-requirements/:id - Update document requirement
   */
  async updateDocumentRequirement(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log("📝 Controller: Updating document requirement");
      console.log("Request ID:", req.params.id);
      console.log("Request body:", req.body);
      console.log("User:", req.user);
      
      const requirementId = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        // Remove fields that shouldn't be in the main table
        companyIds: undefined
      };
      
      // Clean up undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      console.log("Cleaned update data:", updateData);
      
      const updated = await documentRequirementsService.updateDocumentRequirement(
        requirementId, 
        updateData
      );
      
      res.json(updated);
    } catch (error) {
      console.error("❌ Update document requirement error:", error);
      if (error instanceof Error && error.message === "فرم مدارک یافت نشد") {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : "خطای سیستم" });
      }
    }
  }

  /**
   * DELETE /api/document-requirements/:id - Delete document requirement
   */
  async deleteDocumentRequirement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requirementId = parseInt(req.params.id);
      await documentRequirementsService.deleteDocumentRequirement(requirementId, req.user.userId);
      
      res.json({ message: "فرم مدارک با موفقیت حذف شد" });
    } catch (error) {
      if (error instanceof Error && error.message === "فرم مدارک یافت نشد") {
        res.status(404).json({ message: error.message });
      } else {
        console.error("Delete document requirement error:", error);
        res.status(500).json({ message: "خطای سیستم" });
      }
    }
  }

  /**
   * GET /api/form-submissions - Get form submissions
   */
  async getFormSubmissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { companyId, requirementId, status } = req.query;
      const filters: any = {};
      
      if (companyId) filters.companyId = parseInt(companyId as string);
      if (requirementId) filters.requirementId = parseInt(requirementId as string);
      if (status) filters.status = status as string;
      if (req.user.role === "customer") {
        filters.userId = req.user.userId;
      }
      
      const submissions = await documentRequirementsService.getFormSubmissions(filters);
      res.json(submissions);
    } catch (error) {
      console.error("Get form submissions error", error);
      res.status(500).json({ message: "خطا در خواندن فرم‌ها" });
    }
  }

  /**
   * POST /api/form-submissions - Create form submission
   */
  async createFormSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log("=== POST /api/form-submissions DEBUG ===");
      console.log("Request body:", req.body);
      console.log("User:", req.user);
      
      const { requirementId, companyId, formData, status } = req.body;
      
      // بررسی دسترسی مشتری به شرکت
      if (req.user.role === "customer") {
        const hasAccess = await documentRequirementsService.validateCompanyAccess(
          req.user.userId, 
          req.user.role, 
          companyId
        );
        
        if (!hasAccess) {
          console.log("Access denied for user", req.user.userId, "to company", companyId);
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }
      
      const submission = await documentRequirementsService.createFormSubmission({
        requirementId,
        companyId,
        userId: req.user.userId,
        formData: JSON.stringify(formData),
        status: status
      });
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof Error && error.message === "اطلاعات ناقص ارسال شده") {
        console.log("Validation failed - missing fields");
        res.status(400).json({ message: error.message });
      } else {
        console.error("=== FORM SUBMISSION ERROR ===");
        console.error("Error details:", error);
        res.status(500).json({ message: "خطا در ثبت فرم" });
      }
    }
  }

  /**
   * PATCH /api/form-submissions/:id - Update form submission (review)
   */
  async updateFormSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const submissionId = parseInt(req.params.id);
      const { status, reviewNotes } = req.body;
      
      const updated = await documentRequirementsService.updateFormSubmission(submissionId, {
        status,
        reviewedBy: req.user.userId,
        reviewNotes,
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "وضعیت نامعتبر") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "فرم یافت نشد") {
          res.status(404).json({ message: error.message });
          return;
        }
      }
      
      console.error("Update form submission error", error);
      res.status(500).json({ message: "خطا در به‌روزرسانی فرم" });
    }
  }

  /**
   * DELETE /api/form-submissions/:id - Delete form submission
   */
  async deleteFormSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const submissionId = parseInt(req.params.id);
      await documentRequirementsService.deleteFormSubmission(submissionId, req.user.userId);
      
      res.json({ message: "فرم و فایل‌های مرتبط با موفقیت حذف شدند" });
    } catch (error) {
      if (error instanceof Error && error.message === "فرم یافت نشد") {
        res.status(404).json({ message: error.message });
      } else {
        console.error("Delete form submission error", error);
        res.status(500).json({ message: "خطا در حذف فرم" });
      }
    }
  }

  /**
   * GET /api/document-requirements/stats - Get statistics
   */
  async getStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { companyId, department } = req.query;
      
      let parsedCompanyId: number | undefined = undefined;
      if (companyId) {
        parsedCompanyId = parseInt(companyId as string);
      }

      const stats = await documentRequirementsService.getStatistics(
        parsedCompanyId,
        department as string
      );
      
      res.json(stats);
    } catch (error) {
      console.error("Get document requirements statistics error:", error);
      res.status(500).json({ message: "خطا در محاسبه آمار" });
    }
  }

  /**
   * GET /api/form-submissions/pending - Get pending submissions for review
   */
  async getPendingSubmissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { department } = req.query;
      
      const pendingSubmissions = await documentRequirementsService.getPendingSubmissions(
        department as string
      );
      
      res.json(pendingSubmissions);
    } catch (error) {
      console.error("Get pending submissions error:", error);
      res.status(500).json({ message: "خطا در دریافت فرم‌های در انتظار بررسی" });
    }
  }

  /**
   * GET /api/document-requirements/:id - Get single document requirement
   */
  async getDocumentRequirement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requirementId = parseInt(req.params.id);
      const requirement = await documentRequirementsService.getDocumentRequirement(requirementId);
      
      if (!requirement) {
        res.status(404).json({ message: "فرم مدارک یافت نشد" });
        return;
      }
      
      res.json(requirement);
    } catch (error) {
      console.error("Get document requirement error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/form-submissions/:id - Get single form submission
   */
  async getFormSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const submissionId = parseInt(req.params.id);
      const submission = await documentRequirementsService.getFormSubmissionById(submissionId);
      
      if (!submission) {
        res.status(404).json({ message: "فرم یافت نشد" });
        return;
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Get form submission error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }
}

export const documentRequirementsController = new DocumentRequirementsController(); 