import { Router } from "express";
import { messagesController } from "../controllers/messages.controller";
import { authMiddleware } from "../middleware/auth";

export const messagesRoutes = Router();

// Conversations routes
messagesRoutes.get("/", authMiddleware, (req, res) => messagesController.getConversations(req as any, res));
messagesRoutes.post("/", authMiddleware, (req, res) => messagesController.createConversation(req as any, res));
messagesRoutes.patch("/:id", authMiddleware, (req, res) => messagesController.updateConversation(req as any, res));

// Messages routes
messagesRoutes.get("/:id/messages", authMiddleware, (req, res) => messagesController.getMessages(req as any, res));
messagesRoutes.post("/:id/messages", authMiddleware, (req, res) => messagesController.sendMessage(req as any, res)); 