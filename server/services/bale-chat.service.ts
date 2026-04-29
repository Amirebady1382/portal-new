import { storage } from "../storage";
import { baleBotService } from "./bale-bot";
import { socketManager } from "./socket-manager";

export interface BaleConversation {
  id: number;
  departmentId: number;
  customerName: string;
  customerPhone: string | null;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaleMessage {
  id: number;
  conversationId: number;
  content: string;
  messageType: string;
  platform: string;
  senderType: string;
  baleUserId: number | null;
  isDelivered: boolean;
  createdAt: string;
}

export interface CreateConversationData {
  departmentId: number;
  customerName: string;
  customerPhone?: string;
  title?: string;
  status?: string;
}

export interface CreateMessageData {
  conversationId: number;
  content: string;
  messageType?: string;
  platform?: string;
  senderType: string;
  baleUserId?: number | null;
  isDelivered?: boolean;
}

export interface BaleAuthData {
  chatId: string;
  phoneNumber: string;
}

export class BaleChatService {
  /**
   * Process Bale webhook
   */
  async processWebhook(webhookData: any): Promise<void> {
    console.log("📨 Bale webhook received:", JSON.stringify(webhookData, null, 2));
    
    // Delegate to baleBotService for processing
    await baleBotService.handleWebhook(webhookData);
  }

