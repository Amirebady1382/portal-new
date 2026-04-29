import type { Request, Response, NextFunction } from "express";
import { logger, createRequestContext, ErrorCategory, type RequestContext, storage } from "../utils/logger";

// Extend Express Request to include context
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

// Request logging middleware
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const context = createRequestContext(req);
  req.context = context;
  
  // Use AsyncLocalStorage to propagate context
  storage.run(context, () => {
    const startTime = Date.now();
    
    // Log incoming request
    logger.info(
      `درخواست دریافت شد: ${req.method} ${req.path}`,
      'request',
      {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: context.ip,
        userAgent: context.userAgent,
        bodySize: req.get('content-length') || 0
      }
    );

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'info';

      logger[level](
        `پاسخ ارسال شد: ${req.method} ${req.path} - ${res.statusCode}`,
        'response',
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          responseSize: res.get('content-length') || 0
        }
      );
    });

    next();
  });
}

// Enhanced error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    isOperational: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.category = category;
    this.isOperational = isOperational;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class AuthenticationError extends AppError {
  constructor(message: string = "احراز هویت ناموفق", metadata?: Record<string, any>) {
    super(message, 401, ErrorCategory.AUTHENTICATION, true, metadata);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "دسترسی مجاز نیست", metadata?: Record<string, any>) {
    super(message, 403, ErrorCategory.AUTHENTICATION, true, metadata);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "داده‌های ورودی نامعتبر", metadata?: Record<string, any>) {
    super(message, 400, ErrorCategory.VALIDATION, true, metadata);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "خطا در عملیات دیتابیس", originalError?: Error, metadata?: Record<string, any>) {
    super(message, 500, ErrorCategory.DATABASE, true, metadata);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class FileSystemError extends AppError {
  constructor(message: string = "خطا در عملیات فایل", metadata?: Record<string, any>) {
    super(message, 500, ErrorCategory.FILE_SYSTEM, true, metadata);
  }
}

export class ExternalAPIError extends AppError {
  constructor(
    service: string,
    message: string,
    statusCode: number = 502,
    metadata?: Record<string, any>
  ) {
    super(`خطا در ارتباط با ${service}: ${message}`, statusCode, ErrorCategory.EXTERNAL_API, true, metadata);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, ErrorCategory.BUSINESS_LOGIC, true, metadata);
  }
}

// Error response generator
export function createErrorResponse(error: AppError | Error, hideDetails: boolean = process.env.NODE_ENV === 'production') {
  if (error instanceof AppError) {
    return {
      success: false,
      message: error.message,
      category: error.category,
      ...(error.metadata && !hideDetails && { details: error.metadata }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  }

  // For non-AppError instances
  return {
    success: false,
    message: hideDetails ? "خطای غیرمنتظره رخ داده است" : error.message,
    category: ErrorCategory.SYSTEM,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}

// Global error handling middleware
export function errorHandlingMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  // Use context from request or storage
  const context = req.context || storage.getStore();
  const requestId = context?.requestId;
  
  // Log the error
  if (error instanceof AppError) {
    logger.error(
      `خطای عملیاتی: ${error.message}`,
      'error-handler',
      error,
      error.category,
      {
        path: req.path,
        method: req.method,
        statusCode: error.statusCode,
        requestId, // Include requestId in logs
        ...error.metadata
      }
    );
  } else {
    // Log unexpected errors
    logger.error(
      `خطای غیرمنتظره: ${error.message}`,
      'error-handler',
      error,
      ErrorCategory.SYSTEM,
      {
        path: req.path,
        method: req.method,
        name: error.name,
        requestId // Include requestId in logs
      }
    );
  }

  // Send error response
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const errorResponse: any = createErrorResponse(error);

  // Include requestId in response
  if (requestId) {
    errorResponse.requestId = requestId;
  }
  
  res.status(statusCode).json(errorResponse);
}

// Safe async handler wrapper
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database operation wrapper
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  tableName?: string
): Promise<T> {
  try {
    logger.debug(`شروع عملیات دیتابیس: ${operationName}${tableName ? ` در جدول ${tableName}` : ''}`, 'database');
    const result = await operation();
    logger.logDatabase(operationName, tableName, true);
    return result;
  } catch (error) {
    logger.logDatabase(operationName, tableName, false, { error: error instanceof Error ? error.message : String(error) });
    throw new DatabaseError(`خطا در ${operationName}${tableName ? ` جدول ${tableName}` : ''}`, error instanceof Error ? error : new Error(String(error)));
  }
}

// External API wrapper
export async function withExternalAPIErrorHandling<T>(
  apiCall: () => Promise<T>,
  serviceName: string,
  endpoint: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    logger.info(`درخواست به API ${serviceName}: ${endpoint}`, 'external-api');
    const result = await apiCall();
    const duration = Date.now() - startTime;
    logger.logExternalAPI(serviceName, endpoint, 200, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error as any)?.response?.status || 500;
    logger.logExternalAPI(serviceName, endpoint, statusCode, duration);
    
    if (error instanceof Error) {
      throw new ExternalAPIError(serviceName, error.message, statusCode);
    }
    throw new ExternalAPIError(serviceName, 'خطای نامشخص', statusCode);
  }
}

// File operation wrapper
export async function withFileErrorHandling<T>(
  fileOperation: () => Promise<T>,
  operationName: string,
  filename?: string
): Promise<T> {
  try {
    logger.debug(`شروع عملیات فایل: ${operationName}${filename ? ` برای ${filename}` : ''}`, 'file-system');
    const result = await fileOperation();
    logger.logFileOperation(operationName, filename, true);
    return result;
  } catch (error) {
    logger.logFileOperation(operationName, filename, false, { error: error instanceof Error ? error.message : String(error) });
    throw new FileSystemError(`خطا در ${operationName}${filename ? ` فایل ${filename}` : ''}`, { filename, originalError: error instanceof Error ? error.message : String(error) });
  }
}
