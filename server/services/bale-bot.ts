import { storage } from "../storage";
import { log } from "../vite";
import type { BaleUser, BaleConversation, BaleMessage } from "@/shared/schema";

interface BaleUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      file_size: number;
      width: number;
      height: number;
    }>;
    document?: {
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
  };
}

export class BaleBotService {
  private readonly botToken: string;
  private readonly apiBase: string;

  constructor() {
    this.botToken = process.env.BALE_BOT_TOKEN || "";
    this.apiBase = process.env.BALE_API_BASE || "https://tapi.bale.ai/bot";
    
    if (!this.botToken) {
      log("⚠️ BALE_BOT_TOKEN محیطی تنظیم نشده است", "bale-bot");
    }
  }

  /**
   * ارسال پیام به کاربر در بله
   */
  async sendMessage(chatId: string, text: string, options?: {
    replyToMessageId?: number;
    parseMode?: "Markdown" | "HTML";
  }): Promise<boolean> {
    try {
      const url = `${this.apiBase}${this.botToken}/sendMessage`;
      
      const body: any = {
        chat_id: chatId,
        text: text,
      };

      if (options?.replyToMessageId) {
        body.reply_to_message_id = options.replyToMessageId;
      }

      if (options?.parseMode) {
        body.parse_mode = options.parseMode;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.ok) {
        log(`❌ خطا در ارسال پیام: ${result.description}`, "bale-bot");
        return false;
      }

      log(`✅ پیام به ${chatId} ارسال شد`, "bale-bot");
      return true;
    } catch (error) {
      log(`❌ خطا در ارسال پیام: ${error}`, "bale-bot");
      return false;
    }
  }

  /**
   * دریافت فایل از بله
   */
  async getFile(fileId: string): Promise<{ filePath: string; fileUrl: string } | null> {
    try {
      const url = `${this.apiBase}${this.botToken}/getFile?file_id=${fileId}`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (!result.ok) {
        log(`❌ خطا در دریافت فایل: ${result.description}`, "bale-bot");
        return null;
      }

      const filePath = result.result.file_path;
      const fileUrl = `https://tapi.bale.ai/file/bot${this.botToken}/${filePath}`;

      return { filePath, fileUrl };
    } catch (error) {
      log(`❌ خطا در دریافت فایل: ${error}`, "bale-bot");
      return null;
    }
  }

  /**
   * تنظیم Webhook
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const url = `${this.apiBase}${this.botToken}/setWebhook`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        log(`❌ خطا در تنظیم webhook: ${result.description}`, "bale-bot");
        return false;
      }

      log(`✅ Webhook تنظیم شد: ${webhookUrl}`, "bale-bot");
      return true;
    } catch (error) {
      log(`❌ خطا در تنظیم webhook: ${error}`, "bale-bot");
      return false;
    }
  }

  /**
   * پردازش آپدیت دریافتی از بله
   */
  async handleWebhook(update: BaleUpdate): Promise<void> {
    try {
      log(`📨 آپدیت جدید دریافت شد: ${update.update_id}`, "bale-bot");

      if (!update.message) {
        log("آپدیت بدون پیام", "bale-bot");
        return;
      }

      const message = update.message;
      const chatId = message.chat.id.toString();
      const userId = message.from.id.toString();
      const text = message.text || "";

      // بررسی کاربر در دیتابیس
      let baleUser = await storage.getBaleUserByChatId(chatId);

      // کاربر جدید
      if (!baleUser) {
        log(`👤 کاربر جدید: ${chatId}`, "bale-bot");
        
        baleUser = await storage.createBaleUser({
          baleUserId: userId,
          baleChatId: chatId,
          firstName: message.from.first_name,
          lastName: message.from.last_name,
          username: message.from.username,
          isAuthenticated: false,
        });

        // پیام خوش‌آمدگویی
        await this.sendMessage(chatId, 
          "سلام! به سامانه پشتیبانی صندوق پژوهش و فناوری غیردولتی گیلان خوش آمدید.\n\n" +
          "برای دسترسی به سیستم، لطفاً شماره تلفن همراه خود را ارسال کنید:\n" +
          "مثال: 09123456789"
        );
        return;
      }

      // بررسی احراز هویت
      if (!baleUser.isAuthenticated) {
        await this.handleAuthentication(baleUser, text, chatId);
        return;
      }

      // پردازش دستورات
      if (text.startsWith("/")) {
        await this.handleCommand(baleUser, text, chatId);
        return;
      }

      // پردازش پیام‌های معمولی (پاسخ به مشتری)
      await this.handleStaffReply(baleUser, text, chatId);

    } catch (error) {
      log(`❌ خطا در پردازش webhook: ${error}`, "bale-bot");
    }
  }

