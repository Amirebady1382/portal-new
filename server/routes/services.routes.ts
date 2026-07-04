import { Router } from "express";
import { servicesController } from "../controllers/services.controller";
import { authMiddleware } from "../middleware/auth";

export const servicesRoutes = Router();

// Service statistics - باید قبل از parametric routes باشد
servicesRoutes.get("/statistics/overview", authMiddleware, (req, res) => servicesController.getServiceStatistics(req as any, res));

// Company Services Mapping routes - باید قبل از parametric routes باشد
servicesRoutes.post("/assign-to-company", authMiddleware, (req, res) => servicesController.assignServiceToCompany(req as any, res));

// Service Forms Mapping routes - باید قبل از parametric routes باشد
servicesRoutes.post("/:serviceId/forms", authMiddleware, (req, res) => servicesController.addFormToService(req as any, res));
servicesRoutes.get("/:serviceId/forms", authMiddleware, (req, res) => servicesController.getServiceForms(req as any, res));
servicesRoutes.delete("/forms/:mappingId", authMiddleware, (req, res) => servicesController.removeFormFromService(req as any, res));

// Service Companies routes - باید قبل از parametric routes باشد
servicesRoutes.get("/:serviceId/companies", authMiddleware, (req, res) => servicesController.getCompaniesWithService(req as any, res));

// Services management routes
servicesRoutes.get("/", authMiddleware, (req, res) => servicesController.getServices(req as any, res));
servicesRoutes.get("/:id", authMiddleware, (req, res) => servicesController.getService(req as any, res));
servicesRoutes.post("/", authMiddleware, (req, res) => servicesController.createService(req as any, res));
servicesRoutes.put("/:id", authMiddleware, (req, res) => servicesController.updateService(req as any, res));
servicesRoutes.delete("/:id", authMiddleware, (req, res) => servicesController.deleteService(req as any, res));

// Service Requests routes
export const serviceRequestsRoutes = Router();

// Workflow routes - باید قبل از parametric routes باشد
serviceRequestsRoutes.post("/:id/transfer-to-administrative", authMiddleware, (req, res) => servicesController.transferToAdministrative(req as any, res));
serviceRequestsRoutes.post("/:id/complete", authMiddleware, (req, res) => servicesController.completeServiceRequest(req as any, res));
serviceRequestsRoutes.post("/:id/mark-forms-completed", authMiddleware, (req, res) => servicesController.markFormsCompleted(req as any, res));
serviceRequestsRoutes.get("/:id/workflow-status", authMiddleware, (req, res) => servicesController.getWorkflowStatus(req as any, res));

// Service Requests routes
serviceRequestsRoutes.get("/", authMiddleware, (req, res) => servicesController.getServiceRequests(req as any, res));
serviceRequestsRoutes.post("/", authMiddleware, (req, res) => servicesController.createServiceRequest(req as any, res));
serviceRequestsRoutes.get("/:id", authMiddleware, (req, res) => servicesController.getServiceRequest(req as any, res));
serviceRequestsRoutes.put("/:id", authMiddleware, (req, res) => servicesController.updateServiceRequest(req as any, res));
serviceRequestsRoutes.get("/:id/history", authMiddleware, (req, res) => servicesController.getRequestStatusHistory(req as any, res));

// Company Services routes (under companies prefix)
export const companyServicesRoutes = Router();

// Company-specific routes
companyServicesRoutes.get("/:companyId/services", authMiddleware, (req, res) => servicesController.getCompanyServices(req as any, res));
companyServicesRoutes.delete("/:companyId/services/:serviceId", authMiddleware, (req, res) => servicesController.removeServiceFromCompany(req as any, res));
companyServicesRoutes.get("/:companyId/service-forms", authMiddleware, (req, res) => servicesController.getCompanyServiceForms(req as any, res));
