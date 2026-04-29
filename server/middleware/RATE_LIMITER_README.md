# Rate Limiter Middleware

محدودسازی تعداد درخواست‌ها برای جلوگیری از سوء استفاده و حمله DoS

## 📖 معرفی

این middleware به صورت in-memory، تعداد درخواست‌های کاربران را در بازه‌های زمانی مشخص محدود می‌کند.

## 🎯 ویژگی‌ها

- ✅ In-memory storage (سریع و کارآمد)
- ✅ شناسایی کاربر بر اساس User ID یا IP
- ✅ TTL و Auto-cleanup
- ✅ Headers استاندارد HTTP
- ✅ پیام‌های خطای فارسی
- ✅ آماده برای Production

## 🚀 استفاده

### Import

```typescript
import { 
  contractGenerationRateLimit,
  aiAnalysisRateLimit,
  variableExtractionRateLimit,
  strictRateLimit,
  moderateRateLimit,
  rateLimiter // برای تنظیمات سفارشی
} from '../middleware/rate-limiter';
```

### استفاده در Routes

```typescript
// استفاده از rate limiter از پیش تعریف شده
router.post('/generate', 
  authMiddleware, 
  contractGenerationRateLimit, 
  handler
);

// ایجاد rate limiter سفارشی
const customRateLimit = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'پیام خطای سفارشی',
  skipSuccessfulRequests: false
});

router.post('/api/custom', authMiddleware, customRateLimit, handler);
```

## ⚙️ تنظیمات از پیش تعریف شده

### 1. Contract Generation Rate Limit
```typescript
windowMs: 60000 (1 دقیقه)
maxRequests: 3
استفاده: محدود کردن تولید قرارداد به 3 درخواست در دقیقه
```

### 2. AI Analysis Rate Limit
```typescript
windowMs: 60000 (1 دقیقه)
maxRequests: 2
استفاده: محدود کردن تحلیل AI (هزینه‌بر) به 2 درخواست در دقیقه
```

### 3. Variable Extraction Rate Limit
```typescript
windowMs: 60000 (1 دقیقه)
maxRequests: 10
استفاده: محدود کردن استخراج متغیر به 10 درخواست در دقیقه
```

### 4. Strict Rate Limit
```typescript
windowMs: 60000 (1 دقیقه)
maxRequests: 5
استفاده: محدودیت سخت‌گیرانه برای عملیات حساس
```

### 5. Moderate Rate Limit
```typescript
windowMs: 900000 (15 دقیقه)
maxRequests: 100
استفاده: محدودیت عمومی برای APIهای معمولی
```

## 📊 Response Headers

هنگام رسیدن به محدودیت، headers زیر ارسال می‌شود:

```
X-RateLimit-Limit: 3           // حداکثر درخواست مجاز
X-RateLimit-Remaining: 0       // درخواست باقی‌مانده
X-RateLimit-Reset: 1697299200  // زمان reset (timestamp)
Retry-After: 45                // چند ثانیه باید صبر کرد
```

## 🔴 Error Response

```json
{
  "success": false,
  "error": "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  "retryAfter": 45,
  "limit": 3,
  "windowMs": 60000
}
```

HTTP Status Code: `429 Too Many Requests`

## 🛠️ API های مدیریتی

### دریافت آمار
```typescript
const stats = rateLimiter.getStats();
console.log(stats);
// { totalEntries: 15, entries: {...} }
```

### پاکسازی کامل
```typescript
rateLimiter.clearAll();
```

## 🔍 نحوه شناسایی کاربر

1. **کاربران احراز هویت شده:** بر اساس `userId`
2. **کاربران مهمان:** بر اساس `IP address`

```typescript
// Authenticated user
identifier = "user_123"

// Guest
identifier = "ip_192.168.1.1"
```

## ⚡ Performance

- Auto-cleanup هر 10 دقیقه
- O(1) lookup time
- حافظه کم (تنها active sessions ذخیره می‌شوند)

## ⚠️ محدودیت‌ها

- **In-memory only:** در صورت restart سرور، داده‌ها از بین می‌روند
- **Single instance:** برای cluster یا load-balanced apps، نیاز به Redis دارید

## 🔄 Migration به Redis (آینده)

برای scaling افقی:

```typescript
// TODO: Implement Redis-based rate limiter
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Use redis.incr() with TTL
```

## 📝 Best Practices

1. ✅ همیشه rate limiter را **بعد از auth middleware** قرار دهید
2. ✅ برای APIهای هزینه‌بر (AI, generation) محدودیت سخت‌تری بگذارید
3. ✅ پیام‌های خطا را واضح و کاربرپسند بنویسید
4. ✅ در development، limits را کمی سست‌تر کنید
5. ✅ Monitoring کنید که آیا کاربران واقعی block می‌شوند یا نه

## 🐛 Troubleshooting

### مشکل: کاربران واقعی block می‌شوند
**راه‌حل:** limits را افزایش دهید یا از `skipSuccessfulRequests: true` استفاده کنید

### مشکل: حافظه زیاد مصرف می‌شود
**راه‌حل:** `MAX_CACHE_SIZE` را کاهش دهید یا interval cleanup را کم کنید

### مشکل: Rate limit برای همه کاربران یکسان است
**راه‌حل:** rate limiter های مختلفی برای roles مختلف ایجاد کنید

## 📚 مثال‌های بیشتر

### Rate Limit با تنظیمات پیشرفته
```typescript
const advancedRateLimit = rateLimiter.create({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000,
  message: 'شما به محدودیت ساعتی رسیده‌اید',
  skipSuccessfulRequests: true // فقط failed requests را count کن
});
```

### Rate Limit مختلف برای Roles
```typescript
const adminRateLimit = rateLimiter.create({
  maxRequests: 1000, // Admins have higher limit
  windowMs: 60000
});

const customerRateLimit = rateLimiter.create({
  maxRequests: 50,
  windowMs: 60000
});

// در route
router.post('/action', authMiddleware, (req, res, next) => {
  if (req.user.role === 'admin') {
    return adminRateLimit(req, res, next);
  }
  return customerRateLimit(req, res, next);
}, handler);
```

## 🎓 مفاهیم

### Window-based vs Token Bucket
این implementation از **Sliding Window** استفاده می‌کند:
- هر کاربر یک window زمانی دارد
- در هر window، تعداد محدودی request مجاز است
- بعد از اتمام window، counter reset می‌شود

### Alternative: Token Bucket
برای rate limiting پیچیده‌تر می‌توان از Token Bucket استفاده کرد که burst traffic را بهتر handle می‌کند.

---

**نویسنده:** AI Assistant  
**تاریخ:** 2025-10-14  
**نسخه:** 1.0.0

