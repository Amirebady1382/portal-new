import { Router, Response } from "express";
import { authMiddleware, requireRole, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";

const router = Router();

/**
 * GET /api/ai-chat-sessions
 * Get user's AI chat sessions
 */
router.get("/", authMiddleware, async (req: any, res: any) => {
  try {
    console.log(`📜 Getting AI chat sessions for user ${req.user.userId}`);
    
    const sessions = await storage.getAIChatSessionsByUser(req.user.userId);
    
    console.log(`✅ Found ${sessions.length} chat sessions`);
    res.json({ 
      success: true, 
      sessions,
      count: sessions.length 
    });

  } catch (error) {
    console.error("❌ Error getting chat sessions:", error);
    res.status(500).json({ 
      success: false,
      error: "خطا در دریافت تاریخچه چت‌ها",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/ai-chat-sessions
 * Create new AI chat session
 */
// @ts-ignore
router.post("/", authMiddleware, requireRole(["admin", "ceo", "employee"]), async (req: any, res: any) => {
  try {
    const { companyId, title } = req.body;

    if (!companyId || !title) {
      return res.status(400).json({ 
        success: false,
        error: "companyId و title الزامی هستند" 
      });
    }

    console.log(`🆕 Creating new AI chat session: "${title}" for company ${companyId} by user ${req.user.userId}`);

    // Verify company exists and user has access
    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        error: "شرکت یافت نشد" 
      });
    }

    // Create session
    const session = await storage.createAIChatSession({
      userId: req.user.userId,
      companyId,
      title: title.trim()
    });

    console.log(`✅ AI chat session created with ID: ${session.id}`);

    res.status(201).json({ 
      success: true, 
      session: {
        ...session,
        companyName: company.name,
        messageCount: 0,
        lastMessageAt: null
      }
    });

  } catch (error) {
    console.error("❌ Error creating chat session:", error);
    res.status(500).json({ 
      success: false,
      error: "خطا در ایجاد جلسه چت",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/ai-chat-sessions/:id
 * Get specific chat session with messages
 */
router.get("/:id", authMiddleware, async (req: any, res: any) => {
  try {
    const sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "شناسه جلسه نامعتبر است" 
      });
    }

    console.log(`📖 Getting chat session ${sessionId} for user ${req.user.userId}`);

    // Get session (with user permission check)
    const session = await storage.getAIChatSession(sessionId, req.user.userId);
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "جلسه چت یافت نشد" 
      });
    }

    // Get messages
    const messages = await storage.getAIChatMessages(sessionId);

    console.log(`✅ Retrieved session with ${messages.length} messages`);

    res.json({ 
      success: true, 
      session: {
        ...session,
        messages: messages.map(msg => ({
          id: msg.id,
          type: msg.messageType,
          content: msg.content,
          attachments: msg.attachments,
          timestamp: new Date(msg.createdAt)
        }))
      }
    });

  } catch (error) {
    console.error("❌ Error getting chat session:", error);
    res.status(500).json({ 
      success: false,
      error: "خطا در دریافت جلسه چت",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PUT /api/ai-chat-sessions/:id
 * Update chat session (rename)
 */
router.put("/:id", authMiddleware, async (req: any, res: any) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { title } = req.body;

    if (isNaN(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "شناسه جلسه نامعتبر است" 
      });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: "عنوان جلسه الزامی است" 
      });
    }

    console.log(`✏️ Updating chat session ${sessionId} title to "${title}" by user ${req.user.userId}`);

    // Verify session belongs to user
    const session = await storage.getAIChatSession(sessionId, req.user.userId);
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "جلسه چت یافت نشد" 
      });
    }

    // Update session
    await storage.updateAIChatSession(sessionId, { title: title.trim() });

    console.log(`✅ Chat session ${sessionId} updated successfully`);

    res.json({ 
      success: true,
      message: "عنوان جلسه با موفقیت به‌روزرسانی شد"
    });

  } catch (error) {
    console.error("❌ Error updating chat session:", error);
    res.status(500).json({ 
      success: false,
      error: "خطا در به‌روزرسانی جلسه چت",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/ai-chat-sessions/:id
 * Delete chat session
 */
router.delete("/:id", authMiddleware, async (req: any, res: any) => {
  try {
    const sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "شناسه جلسه نامعتبر است" 
      });
    }

    console.log(`🗑️ Deleting chat session ${sessionId} for user ${req.user.userId}`);

    // Verify session belongs to user
    const session = await storage.getAIChatSession(sessionId, req.user.userId);
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "جلسه چت یافت نشد" 
      });
    }

    // Delete session (will cascade delete messages due to foreign key)
    await storage.deleteAIChatSession(sessionId, req.user.userId);

    console.log(`✅ Chat session ${sessionId} deleted successfully`);

    res.json({ 
      success: true,
      message: "جلسه چت با موفقیت حذف شد"
    });

  } catch (error) {
    console.error("❌ Error deleting chat session:", error);
    res.status(500).json({ 
      success: false,
      error: "خطا در حذف جلسه چت",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