  /**
   * Get conversations based on user role and department
   */
  async getConversations(userId: number, userRole: string): Promise<any[]> {
    let conversations: any[] = [];
    
    if (userRole === "admin") {
      // Admin can see all conversations
      const departments = await storage.getDepartments();
      for (const dept of departments) {
        const deptConversations = await storage.getBaleConversationsByDepartment(dept.id);
        conversations.push(...deptConversations);
      }
    } else if (userRole === "employee") {
      // Employee can see their department conversations
      const user = await storage.getUser(userId);
      if (user?.department) {
        const dept = await storage.getDepartments();
        const userDept = dept.find(d => d.slug === user.department || d.name === user.department);
        if (userDept) {
          conversations = await storage.getBaleConversationsByDepartment(userDept.id);
        }
      }
    } else {
      // Customers have limited access
      throw new Error("دسترسی محدود");
    }
    
    // Add last message to each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await storage.getBaleMessagesByConversation(conv.id);
        const lastMessage = messages[messages.length - 1];
        return {
          ...conv,
          lastMessage,
          unreadCount: messages.filter(m => !m.isDelivered && m.senderType === "customer").length
        };
      })
    );
    
    return conversationsWithMessages;
  }

  /**
   * Create new Bale conversation
   */
  async createConversation(conversationData: CreateConversationData): Promise<any> {
    if (!conversationData.departmentId || !conversationData.customerName) {
      throw new Error("اطلاعات ناقص است");
    }
    
    const data = {
      ...conversationData,
      title: conversationData.title || `گفتگو با ${conversationData.customerName}`,
      status: conversationData.status || "active"
    };
    
    return await storage.createBaleConversation(data);
  }

  /**
   * Get single conversation by ID
   */
  async getConversation(conversationId: number): Promise<any> {
    return await storage.getBaleConversation(conversationId);
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId: number): Promise<any[]> {
    // Check if conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error("مکالمه یافت نشد");
    }
    
    const messages = await storage.getBaleMessagesByConversation(conversationId);
    
    // Mark messages as delivered
    const undeliveredMessages = messages.filter(m => !m.isDelivered && m.platform === "bale");
    for (const msg of undeliveredMessages) {
      await storage.updateBaleMessageDelivery(msg.id, true);
    }
    
    return messages;
  }

  /**
   * Send message in conversation
   */
  async sendMessage(
    conversationId: number, 
    messageData: CreateMessageData, 
    senderInfo: { userId: number; username: string; role: string }
  ): Promise<any> {
    if (!messageData.content || !messageData.content.trim()) {
      throw new Error("متن پیام الزامی است");
    }
    
    // Get conversation
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error("مکالمه یافت نشد");
    }
    
    // Create message
    const message = await storage.createBaleMessage({
      conversationId,
      content: messageData.content.trim(),
      messageType: messageData.messageType || "text",
      platform: messageData.platform || "web",
      senderType: senderInfo.role === "customer" ? "customer" : "staff",
      baleUserId: messageData.baleUserId || null,
      isDelivered: messageData.isDelivered || false,
    });
    
    // Emit real-time update via Socket.io
    socketManager.sendToConversation(conversationId, "new_message", {
      message,
      conversation,
    });
    
    // If staff is sending, notify department
    if (senderInfo.role !== "customer" && conversation.customerPhone) {
      try {
        await baleBotService.notifyDepartmentStaff(
          conversation.departmentId,
          `💬 پیام جدید از ${senderInfo.username} برای ${conversation.customerName}:\n\n${messageData.content}`
        );
      } catch (notifyError) {
        console.error("Error notifying department staff:", notifyError);
        // Don't throw error for notification failures
      }
    }
    
    return message;
  }

  /**
   * Update conversation status
   */
  async updateConversation(conversationId: number, updateData: { status?: string }): Promise<any> {
    if (updateData.status && !["active", "closed", "archived"].includes(updateData.status)) {
      throw new Error("وضعیت نامعتبر است");
    }
    
    const conversation = await storage.updateBaleConversation(conversationId, updateData);
    
    if (!conversation) {
      throw new Error("مکالمه یافت نشد");
    }
    
    return conversation;
  }

  /**
   * Authenticate staff via Bale
   */
  async authenticateStaff(authData: BaleAuthData): Promise<any> {
    const { chatId, phoneNumber } = authData;
    
    if (!chatId || !phoneNumber) {
      throw new Error("اطلاعات ناقص است");
    }
    
    // Verify phone number is authorized
    const authorizedPhones = await storage.getAuthorizedPhoneByNumber(phoneNumber);
    const authorizedPhone = Array.isArray(authorizedPhones) ? authorizedPhones[0] : authorizedPhones;
    
    if (!authorizedPhone || !authorizedPhone.isActive) {
      throw new Error("شماره تلفن مجاز نیست");
    }
    
    // Update or create Bale user
    let baleUser = await storage.getBaleUserByChatId(chatId);
    
    if (baleUser) {
      await storage.updateBaleUser(baleUser.id, {
        phoneNumber,
        departmentId: authorizedPhone.departmentId,
        isAuthenticated: true,
      });
    } else {
      baleUser = await storage.createBaleUser({
        baleUserId: chatId,
        baleChatId: chatId,
        phoneNumber,
        departmentId: authorizedPhone.departmentId,
        isAuthenticated: true,
      });
    }
    
    const department = await storage.getDepartment(authorizedPhone.departmentId);
    
    return { 
      success: true, 
      message: "احراز هویت موفق",
      department,
      baleUser
    };
  }

  /**
   * Get departments list
   */
  async getDepartments(): Promise<any[]> {
    return await storage.getDepartments();
  }

  /**
   * Validate user access to conversation
   */
  async validateConversationAccess(userId: number, userRole: string, conversationId: number): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      return false;
    }
    
    if (userRole === "admin") {
      return true;
    }
    
    if (userRole === "employee") {
      const user = await storage.getUser(userId);
      if (user?.department) {
        const departments = await storage.getDepartments();
        const userDept = departments.find(d => d.slug === user.department || d.name === user.department);
        return userDept?.id === conversation.departmentId;
      }
    }
    
    return false;
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(departmentId?: number): Promise<any> {
    const departments = departmentId ? [{ id: departmentId }] : await storage.getDepartments();
    
    let totalConversations = 0;
    let activeConversations = 0;
    let totalMessages = 0;
    
    for (const dept of departments) {
      const conversations = await storage.getBaleConversationsByDepartment(dept.id);
      totalConversations += conversations.length;
      activeConversations += conversations.filter(c => c.status === "active").length;
      
      for (const conv of conversations) {
        const messages = await storage.getBaleMessagesByConversation(conv.id);
        totalMessages += messages.length;
      }
    }
    
    return {
      totalConversations,
      activeConversations,
      closedConversations: totalConversations - activeConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
    };
  }
}

export const baleChatService = new BaleChatService(); 