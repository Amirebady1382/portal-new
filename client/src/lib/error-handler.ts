import { logger } from './logger';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class StandardError extends Error {
  public status?: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'StandardError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ErrorHandler {
  // تبدیل خطاهای مختلف به یک فرمت استاندارد
  public standardizeError(error: any): StandardError {
    // اگر قبلاً StandardError است
    if (error instanceof StandardError) {
      return error;
    }

    // اگر خطای آکسیوس است
    if (error?.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      let message = 'خطای غیرمنتظره رخ داده است';
      
      if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      } else {
        message = this.getStatusMessage(status);
      }

      return new StandardError(message, status, data?.code, data);
    }

    // اگر خطای شبکه است
    if (error?.request) {
      return new StandardError(
        'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
        0,
        'NETWORK_ERROR'
      );
    }

    // اگر خطای معمولی جاوااسکریپت است
    if (error instanceof Error) {
      return new StandardError(error.message);
    }

    // اگر string است
    if (typeof error === 'string') {
      return new StandardError(error);
    }

    // پیش‌فرض
    return new StandardError('خطای غیرمنتظره رخ داده است');
  }

  // دریافت پیام مناسب بر اساس status code
  private getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'داده‌های ارسالی نامعتبر است';
      case 401:
        return 'شما مجاز به این عملیات نیستید';
      case 403:
        return 'دسترسی مجاز نمی‌باشد';
      case 404:
        return 'اطلاعات درخواستی یافت نشد';
      case 409:
        return 'تداخل در داده‌ها - احتمالاً اطلاعات تکراری است';
      case 422:
        return 'داده‌های ارسالی قابل پردازش نیست';
      case 429:
        return 'تعداد درخواست‌های شما از حد مجاز گذشته است';
      case 500:
        return 'خطای داخلی سرور - لطفاً مجدد تلاش کنید';
      case 502:
        return 'خطا در gateway - سرور در دسترس نیست';
      case 503:
        return 'سرویس موقتاً در دسترس نیست';
      case 504:
        return 'تایم‌اوت در ارتباط با سرور';
      default:
        return `خطای HTTP ${status}`;
    }
  }

  // نمایش خطا به کاربر با toast
  public showError(error: any, title: string = 'خطا'): StandardError {
    const standardError = this.standardizeError(error);
    
    // Log برای debugging
    logger.debugError(`Error in ${title}`, {
      message: standardError.message,
      status: standardError.status,
      code: standardError.code,
      details: standardError.details
    });

    return standardError;
  }

  // بررسی نوع خطا
  public isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || error?.request;
  }

  public isAuthError(error: any): boolean {
    const standardError = this.standardizeError(error);
    return standardError.status === 401 || standardError.status === 403;
  }

  public isValidationError(error: any): boolean {
    const standardError = this.standardizeError(error);
    return standardError.status === 400 || standardError.status === 422;
  }

  public isServerError(error: any): boolean {
    const standardError = this.standardizeError(error);
    return (standardError.status || 0) >= 500;
  }

  public setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    window.onerror = (message, source, lineno, colno, error) => {
      logger.error('Global Error:', { message, source, lineno, colno, error });
    };

    window.onunhandledrejection = (event) => {
      logger.error('Unhandled Promise Rejection:', event.reason);
    };
  }
}

export const errorHandler = new ErrorHandler();

// Initialize global error handlers
errorHandler.setupGlobalErrorHandlers();
