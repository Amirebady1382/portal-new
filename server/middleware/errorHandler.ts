import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger, storage } from '../utils/logger';
import { ZodError } from 'zod';

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Convert known errors to AppError instances
 */
function normalizeError(error: Error): AppError {
  // If already an AppError, return as is
  if (error instanceof AppError) {
    return error;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return new AppError(
      'اطلاعات ارسالی نامعتبر است',
      422,
      true,
      details
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AppError('توکن نامعتبر است', 401, true);
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError('توکن منقضی شده است', 401, true);
  }

  // Handle SQLite errors
  if (error.message.includes('UNIQUE constraint')) {
    const match = error.message.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
    const field = match ? match[2] : 'field';
    return new AppError(
      `این ${field} قبلاً استفاده شده است`,
      409,
      true,
      { field }
    );
  }

  if (error.message.includes('FOREIGN KEY constraint')) {
    return new AppError(
      'نمی‌توان این رکورد را حذف کرد زیرا وابستگی دارد',
      409,
      true
    );
  }

  if (error.message.includes('SQLITE_BUSY')) {
    return new AppError(
      'پایگاه داده مشغول است، لطفاً دوباره تلاش کنید',
      503,
      true
    );
  }

  // Unknown errors - don't expose details to client
  return new AppError(
    'خطای داخلی سرور',
    500,
    false,
    process.env.NODE_ENV === 'development' ? error.message : undefined
  );
}

/**
 * Global error handler middleware
 * Should be the last middleware in the chain
 */
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Normalize error to AppError
  const appError = normalizeError(error);

  // Get request ID from context
  const context = storage.getStore();
  const requestId = context?.requestId || (req as any).context?.requestId;

  // Log error details
  if (appError.isOperational) {
    logger.warn(
      appError.message,
      'error-handler',
      {
        statusCode: appError.statusCode,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
        details: appError.details,
        requestId
      }
    );
  } else {
    // Log full stack trace for non-operational errors
    logger.error(
      appError.message,
      'error-handler',
      error,
      undefined, // category
      {
        statusCode: appError.statusCode,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
        stack: error.stack,
        requestId
      }
    );
  }

  // Send error response
  const response: any = {
    success: false,
    message: appError.message,
    statusCode: appError.statusCode,
    requestId // Include requestId in response
  };

  // Include details in development or for operational errors
  if (appError.details && (process.env.NODE_ENV === 'development' || appError.isOperational)) {
    response.details = appError.details;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(appError.statusCode).json(response);
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    `مسیر ${req.originalUrl} یافت نشد`,
    404,
    true,
    {
      method: req.method,
      path: req.originalUrl,
    }
  );
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
export const setupUnhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason: Error | any) => {
    logger.error(
      'Unhandled Promise Rejection',
      'process',
      reason instanceof Error ? reason : new Error(String(reason))
    );
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Unhandled Rejection - shutting down...');
      process.exit(1);
    }
  });
};

/**
 * Handle uncaught exceptions
 */
export const setupUncaughtExceptionHandler = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', 'process', error);
    
    // Always exit on uncaught exception
    console.error('Uncaught Exception - shutting down...');
    process.exit(1);
  });
};
