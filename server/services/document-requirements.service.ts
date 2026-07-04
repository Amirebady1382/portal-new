import { storage } from "../storage";
import { promises as fs } from "fs";

export interface DocumentRequirement {
  id: number;
  title: string;
  description: string;
  isRequired: boolean;
  department: string | null;
  accessType: string;
  companyIds: number[];
  fields: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequirementData {
  title: string;
  description: string;
  isRequired?: boolean;
  department?: string | null;
  accessType?: string;
  companyIds?: number[];
  fields?: any[];
}

export interface FormSubmission {
  id: number;
  requirementId: number;
  companyId: number;
  userId: number;
  formData: string;
  status: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionData {
  requirementId: number;
  companyId: number;
  userId: number;
  formData: string;
  status?: string;
}

export interface SubmissionFilters {
  companyId?: number;
  requirementId?: number;
  status?: string;
  userId?: number;
}

export interface UpdateSubmissionData {
  status?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
}

export class DocumentRequirementsService {
  /**
   * Get accessible document requirements based on user role and filters
   */
  async getDocumentRequirements(
    userId: number, 
    userRole: string, 
    companyId?: number, 
    department?: string
  ): Promise<any[]> {
    let parsedCompanyId: number | undefined = undefined;
    
    if (companyId) {
      parsedCompanyId = companyId;
      if (isNaN(parsedCompanyId)) {
        throw new Error("companyId نامعتبر است");
      }
    }

    // اگر کاربر مشتری باشد companyId باید الزاماً یکی از شرکت‌های او باشد
    if (userRole === "customer") {
      if (!parsedCompanyId) {
        throw new Error("companyId الزامی است");
      }

      const hasAccess = await storage.userHasAccessToCompany(userId, parsedCompanyId);
      if (!hasAccess) {
        throw new Error("دسترسی محدود");
      }
    }

    const requirements = await storage.getAccessibleDocumentRequirements(
      parsedCompanyId, 
      department
    );
    
    return requirements;
  }

  /**
   * Create new document requirement
   */
  async createDocumentRequirement(requirementData: CreateRequirementData & { serviceId?: number; createdBy?: number }): Promise<any> {
    const { accessType = "all", companyIds = [] } = requirementData;
    
    if (accessType === "specific" && (!Array.isArray(companyIds) || companyIds.length === 0)) {
      throw new Error("برای accessType = specific باید companyIds ارسال شود");
    }

    console.log("📝 Creating document requirement with data:", {
      title: requirementData.title,
      department: requirementData.department,
      serviceId: requirementData.serviceId,
      createdBy: requirementData.createdBy,
      accessType
    });

    const finalRequirementData = { 
      ...requirementData, 
      accessType, 
      companyIds 
    };
    
    const requirement = await storage.createDocumentRequirement(finalRequirementData as any);
    
    console.log(`✅ فرم مدارک جدید ایجاد شد: ${requirement.title} (ID: ${requirement.id})`);
    return requirement;
  }

  /**
   * Update document requirement
   */
  async updateDocumentRequirement(requirementId: number, updateData: any): Promise<any> {
    const updated = await storage.updateDocumentRequirement(requirementId, updateData);
    
    if (!updated) {
      throw new Error("فرم مدارک یافت نشد");
    }
    
    console.log(`✅ فرم مدارک به‌روزرسانی شد: ID ${requirementId}`);
    return updated;
  }

  /**
   * Delete document requirement
   */
  async deleteDocumentRequirement(requirementId: number, userId: number): Promise<void> {
    try {
      console.log(`🔄 شروع حذف فرم مدارک: ID ${requirementId}`);
      
      // First get the requirement details for audit logging
      const requirement = await storage.getDocumentRequirement(requirementId);
      
      if (!requirement) {
        console.log(`❌ فرم مدارک با ID ${requirementId} یافت نشد`);
        throw new Error("فرم مدارک یافت نشد");
      }

      console.log(`📋 فرم مدارک یافت شد: ${requirement.title}`);

      // Check for existing form submissions
      const submissions = await storage.getFormSubmissions({ requirementId });
      console.log(`📊 ${submissions.length} فرم ثبت شده برای این requirement پیدا شد`);

      // Delete the requirement (this should cascade delete related records)
      console.log(`🗑️ حذف requirement از دیتابیس...`);
      const deleted = await storage.deleteDocumentRequirement(requirementId);
      
      if (!deleted) {
        console.log(`❌ عملیات حذف ناموفق برای ID ${requirementId}`);
        throw new Error("فرم مدارک یافت نشد");
      }

      console.log(`✅ Requirement از دیتابیس حذف شد`);

      // Create audit log
      console.log(`📝 ایجاد audit log...`);
      await storage.createAuditLog({
        userId,
        action: "delete_document_requirement",
        resource: "document_requirement",
        resourceId: requirementId,
        details: JSON.stringify({ 
          title: requirement.title,
          department: requirement.department,
          accessType: requirement.accessType || 'all',
          submissionsCount: submissions.length
        }),
        ipAddress: 'localhost',
        userAgent: 'system',
      });

      console.log(`🗑️ فرم مدارک با موفقیت حذف شد: ${requirement.title} (ID: ${requirementId})`);
    } catch (error) {
      console.error(`❌ خطا در حذف فرم مدارک ${requirementId}:`, error);
      throw error;
    }
  }

