/**
 * Validation Middleware
 * اعتبارسنجی جامع برای تمام ورودی‌های API
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Generic validation middleware factory
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'خطای اعتبارسنجی ورودی',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'خطای اعتبارسنجی پارامترها',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Validate params
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'خطای اعتبارسنجی مسیر',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

// ====================================
// 📋 COMMON VALIDATION SCHEMAS
// ====================================

/**
 * ID Validation
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'شناسه باید عدد باشد').transform(Number)
});

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * Company ID validation
 */
export const companyIdSchema = z.object({
  companyId: z.number().int().positive('شناسه شرکت باید عدد مثبت باشد')
});

/**
 * Template ID validation
 */
export const templateIdSchema = z.object({
  templateId: z.number().int().positive('شناسه قالب باید عدد مثبت باشد')
});

// ====================================
// 📄 CONTRACT VALIDATION SCHEMAS
// ====================================

/**
 * Contract Generation Request
 */
export const contractGenerationSchema = z.object({
  templateId: z.number().int().positive('شناسه قالب الزامی است'),
  companyId: z.number().int().positive('شناسه شرکت الزامی است'),
  contractNumber: z.string().min(1, 'شماره قرارداد الزامی است').max(50),
  customFields: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional()
});

/**
 * Contract Form Data
 */
export const contractFormDataSchema = z.object({
  companyId: z.number().int().positive(),
  templateId: z.number().int().positive(),
  formType: z.string().min(1).max(50),
  formData: z.record(z.any())
});

/**
 * Contract Template Creation
 */
export const createContractTemplateSchema = z.object({
  name: z.string().min(1, 'نام قالب الزامی است').max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  variables: z.array(z.string()).optional()
});

// ====================================
// 📊 INVESTMENT REPORT VALIDATION SCHEMAS
// ====================================

/**
 * Investment Report Generation
 */
export const reportGenerationSchema = z.object({
  templateId: z.number().int().positive('شناسه قالب الزامی است'),
  companyId: z.number().int().positive('شناسه شرکت الزامی است'),
  reportNumber: z.string().max(50).optional(),
  reportType: z.enum(['evaluation', 'progress', 'final', 'risk_assessment']).default('evaluation'),
  customFields: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  includeCharts: z.boolean().optional().default(true)
});

/**
 * Report Form Data
 */
export const reportFormDataSchema = z.object({
  companyId: z.number().int().positive(),
  templateId: z.number().int().positive(),
  formData: z.record(z.any())
});

/**
 * Report Status Update
 */
export const reportStatusSchema = z.object({
  status: z.enum(['draft', 'finalized', 'approved', 'rejected']),
  notes: z.string().max(1000).optional()
});

/**
 * Create Report Template
 */
export const createReportTemplateSchema = z.object({
  name: z.string().min(1, 'نام قالب الزامی است').max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).default('general'),
  variables: z.array(z.string()).optional(),
  sections: z.array(z.any()).optional(),
  chartConfigs: z.any().optional()
});

// ====================================
// 👤 USER VALIDATION SCHEMAS
// ====================================

/**
 * User Registration
 */
export const userRegistrationSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد').max(50),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد').max(100),
  fullName: z.string().min(1, 'نام کامل الزامی است').max(255),
  role: z.enum(['admin', 'employee', 'customer']),
  email: z.string().email('ایمیل نامعتبر است').optional(),
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است').optional(),
  department: z.string().max(50).optional()
});

/**
 * User Login
 */
export const userLoginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است')
});

/**
 * Update Profile
 */
export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^09\d{9}$/).optional()
});

// ====================================
// 🏢 COMPANY VALIDATION SCHEMAS
// ====================================

/**
 * Company Creation
 */
export const createCompanySchema = z.object({
  name: z.string().min(1, 'نام شرکت الزامی است').max(255),
  nationalId: z.string().length(11, 'شناسه ملی باید ۱۱ رقم باشد'),
  type: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['pending', 'active', 'suspended', 'rejected']).default('pending'),
  establishedYear: z.number().int().min(1300).max(1500).optional(),
  employeeCount: z.number().int().positive().optional(),
  capital: z.string().max(50).optional()
});

/**
 * Company Update
 */
export const updateCompanySchema = createCompanySchema.partial();

// ====================================
// 📁 DOCUMENT VALIDATION SCHEMAS
// ====================================

/**
 * Document Upload Metadata
 */
export const documentMetadataSchema = z.object({
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  companyId: z.number().int().positive().optional()
});

/**
 * Document Requirement
 */
export const documentRequirementSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است').max(255),
  description: z.string().max(1000).optional(),
  department: z.string().max(50).optional(),
  fields: z.array(z.any()),
  accessType: z.enum(['all', 'specific']).default('all'),
  companyIds: z.array(z.number().int()).optional()
});

// ====================================
// 🔐 SECURITY HELPERS
// ====================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potential XSS characters
    .substring(0, 1000); // Limit length
}

/**
 * Validate Iranian National ID
 */
export function validateNationalId(nationalId: string): boolean {
  if (!/^\d{10,11}$/.test(nationalId)) return false;
  
  // Add checksum validation for Iranian national IDs if needed
  return true;
}

/**
 * Validate Iranian Mobile Number
 */
export function validateIranianMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(mobile);
}

/**
 * Validate Persian characters
 */
export function hasPersianCharacters(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// ====================================
// 🚫 RATE LIMITING HELPERS
// ====================================

/**
 * Request rate limiter storage
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiter
 */
export function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

/**
 * Clean up old rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean every minute

// ====================================
// 📊 FILE VALIDATION
// ====================================

/**
 * Allowed MIME types
 */
export const ALLOWED_MIME_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  templates: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

/**
 * Max file sizes (in bytes)
 */
export const MAX_FILE_SIZES = {
  document: 50 * 1024 * 1024, // 50MB
  image: 5 * 1024 * 1024, // 5MB
  template: 10 * 1024 * 1024 // 10MB
};

/**
 * Validate uploaded file
 */
export function validateFile(
  file: Express.Multer.File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'فایل آپلود نشده است' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return { 
      valid: false, 
      error: `حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد` 
    };
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: 'فرمت فایل مجاز نیست' 
    };
  }
  
  // Check file extension
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  const allowedExtensions = allowedTypes.map(type => {
    const mapping: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    return mapping[type];
  }).filter(Boolean);
  
  if (ext && !allowedExtensions.includes(ext)) {
    return { 
      valid: false, 
      error: 'پسوند فایل مجاز نیست' 
    };
  }
  
  return { valid: true };
}

/**
 * File upload validator middleware
 */
export function validateFileUpload(allowedTypes: string[], maxSize: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل آپلود نشده است'
      });
    }
    
    const validation = validateFile(req.file, allowedTypes, maxSize);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    next();
  };
}
