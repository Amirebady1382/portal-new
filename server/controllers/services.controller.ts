import type { Request, Response } from "express";
import { servicesService } from "../services/services.service";
import { workflowService } from "../services/workflow.service";
import type { AuthRequest } from "../middleware/auth";
import { storage } from "../storage";

export class ServicesController {
  
  /**
   * GET /api/services - Get all services
   */
  async getServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { department, category, isActive } = req.query;
      
      const services = await servicesService.getServices({
        department: department as string,
        category: category as string,
        isActive: isActive ? isActive === 'true' : undefined,
        userId: req.user.userId,
        userRole: req.user.role
      });
      
      res.json(services);
    } catch (error) {
      console.error("Get services error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/services/:id - Get single service
   */
  async getService(req: AuthRequest, res: Response): Promise<void> {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await servicesService.getService(serviceId);
      
      if (!service) {
        res.status(404).json({ message: "خدمت یافت نشد" });
        return;
      }
      
      res.json(service);
    } catch (error) {
      console.error("Get service error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/services - Create new service (employees only)
   */
  async createService(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can create services
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const serviceData = {
        ...req.body,
        createdBy: req.user.userId
      };
      
      const service = await servicesService.createService(serviceData);
      
      // Log the creation
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "create_service",
        resource: "service", 
        resourceId: service.id,
        details: JSON.stringify({ serviceName: service.title, department: service.department }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Create service error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * PUT /api/services/:id - Update service (employees only)
   */
  async updateService(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can update services
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const serviceId = parseInt(req.params.id);
      const service = await servicesService.updateService(serviceId, req.body);
      
      if (!service) {
        res.status(404).json({ message: "خدمت یافت نشد" });
        return;
      }
      
      // Log the update
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "update_service",
        resource: "service",
        resourceId: serviceId,
        details: JSON.stringify({ updates: req.body }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json(service);
    } catch (error) {
      console.error("Update service error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * DELETE /api/services/:id - Delete service (admin only)
   */
  async deleteService(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only admin can delete services
      if (req.user.role !== 'admin') {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const serviceId = parseInt(req.params.id);
      
      // Get service info before deletion for logging
      const service = await servicesService.getService(serviceId);
      if (!service) {
        res.status(404).json({ message: "خدمت یافت نشد" });
        return;
      }
      
      await servicesService.deleteService(serviceId);
      
      // Log the deletion
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "delete_service",
        resource: "service",
        resourceId: serviceId,
        details: JSON.stringify({ serviceName: service.title }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });
      
      res.json({ message: "خدمت با موفقیت حذف شد" });
    } catch (error: any) {
      console.error("Delete service error:", error);
      res.status(400).json({ message: error.message || "خطای سیستم" });
    }
  }

  /**
   * GET /api/service-requests - Get service requests
   */
  async getServiceRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        serviceId,
        companyId,
        status,
        department,
        assignedTo,
        page = 1,
        limit = 20
      } = req.query;

      let filters: any = {
        serviceId: serviceId ? parseInt(serviceId as string) : undefined,
        status: status as string,
        department: department as string,
        assignedTo: assignedTo ? parseInt(assignedTo as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      // Apply role-based filtering
      if (req.user.role === 'customer') {
        filters.userId = req.user.userId;
        if (companyId) {
          // Verify customer has access to this company
          const hasAccess = await servicesService.userHasAccessToCompany(
            req.user.userId, 
            parseInt(companyId as string)
          );
          if (!hasAccess) {
            res.status(403).json({ message: "دسترسی محدود" });
            return;
          }
          filters.companyId = parseInt(companyId as string);
        }
      } else if (req.user.role === 'employee' && req.user.department) {
        // Employees only see requests for their department
        filters.department = req.user.department;
        filters.companyId = companyId ? parseInt(companyId as string) : undefined;
      } else if (['admin', 'ceo'].includes(req.user.role)) {
        // Admin and CEO can see all requests
        filters.companyId = companyId ? parseInt(companyId as string) : undefined;
      }

      const result = await servicesService.getServiceRequests(filters);
      res.json(result);
    } catch (error) {
      console.error("Get service requests error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/service-requests - Create service request (customers only)
   */
  async createServiceRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { serviceId, companyId, priority, requestData, notes } = req.body;

      // Verify required fields
      if (!serviceId || !companyId) {
        res.status(400).json({ message: "اطلاعات ناقص ارسال شده" });
        return;
      }

      // Check if service exists and is active
      const service = await servicesService.getService(serviceId);
      if (!service || !service.isActive) {
        res.status(400).json({ message: "خدمت یافت نشد یا غیرفعال است" });
        return;
      }

      // Verify customer has access to company
      if (req.user.role === 'customer') {
        const hasAccess = await servicesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی به این شرکت محدود است" });
          return;
        }
      }

      // Prevent duplicate active requests for the same company and service across all submitters
      const activeRequests = await servicesService.getServiceRequests({
        serviceId,
        companyId
      });
      
      const hasActive = activeRequests.requests.some(r => 
        ['pending', 'in_review', 'investment_review', 'administrative_review'].includes(r.status)
      );

      console.log("🔍 Debugging Active Request Check (Robust):", {
        serviceId,
        companyId,
        totalRequestsFound: activeRequests.requests.length,
        hasActive,
        activeRequests: activeRequests.requests.map(r => ({ id: r.id, status: r.status }))
      });
      
      if (hasActive) {
        res.status(400).json({ message: "در حال حاضر یک درخواست فعال (در حال بررسی) برای این خدمت و شرکت وجود دارد." });
        return;
      }

      const requestPayload = {
        serviceId,
        companyId,
        userId: req.user.userId,
        priority: priority || 'normal',
        requestData: requestData ? JSON.stringify(requestData) : null,
        notes
      };

      const serviceRequest = await servicesService.createServiceRequest(requestPayload);

      // NOTE: workflowService.createWorkflow() is already called inside
      // servicesService.createServiceRequest() — do NOT call it again here.
      // Fetch the workflow record that was already created:
      const workflow = await workflowService.getWorkflowByRequestId(serviceRequest.id);

      // Log the request creation
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "create_service_request",
        resource: "service_request",
        resourceId: serviceRequest.id,
        details: JSON.stringify({ 
          serviceId: service.id,
          serviceName: service.title,
          companyId,
          workflowCreated: true
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.status(201).json({
        serviceRequest,
        workflow,
        message: "درخواست با موفقیت ثبت شد"
      });
    } catch (error: any) {
      console.error("Create service request error:", error);
      res.status(500).json({ message: error.message || "خطای سیستم" });
    }
  }

  /**
   * PUT /api/service-requests/:id - Update service request (employees)
   */
  async updateServiceRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can update requests
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const requestId = parseInt(req.params.id);
      const updates = req.body;

      // Get current request for validation
      const currentRequest = await servicesService.getServiceRequest(requestId);
      if (!currentRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Employees can only update requests in their department
      if (req.user.role === 'employee' && req.user.department) {
        const service = await servicesService.getService(currentRequest.serviceId);
        if (service?.department !== req.user.department) {
          res.status(403).json({ message: "این درخواست متعلق به واحد شما نیست" });
          return;
        }
      }

      const updatedRequest = await servicesService.updateServiceRequest(
        requestId, 
        updates, 
        req.user.userId
      );

      if (!updatedRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Log the update
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "update_service_request",
        resource: "service_request",
        resourceId: requestId,
        details: JSON.stringify({ updates }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Update service request error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/service-requests/:id - Get single service request
   */
  async getServiceRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requestId = parseInt(req.params.id);
      const serviceRequest = await servicesService.getServiceRequest(requestId);

      if (!serviceRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Check access permissions
      if (req.user.role === 'customer' && serviceRequest.userId !== req.user.userId) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      if (req.user.role === 'employee' && req.user.department) {
        const service = await servicesService.getService(serviceRequest.serviceId);
        if (service?.department !== req.user.department) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      res.json(serviceRequest);
    } catch (error) {
      console.error("Get service request error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/service-requests/:id/history - Get request status history
   */
  async getRequestStatusHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requestId = parseInt(req.params.id);
      
      // First check if request exists and user has access
      const serviceRequest = await servicesService.getServiceRequest(requestId);
      if (!serviceRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Check access permissions
      if (req.user.role === 'customer' && serviceRequest.userId !== req.user.userId) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const history = await servicesService.getRequestStatusHistory(requestId);
      res.json(history);
    } catch (error) {
      console.error("Get request status history error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/services/statistics - Get service statistics
   */
  async getServiceStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { department } = req.query;
      
      // Employees can only see their department stats
      let filterDepartment = department as string;
      if (req.user.role === 'employee' && req.user.department) {
        filterDepartment = req.user.department;
      }

      const stats = await servicesService.getServiceStatistics(filterDepartment);
      res.json(stats);
    } catch (error) {
      console.error("Get service statistics error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  // ================================
  // 🔗 COMPANY SERVICES ENDPOINTS
  // ================================

  /**
   * GET /api/companies/:companyId/services - Get services assigned to a company
   */
  async getCompanyServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const { department, isActive } = req.query;

      console.log('🎯 GET Company Services Request:', { 
        companyId, 
        department, 
        isActive,
        user: req.user.role 
      });

      // Check access
      if (req.user.role === 'customer') {
        const hasAccess = await servicesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          console.log('❌ Access denied for customer');
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const services = await servicesService.getCompanyServices(companyId, {
        department: department as string,
        isActive: isActive ? isActive === 'true' : undefined  // فقط اگر isActive فرستاده شده باشد
      });

      console.log('✅ Returning', services.length, 'services to client');

      res.json({ success: true, services });
    } catch (error) {
      console.error("❌ Get company services error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/services/assign-to-company - Assign service to company (employees only)
   */
  async assignServiceToCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can assign services
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const { companyId, serviceId, notes } = req.body;

      if (!companyId || !serviceId) {
        res.status(400).json({ message: "اطلاعات ناقص ارسال شده" });
        return;
      }

      // Check if service exists
      const service = await servicesService.getService(serviceId);
      if (!service) {
        res.status(404).json({ message: "خدمت یافت نشد" });
        return;
      }

      // Check if company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        res.status(404).json({ message: "شرکت یافت نشد" });
        return;
      }

      const companyService = await servicesService.assignServiceToCompany({
        companyId,
        serviceId,
        activatedBy: req.user.userId,
        notes
      });

      // Log the assignment
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "assign_service_to_company",
        resource: "company_service",
        resourceId: companyService.id,
        details: JSON.stringify({
          companyId,
          companyName: company.name,
          serviceId,
          serviceName: service.title
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.status(201).json({
        success: true,
        companyService,
        message: `خدمت "${service.title}" با موفقیت به شرکت "${company.name}" اختصاص یافت`
      });
    } catch (error) {
      console.error("Assign service to company error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * DELETE /api/companies/:companyId/services/:serviceId - Remove service from company
   */
  async removeServiceFromCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can remove services
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const companyId = parseInt(req.params.companyId);
      const serviceId = parseInt(req.params.serviceId);

      await servicesService.removeServiceFromCompany(companyId, serviceId);

      res.json({
        success: true,
        message: "خدمت با موفقیت از شرکت حذف شد"
      });
    } catch (error) {
      console.error("Remove service from company error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/services/:serviceId/companies - Get companies that have this service
   */
  async getCompaniesWithService(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can view this
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const serviceId = parseInt(req.params.serviceId);
      const companies = await servicesService.getCompaniesWithService(serviceId);

      res.json({ success: true, companies });
    } catch (error) {
      console.error("Get companies with service error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  // ================================
  // 📋 SERVICE FORMS ENDPOINTS
  // ================================

  /**
   * POST /api/services/:serviceId/forms - Add form to service
   */
  async addFormToService(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can add forms
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const serviceId = parseInt(req.params.serviceId);
      const { documentRequirementId, department, isRequired, sortOrder } = req.body;

      if (!documentRequirementId || !department) {
        res.status(400).json({ message: "اطلاعات ناقص ارسال شده" });
        return;
      }

      const mapping = await servicesService.addFormToService({
        serviceId,
        documentRequirementId,
        department,
        isRequired: isRequired !== undefined ? isRequired : true,
        sortOrder,
        createdBy: req.user.userId
      });

      res.status(201).json({
        success: true,
        mapping,
        message: "فرم با موفقیت به خدمت اضافه شد"
      });
    } catch (error: any) {
      console.error("Add form to service error:", error);
      if (error.message.includes("قبلاً")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "خطای سیستم" });
      }
    }
  }

  /**
   * DELETE /api/services/forms/:mappingId - Remove form from service
   */
  async removeFormFromService(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only employees can remove forms
      if (!['admin', 'employee', 'ceo'].includes(req.user.role)) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const mappingId = parseInt(req.params.mappingId);
      await servicesService.removeFormFromService(mappingId);

      res.json({
        success: true,
        message: "فرم با موفقیت از خدمت حذف شد"
      });
    } catch (error) {
      console.error("Remove form from service error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/services/:serviceId/forms - Get forms for a service
   */
  async getServiceForms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const { department } = req.query;

      const forms = await servicesService.getServiceForms(serviceId, department as string);

      res.json({ success: true, forms });
    } catch (error) {
      console.error("Get service forms error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/companies/:companyId/service-forms - Get forms for company's services
   */
  async getCompanyServiceForms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const { department } = req.query;

      if (!department) {
        res.status(400).json({ message: "واحد (department) الزامی است" });
        return;
      }

      // Check access
      if (req.user.role === 'customer') {
        const hasAccess = await servicesService.userHasAccessToCompany(req.user.userId, companyId);
        if (!hasAccess) {
          res.status(403).json({ message: "دسترسی محدود" });
          return;
        }
      }

      const forms = await servicesService.getCompanyServiceForms(companyId, department as string);

      res.json({ success: true, forms });
    } catch (error) {
      console.error("Get company service forms error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  // ================================
  // 🔄 WORKFLOW ENDPOINTS
  // ================================

  /**
   * GET /api/service-requests/:id/workflow-status - Get workflow status
   */
  async getWorkflowStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requestId = parseInt(req.params.id);
      
      // Check if request exists and user has access
      const serviceRequest = await servicesService.getServiceRequest(requestId);
      if (!serviceRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Check access permissions
      if (req.user.role === 'customer' && serviceRequest.userId !== req.user.userId) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      const workflow = await workflowService.getWorkflowByRequestId(requestId);
      
      if (!workflow) {
        res.status(404).json({ message: "workflow یافت نشد" });
        return;
      }

      const customerStatus = await workflowService.getCustomerWorkflowStatus(requestId);

      res.json({
        success: true,
        workflow,
        customerStatus
      });
    } catch (error) {
      console.error("Get workflow status error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/service-requests/:id/transfer-to-administrative 
   * Transfer request to administrative department (investment employees only)
   */
  async transferToAdministrative(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only investment employees can transfer
      if (req.user.role !== 'employee' || req.user.department !== 'investment') {
        if (!['admin', 'ceo'].includes(req.user.role)) {
          res.status(403).json({ message: "فقط کارمندان واحد سرمایه‌گذاری می‌توانند این عملیات را انجام دهند" });
          return;
        }
      }

      const requestId = parseInt(req.params.id);
      const { notes } = req.body;

      // Check if request exists
      const serviceRequest = await servicesService.getServiceRequest(requestId);
      if (!serviceRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Transfer to administrative
      const workflow = await workflowService.transferToAdministrative(
        requestId,
        req.user.userId,
        notes
      );

      // Log the transfer
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "transfer_to_administrative",
        resource: "service_request_workflow",
        resourceId: workflow.id,
        details: JSON.stringify({
          requestId,
          notes
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({
        success: true,
        workflow,
        message: "درخواست با موفقیت به واحد اداری ارجاع شد"
      });
    } catch (error: any) {
      console.error("Transfer to administrative error:", error);
      // All errors from this workflow endpoint are operational (wrong stage, missing record, etc.)
      // A true system failure (DB down) would prevent the server responding at all.
      res.status(400).json({ 
        message: error.message || "خطا در ارجاع درخواست به واحد اداری",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * POST /api/service-requests/:id/complete
   * Complete service request (administrative employees only)
   */
  async completeServiceRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only administrative employees can complete
      if (req.user.role !== 'employee' || req.user.department !== 'administrative') {
        if (!['admin', 'ceo'].includes(req.user.role)) {
          res.status(403).json({ message: "فقط کارمندان واحد اداری می‌توانند این عملیات را انجام دهند" });
          return;
        }
      }

      const requestId = parseInt(req.params.id);
      const { notes } = req.body;

      // Check if request exists
      const serviceRequest = await servicesService.getServiceRequest(requestId);
      if (!serviceRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      // Complete workflow
      const workflow = await workflowService.completeWorkflow(
        requestId,
        req.user.userId,
        notes
      );

      // Update service request status
      await servicesService.updateServiceRequest(
        requestId,
        { status: 'completed', completedAt: new Date().toISOString() },
        req.user.userId
      );

      // Log the completion
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "complete_service_request",
        resource: "service_request_workflow",
        resourceId: workflow.id,
        details: JSON.stringify({
          requestId,
          notes
        }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({
        success: true,
        workflow,
        message: "درخواست با موفقیت نهایی شد"
      });
    } catch (error: any) {
      console.error("Complete service request error:", error);
      // All errors from this workflow endpoint are operational (wrong stage, missing record, etc.)
      res.status(400).json({ 
        message: error.message || "خطا در تکمیل درخواست",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * POST /api/service-requests/:id/mark-forms-completed
   * Mark forms as completed (called by customer after submitting all forms)
   */
  async markFormsCompleted(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requestId = parseInt(req.params.id);
      const { stage } = req.body; // 'investment' or 'administrative'

      // Check if request exists and user has access
      const serviceRequest = await servicesService.getServiceRequest(requestId);
      if (!serviceRequest) {
        res.status(404).json({ message: "درخواست یافت نشد" });
        return;
      }

      if (req.user.role === 'customer' && serviceRequest.userId !== req.user.userId) {
        res.status(403).json({ message: "دسترسی محدود" });
        return;
      }

      let workflow;
      if (stage === 'investment') {
        workflow = await workflowService.markInvestmentFormsCompleted(requestId);
      } else if (stage === 'administrative') {
        workflow = await workflowService.markAdministrativeFormsCompleted(requestId);
      } else {
        res.status(400).json({ message: "مرحله نامعتبر است" });
        return;
      }

      res.json({
        success: true,
        workflow,
        message: "فرم‌ها با موفقیت ثبت شد"
      });
    } catch (error: any) {
      console.error("Mark forms completed error:", error);
      // IMPORTANT: Errors from validateFormsCompletion are OPERATIONAL (e.g., "missing forms").
      // They must be returned as 400 with the descriptive message — never swallowed as 500.
      const isOperationalError = error.message && (
        error.message.includes('لطفاً') ||
        error.message.includes('فرم') ||
        error.message.includes('Workflow not found') ||
        error.message.includes('مرحله')
      );
      const statusCode = isOperationalError ? 400 : 500;
      res.status(statusCode).json({ 
        message: error.message || "خطا در ثبت فرم‌ها",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export const servicesController = new ServicesController();