  /**
   * Get form submissions with filters
   */
  async getFormSubmissions(filters: SubmissionFilters): Promise<any[]> {
    const submissions = await storage.getFormSubmissions(filters);
    return submissions;
  }

  /**
   * Create new form submission (or update if exists - Upsert)
   */
  async createFormSubmission(submissionData: CreateSubmissionData): Promise<any> {
    const { requirementId, companyId, userId, formData, status } = submissionData;
    
    if (!requirementId || !companyId || !formData) {
      throw new Error("اطلاعات ناقص ارسال شده");
    }

    console.log("=== Creating/Updating Form Submission ===");

    // Validate form data against requirement rules (conditional logic)
    // Only validate if not a draft
    if (status !== 'draft') {
      const requirement = await this.getDocumentRequirement(requirementId);
      if (requirement && requirement.fields) {
        let parsedFields = [];
        try {
          parsedFields = typeof requirement.fields === 'string' ? JSON.parse(requirement.fields) : requirement.fields;
        } catch (e) {
          console.error("Error parsing fields for validation", e);
        }

        let parsedFormData = {};
        try {
          parsedFormData = typeof formData === 'string' ? JSON.parse(formData) : formData;
        } catch (e) {
          console.error("Error parsing form data for validation", e);
        }

        this.validateFormDataAgainstRequirement(parsedFormData, parsedFields);
      }
    }

    // Check if submission already exists
    const existingSubmissions = await storage.getFormSubmissions({
      requirementId,
      companyId,
      userId
    });

    if (existingSubmissions.length > 0) {
      const existing = existingSubmissions[0];
      console.log(`Updating existing submission ${existing.id} with status ${status || existing.status}`);

      const updated = await storage.updateFormSubmission(existing.id, {
        formData,
        status: status || existing.status,
        updatedAt: new Date()
      });

      console.log(`✅ فرم به‌روزرسانی شد: ID ${existing.id}`);
      return updated;
    }

    // Create new submission
    console.log("Creating new submission");
    const submission = await storage.createFormSubmission({
      requirementId,
      companyId,
      userId,
      formData,
      status: status || "approved",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null
    });

    console.log(`✅ فرم جدید ثبت شد: ID ${submission.id}`);
    return submission;
  }

  /**
   * Update form submission (review)
   */
  async updateFormSubmission(
    submissionId: number, 
    updateData: UpdateSubmissionData
  ): Promise<any> {
    const { status, reviewedBy, reviewedAt, reviewNotes } = updateData;
    
    if (status) {
      const allowed = ["approved", "rejected", "pending"];
      if (!allowed.includes(status)) {
        throw new Error("وضعیت نامعتبر");
      }
    }

    const updated = await storage.updateFormSubmission(submissionId, {
      status,
      reviewedBy,
      reviewedAt: reviewedAt || new Date().toISOString(),
      reviewNotes,
    });

    if (!updated) {
      throw new Error("فرم یافت نشد");
    }

    console.log(`✅ فرم به‌روزرسانی شد: ID ${submissionId}, وضعیت: ${status}`);
    return updated;
  }

