import { Router } from 'express';
import { otpService } from '../services/otp.service';
import { z } from 'zod';
import { log } from "../vite";

const router = Router();

// Schema validation
const sendOTPSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر'),
  purpose: z.enum(['login', 'register', 'reset'])
});

const verifyOTPSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر'),
  code: z.string().length(6, 'کد باید 6 رقم باشد'),
  purpose: z.enum(['login', 'register', 'reset'])
});

// ارسال OTP
router.post('/send', async (req, res) => {
  try {
    log(`📱 درخواست ارسال OTP از IP: ${req.ip}`, "otp-api");
    
    const { phone, purpose } = sendOTPSchema.parse(req.body);
    
    const result = await otpService.sendOTP(phone, purpose);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        expiresIn: result.expiresIn
      });
    } else {
      res.status(429).json({
        success: false,
        message: result.message,
        remainingSeconds: result.remainingSeconds
      });
    }
  } catch (error: any) {
    log(`❌ خطا در API ارسال OTP: ${error.message}`, "otp-api");
    res.status(400).json({
      success: false,
      message: error.message || 'خطا در ارسال کد تایید'
    });
  }
});

// تایید OTP  
router.post('/verify', async (req, res) => {
  try {
    log(`🔍 درخواست تایید OTP از IP: ${req.ip}`, "otp-api");
    
    const { phone, code, purpose } = verifyOTPSchema.parse(req.body);
    
    const result = await otpService.verifyOTP(phone, code, purpose);
    
    res.json({
      success: true,
      message: 'کد تایید صحیح است'
    });
  } catch (error: any) {
    log(`❌ خطا در API تایید OTP: ${error.message}`, "otp-api");
    res.status(400).json({
      success: false,
      message: error.message || 'خطا در تایید کد'
    });
  }
});

// پاک‌سازی کدهای منقضی (endpoint اداری)
router.delete('/cleanup', async (req, res) => {
  try {
    log(`🧹 درخواست پاک‌سازی کدهای منقضی از IP: ${req.ip}`, "otp-api");
    
    await otpService.cleanupExpiredOTPs();
    
    res.json({
      success: true,
      message: 'کدهای منقضی شده پاک شد'
    });
  } catch (error: any) {
    log(`❌ خطا در API پاک‌سازی: ${error.message}`, "otp-api");
    res.status(500).json({
      success: false,
      message: 'خطا در پاک‌سازی کدهای منقضی'
    });
  }
});

export default router; 