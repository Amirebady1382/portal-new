import { Router } from "express";
import { baleChatController } from "../controllers/bale-chat.controller";
import { authMiddleware, requireRole } from "../middleware/auth";

export const baleChatRoutes = Router();

// Webhook endpoint (no auth required)
baleChatRoutes.post("/webhook", (req, res) => baleChatController.handleWebhook(req, res));

// Departments routes
baleChatRoutes.get("/departments", authMiddleware, (req, res) => baleChatController.getDepartments(req as any, res));

// Bale conversation routes
baleChatRoutes.get("/bale/conversations", authMiddleware, (req, res) => baleChatController.getConversations(req as any, res));
baleChatRoutes.post("/bale/conversations", authMiddleware, (req, res) => baleChatController.createConversation(req as any, res));
baleChatRoutes.patch("/bale/conversations/:id", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => baleChatController.updateConversation(req as any, res));

// Bale message routes
baleChatRoutes.get("/bale/conversations/:id/messages", authMiddleware, (req, res) => baleChatController.getMessages(req as any, res));
baleChatRoutes.post("/bale/conversations/:id/messages", authMiddleware, (req, res) => baleChatController.sendMessage(req as any, res));

// Bale authentication (no auth middleware - external service)
baleChatRoutes.post("/bale/auth", (req, res) => baleChatController.authenticateStaff(req, res));

// Bale statistics
baleChatRoutes.get("/bale/stats", authMiddleware, requireRole(["admin", "ceo", "employee"]) as any, (req, res) => baleChatController.getStats(req as any, res)); 