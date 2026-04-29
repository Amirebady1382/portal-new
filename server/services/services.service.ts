import { db } from "../db";
import { storage } from "../storage";
import { workflowService } from "./workflow.service";
// notification.service not implemented — notifications are no-ops
import { logger } from "../utils/logger";
// drizzle-orm imports removed because raw SQL is used instead
import {
  Service,
  InsertService,
  ServiceRequest,
  InsertServiceRequest,
  RequestStatusHistory,
  InsertRequestStatusHistory,
  CompanyService,
  InsertCompanyService,
  ServiceDocumentRequirement,
  InsertServiceDocumentRequirement
} from "../../shared/schema";

export class ServicesService {

  /**
   * Get all services with filters
   */
  async getServices(filters: {
    department?: string;
    category?: string;
    isActive?: boolean;
    userId?: number;
    userRole?: string;
  } = {}): Promise<Service[]> {
    try {
      let query = `
        SELECT s.*, u.full_name as creator_name
        FROM services s
        LEFT JOIN users u ON s.created_by = u.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filters.department) {
        query += ` AND s.department = ?`;
        params.push(filters.department);
      }

      if (filters.category) {
        query += ` AND s.category = ?`;
        params.push(filters.category);
      }

      if (filters.isActive !== undefined) {
        query += ` AND s.is_active = ?`;
        params.push(filters.isActive ? true : false);
      }

      query += ` ORDER BY s.sort_order ASC, s.title ASC`;

      const result = await db.execute(query, params);
      return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        department: row.department,
        category: row.category,
        icon: row.icon,
        estimatedDays: row.estimated_days,
        requirements: row.requirements,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        creatorName: row.creator_name
      })) as Service[];

    } catch (error) {
      console.error("Error getting services:", error);
      throw error;
    }
  }

  /**
   * Get single service by ID
   */
  async getService(id: number): Promise<Service | null> {
    try {
      const result = await db.execute(
        `SELECT s.*, u.full_name as creator_name
         FROM services s
         LEFT JOIN users u ON s.created_by = u.id
         WHERE s.id = ?`,
        [id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0] as any;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        department: row.department,
        category: row.category,
        icon: row.icon,
        estimatedDays: row.estimated_days,
        requirements: row.requirements,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        creatorName: row.creator_name
      } as Service;

    } catch (error) {
      console.error("Error getting service:", error);
      throw error;
    }
  }

  /**
   * Create new service
   */
  async createService(serviceData: Omit<InsertService, 'createdAt' | 'updatedAt'>): Promise<Service> {
    try {
      const now = new Date();
      const result = await db.execute(
        `INSERT INTO services (title, description, department, category, icon, estimated_days, requirements, is_active, sort_order, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [
          serviceData.title,
          serviceData.description || null,
          serviceData.department,
          serviceData.category || null,
          serviceData.icon || null,
          serviceData.estimatedDays || null,
          serviceData.requirements || null,
          serviceData.isActive ? true : false,
          serviceData.sortOrder || 0,
          serviceData.createdBy,
          now,
          now
        ]
      );

      const row = result.rows[0] as any;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        department: row.department,
        category: row.category,
        icon: row.icon,
        estimatedDays: row.estimated_days,
        requirements: row.requirements,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      } as Service;

    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
    }
  }

  /**
   * Update service
   */
  async updateService(id: number, updates: Partial<Omit<Service, 'id' | 'createdAt' | 'createdBy'>>): Promise<Service | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }

      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }

      if (updates.category !== undefined) {
        fields.push('category = ?');
        values.push(updates.category);
      }

      if (updates.icon !== undefined) {
        fields.push('icon = ?');
        values.push(updates.icon);
      }

      if (updates.estimatedDays !== undefined) {
        fields.push('estimated_days = ?');
        values.push(updates.estimatedDays);
      }

      if (updates.requirements !== undefined) {
        fields.push('requirements = ?');
        values.push(updates.requirements);
      }

      if (updates.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.isActive ? true : false);
      }

      if (updates.sortOrder !== undefined) {
        fields.push('sort_order = ?');
        values.push(updates.sortOrder);
      }

      if (fields.length === 0) return this.getService(id);

      fields.push('updated_at = ?');
      values.push(new Date());
      values.push(id);

      await db.execute(
        `UPDATE services SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return this.getService(id);

    } catch (error) {
      console.error("Error updating service:", error);
      throw error;
    }
  }

  /**
   * Delete service
   */
  async deleteService(id: number): Promise<boolean> {
    try {
      // Check if service has active requests
      const activeRequests = await db.execute(
        `SELECT COUNT(*) as count FROM service_requests WHERE service_id = ? AND status IN ('pending', 'in_review')`,
        [id]
      );

      if ((activeRequests.rows[0] as any).count > 0) {
        throw new Error("نمی‌توان خدمتی را حذف کرد که دارای درخواست فعال است");
      }

      await db.execute(`DELETE FROM services WHERE id = ?`, [id]);
      return true;

    } catch (error) {
      console.error("Error deleting service:", error);
      throw error;
    }
  }

  /**
   * Get service requests with filters
   */
  async getServiceRequests(filters: {
    serviceId?: number;
    companyId?: number;
    userId?: number;
    status?: string;
    department?: string;
    assignedTo?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ requests: any[], total: number, page: number, limit: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          sr.*, 
          s.title as service_title,
          s.department as service_department,
          s.icon as service_icon,
          s.estimated_days,
          c.name as company_name,
          u.full_name as user_name,
          ae.full_name as assigned_employee_name
        FROM service_requests sr
        LEFT JOIN services s ON sr.service_id = s.id
        LEFT JOIN companies c ON sr.company_id = c.id
        LEFT JOIN users u ON sr.user_id = u.id
        LEFT JOIN users ae ON sr.assigned_to = ae.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filters.serviceId) {
        query += ` AND sr.service_id = ?`;
        params.push(filters.serviceId);
      }

      if (filters.companyId) {
        query += ` AND sr.company_id = ?`;
        params.push(filters.companyId);
      }

      if (filters.userId) {
        query += ` AND sr.user_id = ?`;
        params.push(filters.userId);
      }

      if (filters.status) {
        query += ` AND sr.status = ?`;
        params.push(filters.status);
      }

      if (filters.department) {
        query += ` AND s.department = ?`;
        params.push(filters.department);
      }

      if (filters.assignedTo) {
        query += ` AND sr.assigned_to = ?`;
        params.push(filters.assignedTo);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');
      const countResult = await db.execute(countQuery, params);
      const total = countResult.rows[0] ? (countResult.rows[0] as any).count : 0;

      // Get paginated results
      query += ` ORDER BY sr.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await db.execute(query, params);

      const requests = result.rows.map((row: any) => ({
        id: row.id,
        serviceId: row.service_id,
        companyId: row.company_id,
        userId: row.user_id,
        status: row.status,
        priority: row.priority,
        assignedTo: row.assigned_to,
        requestData: row.request_data,
        rejectionReason: row.rejection_reason,
        completedAt: row.completed_at,
        dueDate: row.due_date,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Related data
        serviceTitle: row.service_title,
        serviceDepartment: row.service_department,
        serviceIcon: row.service_icon,
        estimatedDays: row.estimated_days,
        companyName: row.company_name,
        userName: row.user_name,
        assignedEmployeeName: row.assigned_employee_name
      }));

      return { requests, total, page, limit };

    } catch (error) {
      console.error("Error getting service requests:", error);
      throw error;
    }
  }

  /**
   * Create service request
   */
  async createServiceRequest(requestData: Omit<InsertServiceRequest, 'createdAt' | 'updatedAt'>): Promise<ServiceRequest> {
    try {
      const now = new Date();

      // Calculate due date if service has estimated days
      let dueDate = null;
      if (requestData.serviceId) {
        const service = await this.getService(requestData.serviceId);
        if (service?.estimatedDays) {
          const due = new Date();
          due.setDate(due.getDate() + service.estimatedDays);
          dueDate = due;
        }
      }

      const result = await db.execute(
        `INSERT INTO service_requests (service_id, company_id, user_id, status, priority, assigned_to, request_data, due_date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [
          requestData.serviceId,
          requestData.companyId,
          requestData.userId,
          requestData.status || 'pending',
          requestData.priority || 'normal',
          requestData.assignedTo || null,
          requestData.requestData || null,
          dueDate,
          requestData.notes || null,
          now,
          now
        ]
      );

      const row = result.rows[0] as any;
      const serviceRequest = {
        id: row.id,
        serviceId: row.service_id,
        companyId: row.company_id,
        userId: row.user_id,
        status: row.status,
        priority: row.priority,
        assignedTo: row.assigned_to,
        requestData: row.request_data,
        rejectionReason: row.rejection_reason,
        completedAt: row.completed_at,
        dueDate: row.due_date,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      } as ServiceRequest;

      // Create status history entry
      await this.addStatusHistory(serviceRequest.id, null, 'pending', requestData.userId, 'درخواست ایجاد شد');

      // Initialize workflow
      await workflowService.createWorkflow(serviceRequest.id);

      // Notification service not yet implemented — skipped
      logger.warn(`Notification skipped for service request ${serviceRequest.id} (notification.service not available)`, "services-service");

      return serviceRequest;

    } catch (error) {
      console.error("Error creating service request:", error);
      throw error;
    }
  }

  /**
   * Update service request
   */
  async updateServiceRequest(
    id: number,
    updates: Partial<Omit<ServiceRequest, 'id' | 'createdAt'>>,
    updatedBy: number
  ): Promise<ServiceRequest | null> {
    try {
      // Get current request to check status change
      const currentRequest = await this.getServiceRequest(id);
      if (!currentRequest) return null;

      const fields: string[] = [];
      const values: any[] = [];

      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);

        // Add completion date if status is completed
        if (updates.status === 'completed') {
          fields.push('completed_at = ?');
          values.push(new Date());
        }
      }

      if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
      }

      if (updates.assignedTo !== undefined) {
        fields.push('assigned_to = ?');
        values.push(updates.assignedTo);
      }

      if (updates.rejectionReason !== undefined) {
        fields.push('rejection_reason = ?');
        values.push(updates.rejectionReason);
      }

      if (updates.notes !== undefined) {
        fields.push('notes = ?');
        values.push(updates.notes);
      }

      if (fields.length === 0) return currentRequest;

      fields.push('updated_at = ?');
      values.push(new Date());
      values.push(id);

      await db.execute(
        `UPDATE service_requests SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // Create status history if status changed
      if (updates.status && updates.status !== currentRequest.status) {
        await this.addStatusHistory(
          id,
          currentRequest.status,
          updates.status,
          updatedBy,
          updates.rejectionReason || 'وضعیت تغییر کرد'
        );
      }

      return this.getServiceRequest(id);

    } catch (error) {
      console.error("Error updating service request:", error);
      throw error;
    }
  }

  /**
   * Get single service request
   */
  async getServiceRequest(id: number): Promise<ServiceRequest | null> {
    try {
      const result = await db.execute(
        `SELECT * FROM service_requests WHERE id = ?`,
        [id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0] as any;
      return {
        id: row.id,
        serviceId: row.service_id,
        companyId: row.company_id,
        userId: row.user_id,
        status: row.status,
        priority: row.priority,
        assignedTo: row.assigned_to,
        requestData: row.request_data,
        rejectionReason: row.rejection_reason,
        completedAt: row.completed_at,
        dueDate: row.due_date,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      } as ServiceRequest;

    } catch (error) {
      console.error("Error getting service request:", error);
      throw error;
    }
  }

  /**
   * Add status history entry
   */
  async addStatusHistory(
    requestId: number,
    oldStatus: string | null,
    newStatus: string,
    changedBy: number,
    notes?: string
  ): Promise<RequestStatusHistory> {
    try {
      const now = new Date();
      const result = await db.execute(
        `INSERT INTO request_status_history (request_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [requestId, oldStatus, newStatus, changedBy, notes || null, now]
      );

      const row = result.rows[0] as any;
      return {
        id: row.id,
        requestId: row.request_id,
        oldStatus: row.old_status,
        newStatus: row.new_status,
        changedBy: row.changed_by,
        notes: row.notes,
        createdAt: new Date(row.created_at)
      } as RequestStatusHistory;

    } catch (error) {
      console.error("Error adding status history:", error);
      throw error;
    }
  }

  /**
   * Get request status history
   */
  async getRequestStatusHistory(requestId: number): Promise<RequestStatusHistory[]> {
    try {
      const result = await db.execute(
        `SELECT rsh.*, u.full_name as changer_name
         FROM request_status_history rsh
         LEFT JOIN users u ON rsh.changed_by = u.id
         WHERE rsh.request_id = ?
         ORDER BY rsh.created_at ASC`,
        [requestId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        requestId: row.request_id,
        oldStatus: row.old_status,
        newStatus: row.new_status,
        changedBy: row.changed_by,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        changerName: row.changer_name
      })) as RequestStatusHistory[];

    } catch (error) {
      console.error("Error getting request status history:", error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics(department?: string): Promise<any> {
    try {
      let departmentFilter = '';
      const params: any[] = [];

      if (department) {
        departmentFilter = 'WHERE s.department = ?';
        params.push(department);
      }

      const result = await db.execute(`
        SELECT 
          COUNT(DISTINCT s.id) as total_services,
          COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as active_services,
          COUNT(DISTINCT sr.id) as total_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'pending' THEN sr.id END) as pending_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'in_review' THEN sr.id END) as in_review_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'approved' THEN sr.id END) as approved_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'rejected' THEN sr.id END) as rejected_requests,
          COUNT(DISTINCT CASE WHEN sr.status = 'completed' THEN sr.id END) as completed_requests
        FROM services s
        LEFT JOIN service_requests sr ON s.id = sr.service_id
        ${departmentFilter}
      `, params);

      const row = result.rows[0] as any;
      return {
        totalServices: row.total_services,
        activeServices: row.active_services,
        totalRequests: row.total_requests,
        pendingRequests: row.pending_requests,
        inReviewRequests: row.in_review_requests,
        approvedRequests: row.approved_requests,
        rejectedRequests: row.rejected_requests,
        completedRequests: row.completed_requests
      };

    } catch (error) {
      console.error("Error getting service statistics:", error);
      throw error;
    }
  }

  /**
   * Check if user has access to company
   */
  async userHasAccessToCompany(userId: number, companyId: number): Promise<boolean> {
    return storage.userHasAccessToCompany(userId, companyId);
  }

  // ================================
  // 🔗 COMPANY SERVICES MAPPING METHODS
  // ================================

  /**
   * Get services assigned to a company
   */
  async getCompanyServices(companyId: number, options: {
    department?: string;
    isActive?: boolean;
  } = {}): Promise<any[]> {
    try {
      console.log('🔍 Getting company services:', { companyId, options });

      let query = `
        SELECT 
          cs.*,
          s.title as service_title,
          s.description as service_description,
          s.department as service_department,
          s.icon as service_icon,
          s.estimated_days,
          u.full_name as activated_by_name
        FROM company_services cs
        INNER JOIN services s ON cs.service_id = s.id
        LEFT JOIN users u ON cs.activated_by = u.id
        WHERE cs.company_id = ?
      `;

      const params: any[] = [companyId];

      if (options.isActive !== undefined) {
        query += ` AND cs.is_active = ?`;
        params.push(options.isActive ? true : false);
        console.log('📊 Filtering by isActive:', options.isActive);
      } else {
        console.log('📊 No isActive filter - returning all services');
      }

      if (options.department) {
        query += ` AND s.department = ?`;
        params.push(options.department);
        console.log('📊 Filtering by department:', options.department);
      }

      query += ` ORDER BY s.sort_order ASC, s.title ASC`;

      console.log('📊 Final query:', query);
      console.log('📊 Params:', params);

      const result = await db.execute(query, params);
      console.log('✅ Query executed. Results:', result.rows.length, 'services found');

      if (result.rows.length > 0) {
        console.log('📋 First service:', result.rows[0]);
      }
      return result.rows.map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        serviceId: row.service_id,
        activatedBy: row.activated_by,
        activatedAt: row.activated_at,
        isActive: Boolean(row.is_active),
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Service details
        serviceTitle: row.service_title,
        serviceDescription: row.service_description,
        serviceDepartment: row.service_department,
        serviceIcon: row.service_icon,
        estimatedDays: row.estimated_days,
        activatedByName: row.activated_by_name
      }));

    } catch (error) {
      console.error("Error getting company services:", error);
      throw error;
    }
  }

  /**
   * Assign service to company
   */
  async assignServiceToCompany(data: {
    companyId: number;
    serviceId: number;
    activatedBy: number;
    notes?: string;
  }): Promise<CompanyService> {
    try {
      const now = new Date();

      // Check if already assigned
      const existing = await db.execute(
        `SELECT * FROM company_services WHERE company_id = ? AND service_id = ?`,
        [data.companyId, data.serviceId]
      );

      if (existing.rows.length > 0) {
        // Already exists, update to active if inactive
        const existingRow = existing.rows[0] as any;
        if (!existingRow.is_active) {
          await db.execute(
            `UPDATE company_services SET is_active = true, updated_at = ? WHERE id = ?`,
            [now, existingRow.id]
          );
        }
        return {
          id: existingRow.id,
          companyId: existingRow.company_id,
          serviceId: existingRow.service_id,
          activatedBy: existingRow.activated_by,
          activatedAt: new Date(existingRow.activated_at),
          isActive: true,
          notes: existingRow.notes,
          createdAt: new Date(existingRow.created_at),
          updatedAt: now
        };
      }

      // Create new assignment
      const result = await db.execute(
        `INSERT INTO company_services (company_id, service_id, activated_by, activated_at, is_active, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [data.companyId, data.serviceId, data.activatedBy, now, true, data.notes || null, now, now]
      );

      const row = result.rows[0] as any;
      return {
        id: row.id,
        companyId: row.company_id,
        serviceId: row.service_id,
        activatedBy: row.activated_by,
        activatedAt: new Date(row.activated_at),
        isActive: row.is_active,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      } as CompanyService;

    } catch (error) {
      console.error("Error assigning service to company:", error);
      throw error;
    }
  }

  /**
   * Remove service from company (deactivate)
   */
  async removeServiceFromCompany(companyId: number, serviceId: number): Promise<boolean> {
    try {
      const now = new Date();
      await db.execute(
        `UPDATE company_services SET is_active = false, updated_at = ? WHERE company_id = ? AND service_id = ?`,
        [now, companyId, serviceId]
      );
      return true;
    } catch (error) {
      console.error("Error removing service from company:", error);
      throw error;
    }
  }

  /**
   * Get companies that have a specific service
   */
  async getCompaniesWithService(serviceId: number): Promise<any[]> {
    try {
      const result = await db.execute(
        `SELECT 
          cs.*,
          c.name as company_name,
          c.national_id,
          u.full_name as activated_by_name
        FROM company_services cs
        INNER JOIN companies c ON cs.company_id = c.id
        LEFT JOIN users u ON cs.activated_by = u.id
        WHERE cs.service_id = ? AND cs.is_active = true
        ORDER BY cs.activated_at DESC`,
        [serviceId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        serviceId: row.service_id,
        activatedBy: row.activated_by,
        activatedAt: row.activated_at,
        isActive: Boolean(row.is_active),
        notes: row.notes,
        companyName: row.company_name,
        nationalId: row.national_id,
        activatedByName: row.activated_by_name
      }));

    } catch (error) {
      console.error("Error getting companies with service:", error);
      throw error;
    }
  }

  // ================================
  // 📋 SERVICE FORMS MAPPING METHODS
  // ================================

  /**
   * Add form to service
   */
  async addFormToService(data: {
    serviceId: number;
    documentRequirementId: number;
    department: string;
    isRequired: boolean;
    sortOrder?: number;
    createdBy: number;
  }): Promise<ServiceDocumentRequirement> {
    try {
      const now = new Date();

      // Check if already exists
      const existing = await db.execute(
        `SELECT * FROM service_document_requirements 
         WHERE service_id = ? AND document_requirement_id = ? AND department = ?`,
        [data.serviceId, data.documentRequirementId, data.department]
      );

      if (existing.rows.length > 0) {
        throw new Error("این فرم قبلاً برای این خدمت و واحد اضافه شده است");
      }

      const result = await db.execute(
        `INSERT INTO service_document_requirements 
         (service_id, document_requirement_id, department, is_required, sort_order, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        [
          data.serviceId,
          data.documentRequirementId,
          data.department,
          data.isRequired ? true : false,
          data.sortOrder || 0,
          data.createdBy,
          now
        ]
      );

      const row = result.rows[0] as any;
      return {
        id: row.id,
        serviceId: row.service_id,
        documentRequirementId: row.document_requirement_id,
        department: row.department,
        isRequired: row.is_required,
        sortOrder: row.sort_order,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at)
      } as ServiceDocumentRequirement;

    } catch (error) {
      console.error("Error adding form to service:", error);
      throw error;
    }
  }

  /**
   * Remove form from service
   */
  async removeFormFromService(id: number): Promise<boolean> {
    try {
      await db.execute(`DELETE FROM service_document_requirements WHERE id = ?`, [id]);
      return true;
    } catch (error) {
      console.error("Error removing form from service:", error);
      throw error;
    }
  }

  /**
   * Get forms for a service
   */
  async getServiceForms(serviceId: number, department?: string): Promise<any[]> {
    try {
      console.log(`🔍 getServiceForms called with serviceId: ${serviceId}, department: ${department}`);

      let query = `
        SELECT 
          sdr.*,
          dr.title as form_title,
          dr.description as form_description,
          dr.fields as form_fields,
          dr.category as form_category,
          u.full_name as created_by_name
        FROM service_document_requirements sdr
        INNER JOIN document_requirements dr ON sdr.document_requirement_id = dr.id
        LEFT JOIN users u ON sdr.created_by = u.id
        WHERE sdr.service_id = ?
      `;

      const params: any[] = [serviceId];

      if (department) {
        query += ` AND sdr.department = ?`;
        params.push(department);
      }

      query += ` ORDER BY sdr.sort_order ASC, dr.title ASC`;

      console.log(`📋 Executing query with params:`, params);
      const result = await db.execute(query, params);
      console.log(`✅ Found ${result.rows.length} forms for service ${serviceId}`);
      return result.rows.map((row: any) => ({
        id: row.id,
        serviceId: row.service_id,
        documentRequirementId: row.document_requirement_id,
        department: row.department,
        isRequired: row.is_required,
        sortOrder: row.sort_order,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        // Form details
        formTitle: row.form_title,
        formDescription: row.form_description,
        formFields: row.form_fields,
        formCategory: row.form_category,
        createdByName: row.created_by_name
      }));

    } catch (error) {
      console.error("Error getting service forms:", error);
      throw error;
    }
  }

  /**
   * Get forms for company's services
   * این متد فرم‌های مربوط به خدمات فعال یک شرکت را برمی‌گرداند
   */
  async getCompanyServiceForms(companyId: number, department: string): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          dr.id as form_id,
          dr.title as form_title,
          dr.description as form_description,
          dr.fields as form_fields,
          dr.category as form_category,
          dr.is_required as form_is_required,
          dr.order as form_order,
          s.id as service_id,
          s.title as service_title,
          sdr.is_required as service_form_required
        FROM company_services cs
        INNER JOIN services s ON cs.service_id = s.id
        INNER JOIN service_document_requirements sdr ON s.id = sdr.service_id
        INNER JOIN document_requirements dr ON sdr.document_requirement_id = dr.id
        WHERE cs.company_id = ? 
          AND cs.is_active = true
          AND s.is_active = true
          AND dr.is_active = true
          AND sdr.department = ?
        ORDER BY s.sort_order ASC, sdr.sort_order ASC, dr.order ASC
      `;

      const result = await db.execute(query, [companyId, department]);
      return result.rows.map((row: any) => ({
        formId: row.form_id,
        formTitle: row.form_title,
        formDescription: row.form_description,
        formFields: row.form_fields,
        formCategory: row.form_category,
        formIsRequired: row.form_is_required,
        formOrder: row.form_order,
        serviceId: row.service_id,
        serviceTitle: row.service_title,
        serviceFormRequired: row.service_form_required
      }));

    } catch (error) {
      console.error("Error getting company service forms:", error);
      throw error;
    }
  }
}

export const servicesService = new ServicesService();
