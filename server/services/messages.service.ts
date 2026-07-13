import { storage } from "../storage";
import Anthropic from '@anthropic-ai/sdk';
import { logger } from "../utils/logger";
import { gapGPTService } from "./gap-gpt.service";

// Lazy initialization
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): any {
  const disableDirect = process.env.DISABLE_DIRECT_CLAUDE === 'true';
  if (disableDirect) {
    return {
      messages: {
        create: async (options: any) => {
          logger.info("🤖 Routing direct Claude call to GapGPT because DISABLE_DIRECT_CLAUDE is active", "messages-ai");
          const prompt = options.messages?.[0]?.content || "";
          const systemPrompt = options.system || undefined;
          const content = await gapGPTService.generateResponse(prompt, systemPrompt);
          return {
            content: [{ type: "text", text: content }]
          };
        }
      }
    };
  }

  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ 
      apiKey
    });
  }
  return anthropicClient;
}

export interface Conversation {
  id: number;
  companyId: number;
  employeeId: number | null;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationData {
  companyId: number;
  employeeId?: number | null;
  subject: string;
  status?: string;
  priority?: string;
  category?: string;
  department?: string;
}

export interface CreateMessageData {
  conversationId: number;
  senderId: number;
  content: string;
  messageType?: string;
}

export class MessagesService {
  /**
   * Get conversations for a user based on their role
   */
  async getConversations(userId: number, userRole: string): Promise<any[]> {
    return await storage.getConversations(userId, userRole);
  }

  /**
   * Get single conversation by ID
   */
  async getConversation(conversationId: number): Promise<any> {
    return await storage.getConversation(conversationId);
  }

  /**
   * Create new conversation
   */
  async createConversation(conversationData: CreateConversationData): Promise<any> {
    const data = {
      ...conversationData,
      status: conversationData.status || "active"
    };
    
    return await storage.createConversation(data);
  }

  /**
   * Get messages for a conversation
   */
  async getMessagesByConversation(conversationId: number): Promise<any[]> {
    const messages = await storage.getMessagesByConversation(conversationId);
    
    // Convert snake_case to camelCase for timestamps
    return messages.map((m: any) => ({
      ...m,
      createdAt: m.created_at,
      senderId: m.sender_id,
    }));
  }

  /**
   * Create new message
   */
  async createMessage(messageData: CreateMessageData): Promise<any> {
    const data = {
      ...messageData,
      messageType: messageData.messageType || "text"
    };
    
    return await storage.createMessage(data);
  }

  /**
   * Create AI auto-response for customer messages
   */
  async createAIResponse(conversationId: number, customerContent: string): Promise<any> {
    try {
      logger.info("تولید پاسخ خودکار AI برای مشتری", 'ai-chat');
      
      const aiPrompt = `پرسش مشتری:\n${customerContent}\n\nپاسخی مودبانه، کوتاه (حداکثر 3 جمله) و قابل فهم ارائه بده. در انتها اضافه کن: \n«می‌توانید برای پاسخ دقیق‌تر منتظر کارشناسان ما باشید.»`;

              logger.debug("ارسال درخواست به Anthropic API", 'ai-chat');
      const aiRes = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-20250514", // 🚀 استفاده از قوی‌ترین مدل Claude 4
        max_tokens: 200,
        messages: [{ role: "user", content: aiPrompt }],
      });

              logger.debug("پاسخ از Anthropic API دریافت شد", 'ai-chat');
      
      let aiText = "";
      try {
        const firstBlock = aiRes.content?.[0];
        if (firstBlock && firstBlock.type === "text") {
          aiText = String(firstBlock.text || "").trim();
        }
      } catch (parseError) {
                  logger.error("خطا در parse کردن پاسخ AI", 'ai-chat', parseError instanceof Error ? parseError : new Error(String(parseError)));
      }

      if (!aiText) {
                  logger.warn("پاسخ AI خالی بود، استفاده از پاسخ پیش‌فرض", 'ai-chat');
        aiText = "درخواست شما ثبت شد. می‌توانید منتظر پاسخ دقیق‌تر کارشناسان ما باشید.";
      }

              logger.debug(`ذخیره پاسخ AI در دیتابیس: ${aiText.substring(0, 50)}...`, 'ai-chat');
      const aiMessage = await this.createMessage({
        conversationId,
        senderId: 1, // admin/system user (سیستم)
        content: aiText,
        messageType: "system",
      });
      
              logger.info("پاسخ AI با موفقیت ذخیره شد", 'ai-chat');
      return aiMessage;
    } catch (aiErr) {
              logger.error("خطا در تولید پاسخ AI", 'ai-chat', aiErr instanceof Error ? aiErr : new Error(String(aiErr)));
      
      // در صورت خطا، پاسخ پیش‌فرض ارسال کنیم
      try {
        const fallbackMessage = await this.createMessage({
          conversationId,
          senderId: 1,
          content: "درخواست شما ثبت شد. می‌توانید منتظر پاسخ دقیق‌تر کارشناسان ما باشید.",
          messageType: "system",
        });
        logger.info("پاسخ پیش‌فرض ذخیره شد", 'ai-chat');
        return fallbackMessage;
      } catch (fallbackErr) {
        logger.error("خطا در ذخیره پاسخ پیش‌فرض", 'ai-chat', fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
        return null;
      }
    }
  }

  /**
   * Check if user has access to a conversation
   */
  async userHasAccessToConversation(userId: number, conversationId: number, userRole: string): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      return false;
    }
    
    // Admin and employees have access to all conversations
    if (userRole === "admin" || userRole === "employee") {
      return true;
    }
    
    // Customers can only access conversations of their companies
    if (userRole === "customer") {
      const companyId = (conversation as any).companyId || (conversation as any).company_id;
      return await storage.userHasAccessToCompany(userId, companyId);
    }
    
    return false;
  }

  /**
   * Update conversation status
   */
  async updateConversation(conversationId: number, updateData: { status?: string }): Promise<any> {
    // This would need to be implemented in storage if not already available
    // For now, returning null to indicate it needs implementation
    console.log("Update conversation not yet implemented in storage");
    return null;
  }
}

export const messagesService = new MessagesService(); 