import { db } from "../db";
import { log } from "../vite";
import { smsService } from "./sms.service";
import { baleBotService } from "./bale-bot";
import { storage } from "../storage";

interface OTPSendResult {
  success: boolean;
  message: string;
  expiresIn?: number;
  remainingSeconds?: number;
}

export class OtpService {
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly COOLDOWN_MINUTES = 2;
  private readonly RESEND_COOLDOWN_SECONDS = 60;
  
  async sendOTP(phone: string, purpose: 'login' | 'register' | 'reset'): Promise<OTPSendResult> {
    try {
      log(`📱 درخواست ارسال OTP برای ${phone} - هدف: ${purpose}`, "otp");

      if (!smsService.validatePhoneNumber(phone)) {
        throw new Error('شماره موبایل نامعتبر است');
      }

      // Use BEGIN/COMMIT to prevent race conditions
      await db.execute("BEGIN TRANSACTION");
      
      try {
        const cooldownTime = new Date(Date.now() - this.RESEND_COOLDOWN_SECONDS * 1000).toISOString();
        const recentOTP = await db.execute(
          `SELECT * FROM otp_codes WHERE phone = ? AND purpose = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
          [phone, purpose, cooldownTime]
        );

        if (recentOTP.rows.length > 0) {
          const lastOTP = recentOTP.rows[0] as any;
          const createdAt = new Date(lastOTP.created_at).getTime();
          const remainingSeconds = Math.ceil((createdAt + this.RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
          
          if (remainingSeconds > 0) {
            log(`⏳ Cooldown فعال است برای ${phone}. ${remainingSeconds} ثانیه باقی مانده`, "otp");
            return {
              success: false,
              message: `لطفا ${remainingSeconds} ثانیه دیگر امتحان کنید`,
              remainingSeconds
            };
          }
        }

        // Delete old unused OTPs for this phone and purpose
        await db.execute(
          `DELETE FROM otp_codes WHERE phone = ? AND purpose = ? AND is_used = false`,
          [phone, purpose]
        );
        log(`🗑️ کدهای قبلی برای ${phone} پاک شد`, "otp");

        const code = smsService.generateOTPCode();
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

        log(`🔐 کد OTP جدید: ${code} - انقضا: ${expiresAt}`, "otp");

        // Insert new OTP
        await db.execute(
          `INSERT INTO otp_codes (phone, code, purpose, attempts, is_used, expires_at, created_at) VALUES (?, ?, ?, 0, false, ?, NOW())`,
          [phone, code, purpose, expiresAt]
        );

        // Send SMS outside transaction to avoid holding locks too long
        try {
          // Attempt to send via SMS
          let smsSuccess = false;
          try {
            await smsService.sendOTP(phone, code);
            smsSuccess = true;
          } catch (smsError: any) {
            log(`🚨 خطای جدی در سرویس SMS: ${smsError.message}`, "otp");
          }

          // Attempt to send via Bale Bot
          let baleSuccess = false;
          try {
            const user = await storage.getUserByUsername(phone);
            if (user) {
              const baleUser = await storage.getBaleUserByUserId(user.id);
              if (baleUser && baleUser.baleChatId) {
                baleSuccess = await baleBotService.sendMessage(
                  baleUser.baleChatId,
                  `کد تایید شما برای ${purpose === 'login' ? 'ورود' : purpose === 'register' ? 'ثبت‌نام' : 'بازیابی رمز عبور'}: ${code}`
                );
              }
            } else {
              // If we don't have user by username (phone), check bale users by phone directly
              const baleUser = await storage.getBaleUserByPhoneNumber(phone);
              if (baleUser && baleUser.baleChatId) {
                baleSuccess = await baleBotService.sendMessage(
                  baleUser.baleChatId,
                  `کد تایید شما: ${code}`
                );
              }
            }
          } catch (baleError: any) {
             log(`⚠️ خطا در ارسال OTP از طریق بله: ${baleError.message}`, "otp");
          }

          if (!smsSuccess && !baleSuccess) {
            // Delete the OTP record if both failed
            await db.execute(
              `DELETE FROM otp_codes WHERE phone = ? AND code = ? AND purpose = ?`,
              [phone, code, purpose]
            );
            throw new Error("سرویس پیامک و بله در حال حاضر در دسترس نیستند");
          }

        } catch (error: any) {
           if (error.message.includes('در دسترس نیستند')) {
               throw error;
           }
           log(`🚨 خطای غیرمنتظره در ارسال: ${error.message}`, "otp");
        }

        await db.execute("COMMIT");
        
        return {
          success: true,
          message: 'کد تایید با موفقیت به شماره موبایل شما ارسال شد',
          expiresIn: this.OTP_EXPIRY_MINUTES * 60
        };
      } catch (transactionError) {
        await db.execute("ROLLBACK");
        throw transactionError;
      }
    } catch (error: any) {
      log(`❌ خطا در ارسال OTP: ${error.message}`, "otp");
      throw new Error(error.message || 'خطا در ارسال کد تایید');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phone: string, code: string, purpose: 'login' | 'register' | 'reset'): Promise<{ success: boolean; message?: string }> {
    try {
      // Use BEGIN/COMMIT to prevent race conditions during verification
      await db.execute("BEGIN TRANSACTION");
      
      try {
        // Find valid OTP with row-level locking
        const result = await db.execute(`
          SELECT * FROM otp_codes 
          WHERE phone = ? AND purpose = ? AND code = ? AND is_used = false 
          ORDER BY created_at DESC LIMIT 1
        `, [phone, purpose, code]);
        
        if (result.rows.length === 0) {
          throw new Error('کد تایید نامعتبر است');
        }
        
        const otp = result.rows[0] as any;
        const now = new Date();
        const expiresAt = new Date(otp.expires_at);
        
        if (now > expiresAt) {
          throw new Error('کد تایید منقضی شده است');
        }
        
        // Check if already used (double-check within transaction)
        if (otp.is_used) {
          throw new Error('کد تایید قبلاً استفاده شده است');
        }
        
        // Update attempts and mark as used atomically
        const updateResult = await db.execute(`
          UPDATE otp_codes 
          SET is_used = true, attempts = attempts + 1 
          WHERE id = ? AND is_used = false
        `, [otp.id]);
        
        // Verify the update was successful (no other process used the OTP)
        if (updateResult.rowsAffected === 0) {
          throw new Error('کد تایید قبلاً استفاده شده است');
        }
        
        log(`✅ OTP verified for ${phone} for ${purpose}`, "otp");
        
        await db.execute("COMMIT");
        return { success: true };
      } catch (transactionError) {
        await db.execute("ROLLBACK");
        throw transactionError;
      }
      
    } catch (error: any) {
      log(`❌ Error verifying OTP: ${error.message}`, "otp");
      throw new Error(error.message || 'خطا در تایید کد');
    }
  }

  async cleanupExpiredOTPs() {
    try {
      const now = new Date().toISOString();
      log(`🧹 شروع پاکسازی کدهای OTP منقضی شده`, "otp");

      const result = await db.execute({
        sql: `DELETE FROM otp_codes WHERE expires_at < ? OR is_used = ?`,
        args: [now, true],
      });

      if (result.rowsAffected > 0) {
        log(`🗑️ ${result.rowsAffected} کد OTP پاکسازی شد`, "otp");
      }
    } catch (error: any) {
      log(`❌ خطا در پاکسازی کدهای OTP: ${error.message}`, "otp");
    }
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Mock sending SMS
   */
  private async sendSMS(phone: string, code: string): Promise<void> {
    log(`📱 SMS to ${phone}: کد تایید شما: ${code}`, "sms");
    // This is a mock. In production, use a real SMS service.
  }
}

export const otpService = new OtpService();

// Setup cleanup interval (every 10 minutes)
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 10 * 60 * 1000); 