  /**
   * Delete form submission and related documents
   */
  async deleteFormSubmission(submissionId: number, userId: number): Promise<void> {
    // First, get the form submission to find related documents
    const formSubmissions = await storage.getFormSubmissions({ 
      requirementId: undefined, 
      companyId: undefined 
    });
    const formSubmission = formSubmissions.find((sub: any) => sub.id === submissionId);
    
    if (!formSubmission) {
      throw new Error("فرم یافت نشد");
    }

    // Get the requirement details to construct the expected description pattern
    const requirement = await storage.getDocumentRequirement(formSubmission.requirementId);
    
    let deletedDocumentsCount = 0;
    
    if (requirement) {
      // Find and delete related documents
      const companyDocuments = await storage.getDocumentsByCompany(formSubmission.companyId);
      const relatedDocs = companyDocuments.filter((doc: any) => 
        doc.description && doc.description.startsWith(`فایل آپلود شده از فرم: ${requirement.title} - فیلد:`)
      );

      console.log(`🗑️ Deleting ${relatedDocs.length} related documents for form submission ${submissionId}`);

      // Delete each related document
      for (const doc of relatedDocs) {
        try {
          // Delete the physical file
          if (doc.filePath) {
            await fs.unlink(doc.filePath);
          }
          // Delete from database
          await storage.deleteDocument(doc.id);
          console.log(`✅ Deleted document ${doc.id}: ${doc.originalName}`);
          deletedDocumentsCount++;
        } catch (docError) {
          console.error(`❌ Error deleting document ${doc.id}:`, docError);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Finally, delete the form submission
    const deleted = await storage.deleteFormSubmission(submissionId);
    if (!deleted) {
      throw new Error("فرم یافت نشد");
    }

    // Create audit log
    await storage.createAuditLog({
      userId,
      action: "delete_form_submission",
      resource: "form_submission",
      resourceId: submissionId,
      details: JSON.stringify({ 
        requirementId: formSubmission.requirementId,
        companyId: formSubmission.companyId,
        deletedDocuments: deletedDocumentsCount
      }),
      ipAddress: 'localhost',
      userAgent: 'system',
    });

    console.log(`🗑️ فرم و ${deletedDocumentsCount} فایل مرتبط حذف شدند: ID ${submissionId}`);
  }

  /**
   * Check user access to company for form submission
   */
  async validateCompanyAccess(userId: number, userRole: string, companyId: number): Promise<boolean> {
    if (userRole === "customer") {
      const hasAccess = await storage.userHasAccessToCompany(userId, companyId);
      if (!hasAccess) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get form submission by ID
   */
  async getFormSubmissionById(submissionId: number): Promise<any> {
    const submissions = await storage.getFormSubmissions({ 
      requirementId: undefined, 
      companyId: undefined 
    });
    
    const submission = submissions.find((sub: any) => sub.id === submissionId);
    return submission || null;
  }

  /**
   * Get document requirement by ID
   */
  async getDocumentRequirement(requirementId: number): Promise<any> {
    return await storage.getDocumentRequirement(requirementId);
  }

  /**
   * Get statistics for document requirements and submissions
   */
  async getStatistics(companyId?: number, department?: string): Promise<any> {
    try {
      // Get all requirements (filtered if needed)
      const allRequirements = await storage.getAccessibleDocumentRequirements(
        companyId, 
        department
      );

      // Get all submissions
      const filters: SubmissionFilters = {};
      if (companyId) filters.companyId = companyId;
      
      const allSubmissions = await storage.getFormSubmissions(filters);

      // Calculate statistics
      const stats = {
        totalRequirements: allRequirements.length,
        requiredRequirements: allRequirements.filter(req => req.isRequired).length,
        optionalRequirements: allRequirements.filter(req => !req.isRequired).length,
        totalSubmissions: allSubmissions.length,
        approvedSubmissions: allSubmissions.filter(sub => sub.status === "approved").length,
        pendingSubmissions: allSubmissions.filter(sub => sub.status === "pending").length,
        rejectedSubmissions: allSubmissions.filter(sub => sub.status === "rejected").length,
        completionRate: allRequirements.length > 0 
          ? Math.round((allSubmissions.filter(sub => sub.status === "approved").length / allRequirements.length) * 100)
          : 0,
        departmentBreakdown: this.calculateDepartmentBreakdown(allRequirements),
        submissionsByStatus: {
          approved: allSubmissions.filter(sub => sub.status === "approved").length,
          pending: allSubmissions.filter(sub => sub.status === "pending").length,
          rejected: allSubmissions.filter(sub => sub.status === "rejected").length
        }
      };

      return stats;
    } catch (error) {
      console.error("Error calculating document requirements statistics:", error);
      throw new Error("خطا در محاسبه آمار");
    }
  }

  /**
   * Calculate department breakdown for requirements
   */
  private calculateDepartmentBreakdown(requirements: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    requirements.forEach(req => {
      const dept = req.department || "عمومی";
      breakdown[dept] = (breakdown[dept] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Validate form data structure
   */
  validateFormData(formData: string): boolean {
    try {
      const parsed = JSON.parse(formData);
      return typeof parsed === "object" && parsed !== null;
    } catch {
      return false;
    }
  }

  /**
   * Validate form data against requirement fields
   */
  private validateFormDataAgainstRequirement(formData: any, fields: any[]): void {
    if (!Array.isArray(fields)) return;

    for (const field of fields) {
      // Check visibility
      let isVisible = true;
      if (field.showIf) {
        const { field: depField, value: depValue } = field.showIf;
        // Simple equality check for now
        if (formData[depField] !== depValue) {
          isVisible = false;
        }
      }

      if (!isVisible) continue;

      // Check required
      if (field.required) {
        const value = formData[field.name];
        // Check for empty string, undefined, null. (0 is valid)
        if (value === undefined || value === null || value === '') {
          throw new Error(`تکمیل فیلد '${field.label}' الزامی است.`);
        }
      }
    }
  }

  /**
   * Get submissions pending review
   */
  async getPendingSubmissions(department?: string): Promise<any[]> {
    const filters: SubmissionFilters = {
      status: "pending"
    };

    const submissions = await this.getFormSubmissions(filters);
    
    // If department filter is provided, filter by requirement department
    if (department) {
      const filteredSubmissions = [];
      for (const submission of submissions) {
        const requirement = await this.getDocumentRequirement(submission.requirementId);
        if (requirement && requirement.department === department) {
          filteredSubmissions.push({
            ...submission,
            requirement
          });
        }
      }
      return filteredSubmissions;
    }

    // Add requirement details to each submission
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const requirement = await this.getDocumentRequirement(submission.requirementId);
        return {
          ...submission,
          requirement
        };
      })
    );

    return enrichedSubmissions;
  }
}

export const documentRequirementsService = new DocumentRequirementsService(); 