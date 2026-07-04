import type { Request, Response } from "express";
import { messagesService } from "../services/messages.service";
import { storage } from "../storage";
import type { AuthRequest } from "../middleware/auth";

export class MessagesController {
  /**
   * GET /api/conversations - Get conversations for the authenticated user
   */
  async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversations = await messagesService.getConversations(req.user.userId, req.user.role);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/companies/:companyId/conversations - Get conversations for a company
   */
  async getConversationsByCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = parseInt(req.params.companyId);
      const conversations = await storage.getConversationsByCompanyId(companyId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations by company error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * GET /api/conversations/:id/messages - Get messages for a conversation
   */
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = parseInt(req.params.id);
      
      console.log(`🔍 درخواست پیام‌ها برای مکالمه ${conversationId} از کاربر ${req.user.userId} (${req.user.role})`);
      
      // Check access permissions
      const hasAccess = await messagesService.userHasAccessToConversation(
        req.user.userId, 
        conversationId, 
        req.user.role
      );
      
      if (!hasAccess) {
        console.log(`❌ کاربر ${req.user.userId} دسترسی به مکالمه ${conversationId} ندارد`);
        res.status(403).json({ message: "دسترسی غیرمجاز - تنها مالک شرکت می‌تواند پیام‌ها را مشاهده کند" });
        return;
      }
      
      console.log(`✅ دسترسی تأیید شد، دریافت پیام‌ها...`);
      const messages = await messagesService.getMessagesByConversation(conversationId);
      
      console.log(`📨 ${messages.length} پیام برای مکالمه ${conversationId} برگردانده شد`);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/conversations - Create new conversation
   */
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        title = "تیکت جدید", 
        subject = "", 
        participantId = null, 
        companyId,
        priority = "medium",
        category = "general", 
        department = null
      } = req.body;

      let finalCompanyId = companyId;

      // اگر companyId ارسال نشده و کاربر مشتری است، اولین شرکت مرتبط با او را بردار
      if (!finalCompanyId && req.user.role === "customer") {
        const companies = await storage.getCompanies({ userId: req.user.userId });
        if (companies.length === 0) {
          res.status(400).json({ message: "شرکت مرتبطی برای کاربر یافت نشد" });
          return;
        }
        finalCompanyId = companies[0].id;
      }

      if (!finalCompanyId) {
        res.status(400).json({ message: "companyId الزامی است" });
        return;
      }

      const conversation = await messagesService.createConversation({
        companyId: finalCompanyId,
        employeeId: participantId,
        subject: subject || title,
        status: "active",
        priority,
        category,
        department,
      });

      res.status(201).json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * POST /api/conversations/:id/messages - Send message in a conversation
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, messageType = "text" } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ message: "متن پیام الزامی است" });
        return;
      }

      // Check access permissions
      const hasAccess = await messagesService.userHasAccessToConversation(
        req.user.userId, 
        conversationId, 
        req.user.role
      );
      
      if (!hasAccess) {
        res.status(403).json({ message: "دسترسی غیرمجاز" });
        return;
      }

      const message = await messagesService.createMessage({
        conversationId,
        senderId: req.user.userId,
        content: content.trim(),
        messageType,
      });

      // اگر فرستنده مشتری بود، پاسخ خودکار AI تولید شود
      if (req.user.role === "customer") {
        try {
          await messagesService.createAIResponse(conversationId, content.trim());
        } catch (aiError) {
          console.error("AI response error (non-critical):", aiError);
          // ادامه می‌دهیم حتی اگر AI response خطا داشت
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * PATCH /api/conversations/:id - Update conversation (close ticket, etc.)
   */
  async updateConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = parseInt(req.params.id);
      const updateData = req.body;

      // Check access permissions
      const hasAccess = await messagesService.userHasAccessToConversation(
        req.user.userId, 
        conversationId, 
        req.user.role
      );
      
      if (!hasAccess) {
        res.status(403).json({ message: "دسترسی غیرمجاز" });
        return;
      }

      const conversation = await messagesService.updateConversation(conversationId, updateData);

      if (!conversation) {
        res.status(404).json({ message: "مکالمه یافت نشد یا به‌روزرسانی امکان‌پذیر نیست" });
        return;
      }

      // Log status change if applicable
      if (updateData.status) {
        await storage.createAuditLog({
          userId: req.user.userId,
          action: "update_conversation",
          resource: "conversation",
          resourceId: conversationId,
          details: JSON.stringify({ newStatus: updateData.status }),
          ipAddress: req.ip || null,
          userAgent: req.get("User-Agent") || null,
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }
}

export const messagesController = new MessagesController(); 