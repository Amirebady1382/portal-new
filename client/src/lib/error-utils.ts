// Utility functions for handling and displaying errors in a user-friendly way

export interface ApiError {
  success: false;
  message: string;
  category?: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface ErrorDisplayOptions {
  showDetails?: boolean;
  fallbackMessage?: string;
  logToConsole?: boolean;
}

// Error categories mapping to user-friendly messages
const ERROR_CATEGORY_MESSAGES: Record<string, string> = {
  AUTHENTICATION: "مشکل در احراز هویت",
  DATABASE: "خطا در پردازش اطلاعات",
  FILE_SYSTEM: "خطا در عملیات فایل",
  EXTERNAL_API: "مشکل در ارتباط با سرویس خارجی",
  VALIDATION: "اطلاعات ورودی نامعتبر",
  BUSINESS_LOGIC: "خطا در منطق عملیات",
  SYSTEM: "خطای سیستم"
};

// Common error patterns and their user-friendly messages
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /network|fetch|connection/i,
    message: "مشکل در اتصال به اینترنت. لطفاً اتصال خود را بررسی کنید"
  },
  {
    pattern: /timeout|تیم‌اوت/i,
    message: "عملیات طولانی شد. لطفاً دوباره تلاش کنید"
  },
  {
    pattern: /unauthorized|احراز هویت/i,
    message: "نیاز به ورود مجدد. لطفاً وارد حساب کاربری خود شوید"
  },
  {
    pattern: /forbidden|دسترسی/i,
    message: "شما مجاز به انجام این عملیات نیستید"
  },
  {
    pattern: /not found|یافت نشد/i,
    message: "اطلاعات درخواستی یافت نشد"
  },
  {
    pattern: /validation|اعتبارسنجی|نامعتبر/i,
    message: "لطفاً اطلاعات ورودی را بررسی کنید"
  },
  {
    pattern: /file size|حجم فایل/i,
    message: "حجم فایل بیش از حد مجاز است"
  },
  {
    pattern: /file format|فرمت فایل/i,
    message: "فرمت فایل پشتیبانی نمی‌شود"
  },
  {
    pattern: /رسمیو|rasmio/i,
    message: "مشکل در دریافت اطلاعات رسمی شرکت"
  }
];

// Extract error information from different error types
export function extractErrorInfo(error: any): {
  message: string;
  category?: string;
  details?: Record<string, any>;
} {
  // Handle API response errors
  if (error?.response?.data) {
    const data = error.response.data;
    return {
      message: data.message || "خطای ناشناخته",
      category: data.category,
      details: data.details
    };
  }

  // Handle fetch API errors
  if (error instanceof Response) {
    return {
      message: `خطای سرور: ${error.status} ${error.statusText}`,
      category: error.status >= 500 ? "SYSTEM" : "CLIENT"
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      message: error.message || "خطای ناشناخته",
      category: "SYSTEM"
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    return {
      message: error,
      category: "SYSTEM"
    };
  }

  // Handle objects with message property
  if (error?.message) {
    return {
      message: error.message,
      category: error.category || "SYSTEM",
      details: error.details
    };
  }

  return {
    message: "خطای ناشناخته رخ داده است",
    category: "SYSTEM"
  };
}

// Generate user-friendly error message
export function getUserFriendlyErrorMessage(
  error: any,
  options: ErrorDisplayOptions = {}
): string {
  const {
    fallbackMessage = "خطایی رخ داده است. لطفاً دوباره تلاش کنید",
    logToConsole = process.env.NODE_ENV === "development"
  } = options;

  if (logToConsole) {
    console.error("Error details:", error);
  }

  const errorInfo = extractErrorInfo(error);

  // Check for specific error patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorInfo.message)) {
      return message;
    }
  }

  // Use category-based message if available
  if (errorInfo.category && ERROR_CATEGORY_MESSAGES[errorInfo.category]) {
    const categoryMessage = ERROR_CATEGORY_MESSAGES[errorInfo.category];
    // If the original message has useful info, append it
    if (errorInfo.message && !errorInfo.message.includes("خطای سیستم") && !errorInfo.message.includes("Internal Server Error")) {
      return `${categoryMessage}: ${errorInfo.message}`;
    }
    return categoryMessage;
  }

  // Return the original message if it's user-friendly (Persian text)
  if (errorInfo.message && /[\u0600-\u06FF]/.test(errorInfo.message)) {
    return errorInfo.message;
  }

  // Fallback to generic message
  return fallbackMessage;
}

// Extract HTTP status code from error
export function getErrorStatusCode(error: any): number | null {
  if (error?.response?.status) return error.response.status;
  if (error?.status) return error.status;
  if (error instanceof Response) return error.status;
  return null;
}

// Check if error is network-related
export function isNetworkError(error: any): boolean {
  const message = extractErrorInfo(error).message.toLowerCase();
  return /network|connection|fetch|internet|اینترنت|اتصال/.test(message);
}

// Check if error requires re-authentication
export function isAuthError(error: any): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode === 401 || statusCode === 403) return true;
  
  const message = extractErrorInfo(error).message.toLowerCase();
  return /unauthorized|forbidden|احراز هویت|دسترسی|ورود/.test(message);
}

// Check if error is temporary (user should retry)
export function isTemporaryError(error: any): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode && statusCode >= 500) return true;
  
  const message = extractErrorInfo(error).message.toLowerCase();
  return /timeout|server|سرور|تیم‌اوت|موقت/.test(message);
}

// Format error for toast display
export interface ToastErrorOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  showRetry?: boolean;
  retryAction?: () => void;
}

export function formatErrorForToast(
  error: any,
  options: ToastErrorOptions = {}
): {
  title: string;
  description: string;
  variant: "default" | "destructive";
  action?: React.ReactNode;
} {
  const errorInfo = extractErrorInfo(error);
  const userMessage = getUserFriendlyErrorMessage(error);
  
  const isTemporary = isTemporaryError(error);
  const isAuth = isAuthError(error);
  
  let title = options.title;
  if (!title) {
    if (isAuth) {
      title = "خطا در احراز هویت";
    } else if (isTemporary) {
      title = "خطای موقت";
    } else {
      title = "خطا";
    }
  }

  return {
    title,
    description: options.description || userMessage,
    variant: options.variant || "destructive"
  };
}

// Log error for debugging (only in development)
export function logErrorForDebug(error: any, context?: string): void {
  if (process.env.NODE_ENV !== "development") return;
  
  console.group(`🔴 Error${context ? ` in ${context}` : ""}`);
  console.error("Original error:", error);
  console.log("Extracted info:", extractErrorInfo(error));
  console.log("User message:", getUserFriendlyErrorMessage(error));
  console.log("Status code:", getErrorStatusCode(error));
  console.log("Is network error:", isNetworkError(error));
  console.log("Is auth error:", isAuthError(error));
  console.log("Is temporary error:", isTemporaryError(error));
  console.groupEnd();
}

// Create error boundary utility
export function handleAsyncError<T>(
  asyncFn: () => Promise<T>,
  errorHandler?: (error: any) => void
) {
  return async (): Promise<T | undefined> => {
    try {
      return await asyncFn();
    } catch (error) {
      logErrorForDebug(error, "Async operation");
      if (errorHandler) {
        errorHandler(error);
      }
      return undefined;
    }
  };
} 