import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Express } from 'express';

/**
 * Rate limiting configuration for API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // افزایش برای جلوگیری از مشکل در development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      message: 'درخواست‌های شما از حد مجاز گذشته است. لطفا بعدا تلاش کنید.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000) // seconds
    });
  }
});

/**
 * Stricter rate limiting for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased limit for development
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      message: 'تلاش‌های زیادی برای ورود انجام شده است. لطفا 15 دقیقه صبر کنید.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
    });
  }
});

/**
 * Rate limiting for OTP/SMS endpoints
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // افزایش برای راحتی کاربر
  handler: (req, res) => {
    res.status(429).json({
      message: 'درخواست‌های ارسال کد تایید از حد مجاز گذشته است. لطفا 1 دقیقه صبر کنید.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }
});

/**
 * Rate limiting for file upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // افزایش به 50 آپلود در دقیقه برای کار روان
  message: JSON.stringify({ 
    message: 'تعداد آپلود فایل از حد مجاز گذشته است. لطفا کمی صبر کنید.',
    error: 'RATE_LIMIT_EXCEEDED'
  }),
  handler: (req, res) => {
    res.status(429).json({
      message: 'تعداد آپلود فایل از حد مجاز گذشته است. لطفا کمی صبر کنید.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }
});

/**
 * Setup security middleware
 */
export function setupSecurityMiddleware(app: Express): void {
  // Configure CORS for production
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://portal.gilanfund.ir', 'https://www.portal.gilanfund.ir', process.env.CLIENT_URL].filter(Boolean)
    : ['http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000', '*'];

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // Helmet helps secure Express apps by setting various HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Vite dev mode
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:'], // For Socket.io
        },
      },
      crossOriginEmbedderPolicy: false, // Required for some assets
    })
  );

  // Apply general API rate limiting
  app.use('/api/', apiLimiter);

  // Apply stricter rate limiting for auth endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/customer-login', authLimiter);

  // Apply OTP rate limiting
  app.use('/api/otp/', otpLimiter);
  app.use('/api/user/send-phone-otp', otpLimiter);

  // Apply upload rate limiting only to contract templates (documents handled in routes)
  app.use('/api/contract-templates/upload', uploadLimiter);

  console.log('✅ Security middleware initialized');
}

/**
 * Validate required environment variables
 */
export function validateEnvironmentVariables(): void {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const missing: string[] = [];

  for (const variable of required) {
    if (!process.env[variable]) {
      missing.push(variable);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please create a .env file with the required variables.'
    );
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn(
      '⚠️  WARNING: JWT_SECRET is too short. Please use at least 32 characters for production.'
    );
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    console.warn(
      `⚠️  WARNING: Invalid NODE_ENV value: ${nodeEnv}. Using 'development' as default.`
    );
  }

  console.log('✅ Environment variables validated');
}

