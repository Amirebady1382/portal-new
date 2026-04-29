import { db } from "../db";
import type { ServiceRequestWorkflow, InsertServiceRequestWorkflow } from "../../shared/schema";

/**
 * Service for managing service request workflow
 * Handles the two-stage process: Investment → Administrative
 */
export class WorkflowService {
  
  /**
   * Create workflow for a new service request
   */
  async createWorkflow(serviceRequestId: number): Promise<ServiceRequestWorkflow> {
    try {
      const now = new Date().toISOString();
      
      await db.execute(
        `INSERT INTO service_request_workflow (
          service_request_id, 
          current_stage, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?)`,
        [serviceRequestId, "investment_forms_pending", now, now]
      );
      
      // Fetch the created workflow
      const result = await db.execute(
        `SELECT * FROM service_request_workflow WHERE service_request_id = ?`,
        [serviceRequestId]
      );
      
      if (result.rows.length === 0) {
        throw new Error("Failed to create workflow");
      }
      
      const row = result.rows[0] as any;
      console.log(`✅ Workflow created for service request ${serviceRequestId}`);
      
      return this.mapRowToWorkflow(row);
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  }

  /**
   * Get workflow by service request ID
   */
  async getWorkflowByRequestId(serviceRequestId: number): Promise<ServiceRequestWorkflow | null> {
    try {
      const result = await db.execute(
        `SELECT * FROM service_request_workflow WHERE service_request_id = ?`,
        [serviceRequestId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToWorkflow(result.rows[0] as any);
    } catch (error) {
      console.error("Error getting workflow:", error);
      throw error;
    }
  }

  /**
   * Update workflow stage after investment forms are completed
   */
  async markInvestmentFormsCompleted(serviceRequestId: number): Promise<ServiceRequestWorkflow> {
    try {
      // Validate all required forms are submitted
      await this.validateFormsCompletion(serviceRequestId, 'investment');

      const now = new Date().toISOString();
      
      await db.execute(
        `UPDATE service_request_workflow 
        SET current_stage = 'investment_review',
            updated_at = ?
        WHERE service_request_id = ?`,
        [now, serviceRequestId]
      );
      
      // Fetch the updated workflow
      const result = await db.execute(
        `SELECT * FROM service_request_workflow WHERE service_request_id = ?`,
        [serviceRequestId]
      );
      
      if (result.rows.length === 0) {
        throw new Error("Workflow not found");
      }
      
      console.log(`✅ Investment forms marked as completed for request ${serviceRequestId}`);
      return this.mapRowToWorkflow(result.rows[0] as any);
    } catch (error) {
      console.error("Error updating workflow stage:", error);
      throw error;
    }
  }

  /**
   * Transfer to administrative department
   * Called by investment employee
   */
  async transferToAdministrative(
    serviceRequestId: number, 
    employeeId: number, 
    notes?: string
  ): Promise<ServiceRequestWorkflow> {
    try {
      const now = new Date().toISOString();
      
      // Check current stage
      const workflow = await this.getWorkflowByRequestId(serviceRequestId);
      if (!workflow) {
        throw new Error("Workflow not found");
      }
      
      if (workflow.currentStage !== "investment_review") {
        throw new Error(`Cannot transfer from stage: ${workflow.currentStage}`);
      }
      
      await db.execute(
        `UPDATE service_request_workflow 
        SET current_stage = 'administrative_forms_pending',
            investment_reviewed_by = ?,
            investment_reviewed_at = ?,
            investment_notes = ?,
            updated_at = ?
        WHERE service_request_id = ?`,
        [employeeId, now, notes || null, now, serviceRequestId]
      );
      
      // Fetch the updated workflow
      const result = await db.execute(
        `SELECT * FROM service_request_workflow WHERE service_request_id = ?`,
        [serviceRequestId]
      );
      
      if (result.rows.length === 0) {
        throw new Error("Failed to update workflow");
      }
      
      console.log(`✅ Request ${serviceRequestId} transferred to administrative by employee ${employeeId}`);
      return this.mapRowToWorkflow(result.rows[0] as any);
    } catch (error) {
      console.error("Error transferring to administrative:", error);
      throw error;
    }
  }

  /**
   * Mark administrative forms as completed
   */
  async markAdministrativeFormsCompleted(serviceRequestId: number): Promise<ServiceRequestWorkflow> {
    try {
      // Validate all required forms are submitted
      await this.validateFormsCompletion(serviceRequestId, 'administrative');

      const now = new Date().toISOString();
      
      await db.execute(
        `UPDATE service_request_workflow 
        SET current_stage = 'administrative_review',
            updated_at = ?
        WHERE service_request_id = ?`,
        [now, serviceRequestId]
      );
      
      // Fetch the updated workflow
      const result = await db.execute(
        `SELECT * FROM service_request_workflow WHERE service_request_id = ?`,
        [serviceRequestId]
      );
      
      if (result.rows.length === 0) {
        throw new Error("Workflow not found");
      }
      
      console.log(`✅ Administrative forms marked as completed for request ${serviceRequestId}`);
      return this.mapRowToWorkflow(result.rows[0] as any);
    } catch (error) {
      console.error("Error updating workflow stage:", error);
      throw error;
    }
  }

  /**
   * Complete workflow
   * Called by administrative employee
   */
  async completeWorkflow(
    serviceRequestId: number, 
    employeeId: number, 
    notes?: string
  ): Promise<ServiceRequestWorkflow> {
    try {
      const now = new Date().toISOString();
      
      // Check current stage
      const workflow = await this.getWorkflowByRequestId(serviceRequestId);
      if (!workflow) {
        throw new Error("Workflow not found");
      }
      
      if (workflow.currentStage !== "administrative_review") {
        throw new Error(`Cannot complete from stage: ${workflow.currentStage}`);
      }
      
      await db.execute(
        `UPDATE service_request_workflow 
        SET current_stage = 'completed',
            administrative_reviewed_by = ?,
            administrative_reviewed_at = ?,
            administrative_notes = ?,
            completed_at = ?,
            updated_at = ?
        WHERE service_request_id = ?`,
        [employeeId, now, notes || null, now, now, serviceRequestId]
      );
      
      // Fetch the updated workflow
      const result = await db.execute(
        `SELECT * FROM service_request_workflow WHERE service_request_id = ?`,
        [serviceRequestId]
      );
      
      if (result.rows.length === 0) {
        throw new Error("Failed to update workflow");
      }
      
      console.log(`✅ Request ${serviceRequestId} completed by employee ${employeeId}`);
      return this.mapRowToWorkflow(result.rows[0] as any);
    } catch (error) {
      console.error("Error completing workflow:", error);
      throw error;
    }
  }

  /**
   * Get customer-friendly workflow status
   */
  async getCustomerWorkflowStatus(serviceRequestId: number): Promise<{
    stage: string;
    message: string;
    canFillForms: boolean;
    formsType?: "investment" | "administrative";
  } | null> {
    try {
      const workflow = await this.getWorkflowByRequestId(serviceRequestId);
      
      if (!workflow) {
        return null;
      }
      
      switch (workflow.currentStage) {
        case "investment_forms_pending":
          return {
            stage: workflow.currentStage,
            message: "لطفاً فرم‌های واحد سرمایه‌گذاری را تکمیل کنید",
            canFillForms: true,
            formsType: "investment"
          };
          
        case "investment_review":
          return {
            stage: workflow.currentStage,
            message: "درخواست شما در حال بررسی در واحد سرمایه‌گذاری است",
            canFillForms: false
          };
          
        case "administrative_forms_pending":
          return {
            stage: workflow.currentStage,
            message: "لطفاً فرم‌های واحد اداری را تکمیل کنید",
            canFillForms: true,
            formsType: "administrative"
          };
          
        case "administrative_review":
          return {
            stage: workflow.currentStage,
            message: "درخواست شما در حال بررسی در واحد اداری است",
            canFillForms: false
          };
          
        case "completed":
          return {
            stage: workflow.currentStage,
            message: "درخواست شما نهایی شد ✅",
            canFillForms: false
          };
          
        default:
          return {
            stage: workflow.currentStage,
            message: "در حال پردازش...",
            canFillForms: false
          };
      }
    } catch (error) {
      console.error("Error getting customer workflow status:", error);
      throw error;
    }
  }

  /**
   * Get all workflows with filters (for employee dashboard)
   */
  async getWorkflows(filters: {
    stage?: string;
    department?: "investment" | "administrative";
  } = {}): Promise<ServiceRequestWorkflow[]> {
    try {
      let query = `SELECT * FROM service_request_workflow WHERE 1=1`;
      const params: any[] = [];
      
      if (filters.stage) {
        query += ` AND current_stage = ?`;
        params.push(filters.stage);
      }
      
      if (filters.department === "investment") {
        query += ` AND current_stage IN ('investment_forms_pending', 'investment_review')`;
      } else if (filters.department === "administrative") {
        query += ` AND current_stage IN ('administrative_forms_pending', 'administrative_review')`;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await db.execute(query, params);
      
      return result.rows.map(row => this.mapRowToWorkflow(row as any));
    } catch (error) {
      console.error("Error getting workflows:", error);
      throw error;
    }
  }

  /**
   * Helper: Validate all required forms are completed for a department
   */
  private async validateFormsCompletion(serviceRequestId: number, department: string): Promise<void> {
    // 1. Get service request details (service_id, company_id)
    const requestResult = await db.execute(
      `SELECT service_id, company_id FROM service_requests WHERE id = ?`,
      [serviceRequestId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error("Service request not found");
    }

    const request = requestResult.rows[0] as any;

    // 2. Get required forms for this service and department
    const requirementsResult = await db.execute(
      `SELECT dr.id, dr.title
       FROM service_document_requirements sdr
       JOIN document_requirements dr ON sdr.document_requirement_id = dr.id
       WHERE sdr.service_id = ? AND sdr.department = ? AND sdr.is_required = 1`,
      [request.service_id, department]
    );

    const requiredForms = requirementsResult.rows as any[];

    if (requiredForms.length === 0) {
      return; // No required forms
    }

    // 3. Get valid submissions for these requirements for this company
    // Using simple iteration to avoid complex IN clauses if array is empty (though checked above)
    // We check for status != 'draft' (assuming draft status will be implemented)
    // If 'draft' is not yet in DB, this query will still work as it just checks for existence

    const requiredIds = requiredForms.map(r => r.id);
    const placeholders = requiredIds.map(() => '?').join(',');

    const submissionsResult = await db.execute(
      `SELECT requirement_id
       FROM form_submissions
       WHERE company_id = ?
       AND requirement_id IN (${placeholders})
       AND status != 'draft'`,
       [request.company_id, ...requiredIds]
    );

    const submittedRequirementIds = new Set(submissionsResult.rows.map((r: any) => r.requirement_id));
    const missingForms = requiredForms.filter(req => !submittedRequirementIds.has(req.id));

    if (missingForms.length > 0) {
      const missingTitles = missingForms.map(f => f.title).join('، ');
      throw new Error(`لطفاً ابتدا فرم‌های زیر را تکمیل و نهایی کنید: ${missingTitles}`);
    }
  }

  /**
   * Helper: Map database row to ServiceRequestWorkflow
   */
  private mapRowToWorkflow(row: any): ServiceRequestWorkflow {
    return {
      id: row.id,
      serviceRequestId: row.service_request_id,
      currentStage: row.current_stage,
      investmentReviewedBy: row.investment_reviewed_by,
      investmentReviewedAt: row.investment_reviewed_at,
      investmentNotes: row.investment_notes,
      administrativeReviewedBy: row.administrative_reviewed_by,
      administrativeReviewedAt: row.administrative_reviewed_at,
      administrativeNotes: row.administrative_notes,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const workflowService = new WorkflowService();