  /**
   * احراز هویت کارمند
   */
  private async handleAuthentication(baleUser: BaleUser, text: string, chatId: string): Promise<void> {
    // حذف فاصله‌ها و کاراکترهای اضافی
    const phoneNumber = text.replace(/\s/g, "").replace(/[^\d]/g, "");

    // بررسی فرمت شماره تلفن
    if (!phoneNumber.match(/^09\d{9}$/)) {
      await this.sendMessage(chatId, 
        "❌ فرمت شماره تلفن صحیح نیست.\n" +
        "لطفاً شماره را به صورت 09123456789 ارسال کنید."
      );
      return;
    }

    // بررسی شماره در لیست مجاز
    const authorizedPhones = await storage.getAuthorizedPhoneByNumber(phoneNumber);
    const authorizedPhone = Array.isArray(authorizedPhones) ? authorizedPhones[0] : authorizedPhones;

    if (!authorizedPhone || !authorizedPhone.isActive) {
      await this.sendMessage(chatId, 
        "❌ شماره تلفن شما در لیست کارمندان مجاز نیست.\n" +
        "در صورت نیاز با مدیر سیستم تماس بگیرید."
      );
      return;
    }

    // به‌روزرسانی اطلاعات کاربر
    await storage.updateBaleUser(baleUser.id, {
      phoneNumber: phoneNumber,
      departmentId: authorizedPhone.departmentId,
      isAuthenticated: true,
    });

    const department = await storage.getDepartment(authorizedPhone.departmentId);

    await this.sendMessage(chatId, 
      `✅ احراز هویت موفق!\n\n` +
      `شما به عنوان کارمند واحد ${department?.name} شناسایی شدید.\n\n` +
      `دستورات قابل استفاده:\n` +
      `/status - مشاهده پیام‌های جدید\n` +
      `/help - راهنمای کامل`
    );
  }

  /**
   * پردازش دستورات
   */
  private async handleCommand(baleUser: BaleUser, command: string, chatId: string): Promise<void> {
    const cmd = command.split(" ")[0].toLowerCase();

    switch (cmd) {
      case "/start":
        await this.sendMessage(chatId, 
          "سلام! شما قبلاً احراز هویت شده‌اید.\n" +
          "برای مشاهده دستورات از /help استفاده کنید."
        );
        break;

      case "/status":
        await this.handleStatusCommand(baleUser, chatId);
        break;

      case "/help":
        await this.sendMessage(chatId, 
          "📚 راهنمای دستورات:\n\n" +
          "/status - نمایش تعداد پیام‌های جدید\n" +
          "/help - نمایش این راهنما\n\n" +
          "برای پاسخ به پیام‌ها:\n" +
          "پیام خود را مستقیماً ارسال کنید و سیستم از شما خواهد پرسید که به کدام مکالمه پاسخ دهید."
        );
        break;

      default:
        await this.sendMessage(chatId, 
          "❌ دستور نامعتبر!\n" +
          "برای مشاهده دستورات از /help استفاده کنید."
        );
    }
  }

