/**
 * Rate Limiting Middleware
 * محدودسازی تعداد درخواست‌ها برای جلوگیری از سوء استفاده
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // بازه زمانی به میلی‌ثانیه
  maxRequests: number; // حداکثر تعداد درخواست
  message?: string; // پیام خطا
  skipSuccessfulRequests?: boolean; // skip درخواست‌های موفق
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  
  /**
   * پاکسازی خودکار ورودی‌های منقضی شده هر 10 دقیقه
   */
  constructor() {
    setInterval(() => this.cleanupExpiredEntries(), 600000); // 10 minutes
  }

  /**
   * ایجاد middleware با تنظیمات مشخص
   */
  create(config: RateLimitConfig) {
    const {
      windowMs,
      maxRequests,
      message = 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.',
      skipSuccessfulRequests = false
    } = config;

    return (req: Request, res: Response, next: NextFunction) => {
      // شناسایی کاربر (ترکیبی از IP و user ID)
      const identifier = this.getIdentifier(req);
      const now = Date.now();
      
      // بررسی یا ایجاد ورودی
      if (!this.store[identifier] || now > this.store[identifier].resetTime) {
        this.store[identifier] = {
          count: 0,
          resetTime: now + windowMs
        };
      }

      const entry = this.store[identifier];
      
      // بررسی محدودیت
      if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
        res.setHeader('Retry-After', retryAfter.toString());
        
        console.warn(`🚫 Rate limit exceeded for ${identifier}: ${entry.count}/${maxRequests}`);
        
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter,
          limit: maxRequests,
          windowMs
        });
      }

      // افزایش شمارنده
      entry.count++;
      
      // تنظیم headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

      // کاهش شمارنده در صورت موفقیت (اختیاری)
      if (skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400) {
            entry.count = Math.max(0, entry.count - 1);
          }
        });
      }

      next();
    };
  }

  /**
   * شناسایی یکتای کاربر
   */
  private getIdentifier(req: Request): string {
    const authReq = req as any;
    
    // اگر کاربر احراز هویت شده، از userId استفاده می‌کنیم
    if (authReq.user?.userId) {
      return `user_${authReq.user.userId}`;
    }
    
    // در غیر این صورت از IP استفاده می‌کنیم
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
               req.socket.remoteAddress ||
               'unknown';
    
    return `ip_${ip}`;
  }

  /**
   * پاکسازی ورودی‌های منقضی شده
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🗑️ Rate limiter: cleaned ${removedCount} expired entries`);
    }
  }

  /**
   * پاکسازی کامل store
   */
  clearAll(): void {
    this.store = {};
    console.log('🗑️ Rate limiter store cleared');
  }

  /**
   * دریافت آمار
   */
  getStats(): { totalEntries: number; entries: RateLimitStore } {
    return {
      totalEntries: Object.keys(this.store).length,
      entries: { ...this.store }
    };
  }
}

// ایجاد instance یکتا
const rateLimiter = new RateLimiter();

// پیش‌فرض‌های رایج
export const strictRateLimit = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: 'تعداد درخواست‌های شما بیش از حد است. لطفاً 1 دقیقه صبر کنید.'
});

export const moderateRateLimit = rateLimiter.create({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'تعداد درخواست‌های شما بیش از حد است. لطفاً 15 دقیقه صبر کنید.'
});

export const contractGenerationRateLimit = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // فقط 3 قرارداد در دقیقه
  message: 'شما نمی‌توانید بیش از 3 قرارداد در دقیقه تولید کنید. لطفاً کمی صبر کنید.'
});

export const aiAnalysisRateLimit = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 2, // فقط 2 تحلیل AI در دقیقه (گران است)
  message: 'تحلیل هوش مصنوعی محدود است. لطفاً 1 دقیقه صبر کنید.'
});

export const variableExtractionRateLimit = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'تعداد درخواست‌های استخراج متغیر بیش از حد است.'
});

export { rateLimiter };

