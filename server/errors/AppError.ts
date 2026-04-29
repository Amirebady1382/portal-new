/**
 * Base Application Error Class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * 400 - Bad Request
 * Used when the request is malformed or invalid
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'درخواست نامعتبر است', details?: any) {
    super(message, 400, true, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 - Unauthorized
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'احراز هویت نشده‌اید', details?: any) {
    super(message, 401, true, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 - Forbidden
 * Used when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'دسترسی محدود', details?: any) {
    super(message, 403, true, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 - Not Found
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'یافت نشد', details?: any) {
    super(message, 404, true, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 - Conflict
 * Used when there's a conflict with current state (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'تضاد در داده‌ها', details?: any) {
    super(message, 409, true, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 - Unprocessable Entity
 * Used when validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string = 'اطلاعات ارسالی نامعتبر است', details?: any) {
    super(message, 422, true, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 429 - Too Many Requests
 * Used when rate limit is exceeded
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'درخواست‌های شما از حد مجاز گذشته است', details?: any) {
    super(message, 429, true, details);
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

/**
 * 500 - Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'خطای داخلی سرور', details?: any) {
    super(message, 500, false, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 503 - Service Unavailable
 * Used when external service is unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'سرویس در دسترس نیست', details?: any) {
    super(message, 503, true, details);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Database Error
 * Used for database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'خطا در پایگاه داده', details?: any) {
    super(message, 500, false, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External API Error
 * Used when external API call fails
 */
export class ExternalAPIError extends AppError {
  constructor(message: string = 'خطا در ارتباط با سرویس خارجی', details?: any) {
    super(message, 502, true, details);
    Object.setPrototypeOf(this, ExternalAPIError.prototype);
  }
}

/**
 * File System Error
 * Used for file operations errors
 */
export class FileSystemError extends AppError {
  constructor(message: string = 'خطا در عملیات فایل', details?: any) {
    super(message, 500, true, details);
    Object.setPrototypeOf(this, FileSystemError.prototype);
  }
}