  /**
   * نمایش وضعیت پیام‌های جدید
   */
  private async handleStatusCommand(baleUser: BaleUser, chatId: string): Promise<void> {
    if (!baleUser.departmentId) return;

    const conversations = await storage.getBaleConversationsByDepartment(baleUser.departmentId);
    const activeCount = conversations.filter(c => c.status === "active").length;

    if (activeCount === 0) {
      await this.sendMessage(chatId, "✨ هیچ پیام جدیدی وجود ندارد.");
      return;
    }

    let statusText = `📊 وضعیت پیام‌ها:\n\n`;
    statusText += `📥 ${activeCount} مکالمه فعال\n\n`;

    // نمایش ۵ مکالمه اخیر
    const recentConversations = conversations.slice(0, 5);
    
    for (const conv of recentConversations) {
      const messages = await storage.getBaleMessagesByConversation(conv.id);
      const unreadCount = messages.filter(m => !m.isDelivered && m.senderType === "customer").length;
      
      statusText += `🔸 ${conv.customerName || "ناشناس"} - ${unreadCount} پیام جدید\n`;
    }

    await this.sendMessage(chatId, statusText);
  }

  /**
   * پردازش پاسخ کارمند به مشتری
   * 
   * NOTE: این قابلیت به منطق پیچیده‌تر برای انتخاب مکالمه و context management نیاز دارد.
   * برای پیاده‌سازی کامل، نیاز به:
   * 1. سیستم انتخاب مکالمه فعال
   * 2. Context management برای پیگیری گفتگو
   * 3. Notification به مشتری از طریق Bale
   * فعلاً کاربران از پنل وب استفاده می‌کنند.
   */
  private async handleStaffReply(baleUser: BaleUser, text: string, chatId: string): Promise<void> {
    await this.sendMessage(chatId, 
      "⚠️ این قابلیت در حال توسعه است.\n" +
      "فعلاً از پنل وب برای پاسخ‌دهی استفاده کنید."
    );
  }

  /**
   * ارسال نوتیفیکیشن به کارمندان یک واحد
   */
  async notifyDepartmentStaff(departmentId: number, message: string): Promise<void> {
    try {
      // پیدا کردن تمام کارمندان احراز هویت شده واحد
      const authorizedPhones = await storage.getAuthorizedPhones();
      const departmentPhones = authorizedPhones
        .filter(ap => ap.departmentId === departmentId && ap.isActive)
        .map(ap => ap.phoneNumber);

      for (const phoneNumber of departmentPhones) {
        const baleUser = await storage.getBaleUserByPhoneNumber(phoneNumber);
        
        if (baleUser && baleUser.isAuthenticated) {
          await this.sendMessage(baleUser.baleChatId, message);
        }
      }
    } catch (error) {
      log(`❌ خطا در ارسال نوتیفیکیشن: ${error}`, "bale-bot");
    }
  }

  /**
   * ارسال هشدار سیستمی به یک کاربر خاص
   */
  async sendSystemAlert(userId: number, message: string): Promise<boolean> {
    try {
      const baleUser = await storage.getBaleUserByUserId(userId);
      if (!baleUser || !baleUser.baleChatId) {
        log(`⚠️ کاربر با آیدی ${userId} حساب بله متصل ندارد`, "bale-bot");
        return false;
      }
      return await this.sendMessage(baleUser.baleChatId, `🚨 پیام سیستمی:\n\n${message}`);
    } catch (error) {
      log(`❌ خطا در ارسال پیام سیستمی به کاربر ${userId}: ${error}`, "bale-bot");
      return false;
    }
  }

  /**
   * Register webhook on startup automatically
   */
  async setWebhookOnStartup(): Promise<void> {
    const webhookUrl = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/api/bale/webhook` : 'https://portal.gilanfund.ir/api/bale/webhook';
    log(`🔄 تلاش برای ثبت Webhook بله: ${webhookUrl}`, "bale-bot");
    await this.setWebhook(webhookUrl);
  }

}

// Export singleton instance
export const baleBotService = new BaleBotService(); 