import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { storage } from "../storage";
import { rasmioService } from "../services/rasmio";
import { smsService } from "../services/sms.service";
import { gapGPTService } from "../services/gap-gpt.service";
import { perplexityResearchService } from "../services/perplexity-research.service";
import { baleBotService } from "../services/bale-bot";
import Anthropic from "@anthropic-ai/sdk";

export const adminRoutes = Router();

// System Monitoring (Admin only)
adminRoutes.get("/monitoring", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getSystemMonitoring(req as any, res));

// User Management (Admin only)
adminRoutes.get("/users", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getAllUsers(req as any, res));
adminRoutes.post("/users", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.createUser(req as any, res));
adminRoutes.patch("/users/:id", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.updateUser(req as any, res));
adminRoutes.delete("/users/:id", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.deleteUser(req as any, res));

// Document Requirements Management (Admin only)
adminRoutes.get("/document-requirements", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  try {
    const requirements = await storage.getDocumentRequirements();
    res.json({
      success: true,
      requirements,
      count: requirements.length
    });
  } catch (error) {
    console.error("Error fetching document requirements for admin:", error);
    res.status(500).json({
      success: false,
      message: "خطا در دریافت لیست فرم‌ها"
    });
  }
});

// Company Management (Admin only) 
adminRoutes.delete("/companies/:id", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.deleteCompany(req as any, res));

// System Summary (Admin only)
adminRoutes.get("/summary", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getSystemSummary(req as any, res));
adminRoutes.get("/stats", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getSystemStats(req as any, res));

// Audit Logs (Admin only)
adminRoutes.get("/audit-logs", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.getAuditLogs(req as any, res));

// Emergency Phone Update (Admin only - secured)
adminRoutes.get("/update-phones", authMiddleware, requireRole(["admin"]) as any, (req, res) => adminController.updatePhoneNumbers(req as any, res));

// Test Services (Admin only)
adminRoutes.get("/test-services/rasmio", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  try {
    const healthCheck = await rasmioService.healthCheck();
    res.json(healthCheck);
  } catch (error) {
    res.json({ isOnline: false, error: error instanceof Error ? error.message : "Rasmio ping failed", responseTime: 0 });
  }
});

adminRoutes.get("/test-services/sms", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  const start = Date.now();
  try {
    const testPhone = "09123456789";
    const isValidPhone = smsService.validatePhoneNumber(testPhone);
    if (!isValidPhone) {
      throw new Error("SMS phone validation failed");
    }
    // Minimal ping logic: check validation and assume online if configured correctly.
    res.json({ isOnline: true, responseTime: Date.now() - start });
  } catch (error) {
    res.json({ isOnline: false, error: error instanceof Error ? error.message : "SMS test failed", responseTime: Date.now() - start });
  }
});

adminRoutes.get("/test-services/bale", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  const start = Date.now();
  try {
    // Ping Bale API by attempting to register the webhook or just fetch getMe (using existing method where possible)
    // For now we will try to set the webhook as a ping, or ping using empty message
    const webhookUrl = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/api/bale/webhook` : "https://portal.gilanfund.ir/api/bale/webhook";
    
    // timeout wrapper for fetch or any async task
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    const isOnline = await Promise.race([baleBotService.setWebhook(webhookUrl), timeoutPromise]);
    
    res.json({ isOnline: !!isOnline, responseTime: Date.now() - start, error: !isOnline ? "Bale returned false" : undefined });
  } catch (error) {
    res.json({ isOnline: false, error: error instanceof Error ? error.message : "Bale test failed", responseTime: Date.now() - start });
  }
});

adminRoutes.get("/test-services/ai/claude", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  const start = Date.now();
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }]
    }, { timeout: 5000 });
    res.json({ isOnline: true, responseTime: Date.now() - start });
  } catch (error) {
    res.json({ isOnline: false, error: error instanceof Error ? error.message : "Claude error", responseTime: Date.now() - start });
  }
});

adminRoutes.get("/test-services/ai/gapgpt", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  const start = Date.now();
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    await Promise.race([gapGPTService.generateResponse("ping"), timeoutPromise]);
    res.json({ isOnline: true, responseTime: Date.now() - start });
  } catch (error) {
    res.json({ isOnline: false, error: error instanceof Error ? error.message : "GapGPT error", responseTime: Date.now() - start });
  }
});

adminRoutes.get("/test-services/ai/perplexity", authMiddleware, requireRole(["admin"]) as any, async (req, res) => {
  const start = Date.now();
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    await Promise.race([perplexityResearchService.research("ping", { maxTokens: 1 }), timeoutPromise]);
    res.json({ isOnline: true, responseTime: Date.now() - start });
  } catch (error) {
    res.json({ isOnline: false, error: error instanceof Error ? error.message : "Perplexity error", responseTime: Date.now() - start });
  }
});