import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { log } from "../vite";
import { storage } from "../storage";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

// Helper function to get JWT secret
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

interface SocketUser {
  userId: number;
  role: string;
  socketId: string;
}

export class SocketManager {
  private io: SocketServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * راه‌اندازی Socket.io server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupCleanupTasks();
    
    log("✅ Socket.io server راه‌اندازی شد", "socket");
  }

  /**
   * Middleware برای احراز هویت
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error("توکن احراز هویت یافت نشد"));
        }

        // بررسی توکن
        const jwtSecret = getJwtSecret();
        logger.debug(`Socket auth attempt for token validation`, "socket-auth");
        
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // ذخیره اطلاعات کاربر
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        
        log(`👤 کاربر ${decoded.userId} متصل شد`, "socket");
        next();
      } catch (error) {
        log(`❌ خطا در احراز هویت: ${error}`, "socket");
        next(new Error("احراز هویت ناموفق"));
      }
    });
  }

  /**
   * تنظیم event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket) => {
      const userId = socket.data.userId;
      const role = socket.data.role;

      // ذخیره کاربر متصل
      this.connectedUsers.set(socket.id, {
        userId,
        role,
        socketId: socket.id,
      });

      log(`🔌 کاربر ${userId} با نقش ${role} متصل شد`, "socket");

      // پیوستن به room های مناسب
      this.joinUserRooms(socket);

      // دریافت پیام جدید
      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // نشانگر تایپ
      socket.on("typing", (data) => {
        this.handleTyping(socket, data);
      });

      // توقف تایپ
      socket.on("stop_typing", (data) => {
        this.handleStopTyping(socket, data);
      });

      // قطع اتصال
      socket.on("disconnect", (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // خطا در اتصال
      socket.on("error", (error) => {
        log(`❌ خطای socket: ${error}`, "socket");
        this.handleDisconnect(socket, "error");
      });
    });
  }

  /**
   * پیوستن کاربر به room های مناسب
   */
  private async joinUserRooms(socket: any): Promise<void> {
    const userId = socket.data.userId;
    const role = socket.data.role;

    // Room شخصی کاربر
    socket.join(`user_${userId}`);

    // Room نقش
    socket.join(`role_${role}`);

    // برای کارمندان، پیوستن به room واحد
    if (role === "employee" || role === "admin") {
      const user = await storage.getUser(userId);
      if (user?.department) {
        socket.join(`department_${user.department}`);
      }
    }

    // برای مشتریان، پیوستن به room شرکت‌هایشان
    if (role === "customer") {
      const companies = await storage.getCompanies({ userId });
      for (const company of companies) {
        socket.join(`company_${company.id}`);
      }
    }
  }

  /**
   * ارسال پیام
   */
  private async handleSendMessage(socket: any, data: {
    conversationId: number;
    content: string;
    messageType?: string;
  }): Promise<void> {
    try {
      const userId = socket.data.userId;
      const { conversationId, content, messageType = "text" } = data;

      // ذخیره پیام در دیتابیس
      const message = await storage.createBaleMessage({
        conversationId,
        content,
        messageType,
        platform: "web",
        senderType: socket.data.role === "customer" ? "customer" : "staff",
        baleUserId: null, // این از web است نه بله
        isDelivered: false,
      });

      // ارسال پیام به همه کاربران مرتبط
      const conversation = await storage.getBaleConversation(conversationId);
      if (conversation) {
        // ارسال به room مکالمه
        this.io?.to(`conversation_${conversationId}`).emit("new_message", {
          message,
          conversation,
        });

        // ارسال به واحد مربوطه
        this.io?.to(`department_${conversation.departmentId}`).emit("new_message", {
          message,
          conversation,
        });
      }

      log(`💬 پیام جدید در مکالمه ${conversationId}`, "socket");
    } catch (error) {
      log(`❌ خطا در ارسال پیام: ${error}`, "socket");
      socket.emit("error", { message: "خطا در ارسال پیام" });
    }
  }

  /**
   * نشانگر تایپ
   */
  private handleTyping(socket: any, data: {
    conversationId: number;
  }): void {
    const userId = socket.data.userId;
    const { conversationId } = data;

    // ارسال به دیگران در مکالمه
    socket.to(`conversation_${conversationId}`).emit("user_typing", {
      userId,
      conversationId,
    });
  }

  /**
   * توقف تایپ
   */
  private handleStopTyping(socket: any, data: {
    conversationId: number;
  }): void {
    const userId = socket.data.userId;
    const { conversationId } = data;

    // ارسال به دیگران در مکالمه
    socket.to(`conversation_${conversationId}`).emit("user_stop_typing", {
      userId,
      conversationId,
    });
  }

  /**
   * قطع اتصال
   */
  private handleDisconnect(socket: any, reason?: string): void {
    const userId = socket.data.userId;
    
    // حذف از لیست کاربران متصل
    this.connectedUsers.delete(socket.id);
    
    // پاک کردن تمام listeners برای جلوگیری از memory leak
    socket.removeAllListeners();
    
    // خروج از تمام room ها
    socket.leaveAll();
    
    log(`🔌 کاربر ${userId} قطع شد (دلیل: ${reason || 'unknown'})`, "socket");

    // اطلاع‌رسانی به دیگران
    this.io?.emit("user_disconnected", { userId });
  }

  /**
   * ارسال پیام به کاربر خاص
   */
  sendToUser(userId: number, event: string, data: any): void {
    this.io?.to(`user_${userId}`).emit(event, data);
  }

  /**
   * ارسال پیام به یک واحد
   */
  sendToDepartment(department: string, event: string, data: any): void {
    this.io?.to(`department_${department}`).emit(event, data);
  }

  /**
   * ارسال پیام به یک شرکت
   */
  sendToCompany(companyId: number, event: string, data: any): void {
    this.io?.to(`company_${companyId}`).emit(event, data);
  }

  /**
   * ارسال پیام به یک مکالمه
   */
  sendToConversation(conversationId: number, event: string, data: any): void {
    this.io?.to(`conversation_${conversationId}`).emit(event, data);
  }

  /**
   * دریافت تعداد کاربران آنلاین
   */
  getOnlineUsers(): number {
    return this.connectedUsers.size;
  }

  /**
   * بررسی آنلاین بودن کاربر
   */
  isUserOnline(userId: number): boolean {
    const users = Array.from(this.connectedUsers.values());
    return users.some(user => user.userId === userId);
  }

  /**
   * راه‌اندازی وظایف پاکسازی
   */
  private setupCleanupTasks(): void {
    // پاکسازی اتصالات مرده هر 5 دقیقه
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadConnections();
    }, 5 * 60 * 1000);

    // heartbeat هر 30 ثانیه
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30 * 1000);
  }

  /**
   * پاکسازی اتصالات مرده
   */
  private cleanupDeadConnections(): void {
    const deadConnections: string[] = [];
    
    this.connectedUsers.forEach((user, socketId) => {
      const socket = this.io?.sockets.sockets.get(socketId);
      if (!socket || socket.disconnected) {
        deadConnections.push(socketId);
      }
    });

    deadConnections.forEach(socketId => {
      this.connectedUsers.delete(socketId);
      log(`🧹 پاکسازی اتصال مرده: ${socketId}`, "socket");
    });

    if (deadConnections.length > 0) {
      log(`🧹 ${deadConnections.length} اتصال مرده پاک شد`, "socket");
    }
  }

  /**
   * ارسال heartbeat
   */
  private sendHeartbeat(): void {
    if (this.io) {
      this.io.emit("heartbeat", { timestamp: Date.now() });
    }
  }

  /**
   * خاموش کردن و پاکسازی منابع
   */
  shutdown(): void {
    log("🔄 خاموش کردن Socket.io server...", "socket");

    // پاک کردن interval ها
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // قطع تمام اتصالات
    if (this.io) {
      this.io.sockets.sockets.forEach((socket) => {
        socket.removeAllListeners();
        socket.disconnect(true);
      });
      
      this.io.close();
      this.io = null;
    }

    // پاک کردن لیست کاربران
    this.connectedUsers.clear();

    log("✅ Socket.io server خاموش شد", "socket");
  }
}

// Export singleton instance
export const socketManager = new SocketManager(); 