import { Router } from "express";
import { miscellaneousController } from "../controllers/miscellaneous.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

export const miscellaneousRoutes = Router();

// Public health check
miscellaneousRoutes.get("/health", (req, res) => miscellaneousController.getHealthStatus(req, res));

// System readiness check (public for load balancers)
miscellaneousRoutes.get("/readiness", (req, res) => miscellaneousController.getReadinessStatus(req, res));

// System information (admin only)
miscellaneousRoutes.get("/system-info", authMiddleware, requireRole(["admin"]) as any, (req, res) => miscellaneousController.getSystemInfo(req, res));

// API endpoints documentation (authenticated users)
miscellaneousRoutes.get("/endpoints", authMiddleware, (req, res) => miscellaneousController.getAPIEndpoints(req, res)); 