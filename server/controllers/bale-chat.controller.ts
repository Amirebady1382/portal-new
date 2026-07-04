import type { Request, Response } from "express";
import { baleChatService } from "../services/bale-chat.service";
import type { AuthRequest } from "../middleware/auth";

export class BaleChatController {
  /**
   * POST /api/webhooks/bale - Handle Bale webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      await baleChatService.processWebhook(req.body);
      res.json({ ok: true });
    } catch (error) {
      console.error("Bale webhook error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  }

  /**
   * GET /api/bale/conversations - Get Bale conversations
   */
  async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversations = await baleChatService.getConversations(req.user.userId, req.user.role);
      res.json(conversations);
    } catch (error) {
      if (error instanceof Error && error.message === "دسترسی محدود") {
        res.status(403).json({ message: error.message });
      } else {
        console.error("Get Bale conversations error:", error);
        res.status(500).json({ message: "خطا در دریافت مکالمات" });
      }
    }
  }

  /**
   * POST /api/bale/conversations - Create new Bale conversation
   */
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { departmentId, customerName, customerPhone, title } = req.body;
      
      const conversation = await baleChatService.createConversation({
        departmentId,
        customerName,
        customerPhone,
        title
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof Error && error.message === "اطلاعات ناقص است") {
        res.status(400).json({ message: error.message });
      } else {
        console.error("Create Bale conversation error:", error);
        res.status(500).json({ message: "خطا در ایجاد مکالمه" });
      }
    }
  }

  /**
   * GET /api/bale/conversations/:id/messages - Get messages for a Bale conversation
   */
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = parseInt(req.params.id);
      
      // Check access permissions
      const hasAccess = await baleChatService.validateConversationAccess(
        req.user.userId, 
        req.user.role, 
        conversationId
      );
      
      if (!hasAccess) {
        res.status(403).json({ message: "دسترسی غیرمجاز" });
        return;
      }
      
      const messages = await baleChatService.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      if (error instanceof Error && error.message === "مکالمه یافت نشد") {
        res.status(404).json({ message: error.message });
      } else {
        console.error("Get Bale messages error:", error);
        res.status(500).json({ message: "خطا در دریافت پیام‌ها" });
      }
    }
  }

  /**
   * POST /api/bale/conversations/:id/messages - Send message in Bale conversation
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, messageType = "text" } = req.body;
      
      // Check access permissions
      const hasAccess = await baleChatService.validateConversationAccess(
        req.user.userId, 
        req.user.role, 
        conversationId
      );
      
      if (!hasAccess) {
        res.status(403).json({ message: "دسترسی غیرمجاز" });
        return;
      }
      
      const message = await baleChatService.sendMessage(
        conversationId,
        {
          content,
          messageType,
          senderType: req.user.role === "customer" ? "customer" : "staff"
        },
        {
          userId: req.user.userId,
          username: req.user.username || 'ناشناس',
          role: req.user.role
        }
      );
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "متن پیام الزامی است") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "مکالمه یافت نشد") {
          res.status(404).json({ message: error.message });
          return;
        }
      }
      
      console.error("Send Bale message error:", error);
      res.status(500).json({ message: "خطا در ارسال پیام" });
    }
  }

  /**
   * PATCH /api/bale/conversations/:id - Update Bale conversation status
   */
  async updateConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const conversationId = parseInt(req.params.id);
      const { status } = req.body;
      
      const conversation = await baleChatService.updateConversation(conversationId, { status });
      res.json(conversation);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "وضعیت نامعتبر است") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "مکالمه یافت نشد") {
          res.status(404).json({ message: error.message });
          return;
        }
      }
      
      console.error("Update Bale conversation error:", error);
      res.status(500).json({ message: "خطا در به‌روزرسانی مکالمه" });
    }
  }

  /**
   * POST /api/bale/auth - Staff authentication via Bale
   */
  async authenticateStaff(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, phoneNumber } = req.body;
      
      const result = await baleChatService.authenticateStaff({ chatId, phoneNumber });
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "اطلاعات ناقص است") {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message === "شماره تلفن مجاز نیست") {
          res.status(403).json({ message: error.message });
          return;
        }
      }
      
      console.error("Bale auth error:", error);
      res.status(500).json({ message: "خطا در احراز هویت" });
    }
  }

  /**
   * GET /api/departments - Get departments list
   */
  async getDepartments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const departments = await baleChatService.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ message: "خطا در دریافت لیست واحدها" });
    }
  }

  /**
   * GET /api/bale/stats - Get Bale conversation statistics
   */
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
      
      // If employee, restrict to their department
      let finalDepartmentId = departmentId;
      if (req.user.role === "employee") {
        const user = await baleChatService.getConversations(req.user.userId, req.user.role);
        // For now, allow getting stats without department restriction for employees
        // This could be improved with proper department validation
      }
      
      const stats = await baleChatService.getConversationStats(finalDepartmentId);
      res.json(stats);
    } catch (error) {
      console.error("Get Bale stats error:", error);
      res.status(500).json({ message: "خطا در دریافت آمار" });
    }
  }
}

export const baleChatController = new BaleChatController(); 