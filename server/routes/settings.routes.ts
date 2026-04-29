import { Router } from "express";
import { settingsController } from "../controllers/settings.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

// Verified Secure: All routes require admin role
export const settingsRoutes = Router();

// Get all settings grouped by category
settingsRoutes.get("/", authMiddleware, requireRole(["admin"]) as any, (req, res) => settingsController.getAllSettings(req as any, res));

// Get settings by category
settingsRoutes.get("/category/:category", authMiddleware, requireRole(["admin"]) as any, (req, res) => settingsController.getSettingsByCategory(req as any, res));

// Update multiple settings
settingsRoutes.put("/", authMiddleware, requireRole(["admin"]) as any, (req, res) => settingsController.updateSettings(req as any, res));

// Update single setting
settingsRoutes.put("/:key", authMiddleware, requireRole(["admin"]) as any, (req, res) => settingsController.updateSetting(req as any, res));

// Create new setting
settingsRoutes.post("/", authMiddleware, requireRole(["admin"]) as any, (req, res) => settingsController.createSetting(req as any, res)); 