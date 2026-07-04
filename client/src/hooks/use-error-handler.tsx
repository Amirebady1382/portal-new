import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCallback } from "react";
import {
  getUserFriendlyErrorMessage,
  formatErrorForToast,
  logErrorForDebug,
  isAuthError,
  isNetworkError,
  isTemporaryError,
  type ToastErrorOptions
} from "@/lib/error-utils";

export interface UseErrorHandlerOptions {
  // Default error message if none can be extracted
  fallbackMessage?: string;
  // Whether to log errors to console (defaults to development only)
  logErrors?: boolean;
  // Whether to show toast notifications for errors
  showToast?: boolean;
  // Custom error handler
  onError?: (error: any, context?: string) => void;
  // Whether to automatically handle auth errors (logout user)
  handleAuthErrors?: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { toast } = useToast();
  const { logout } = useAuth();
  
  const {
    fallbackMessage = "خطایی رخ داده است. لطفاً دوباره تلاش کنید",
    logErrors = process.env.NODE_ENV === "development",
    showToast = true,
    onError,
    handleAuthErrors = true
  } = options;

  const handleError = useCallback((
    error: any, 
    context?: string, 
    toastOptions?: ToastErrorOptions
  ) => {
    // Log error for debugging
    if (logErrors) {
      logErrorForDebug(error, context);
    }

    // Handle authentication errors
    if (handleAuthErrors && isAuthError(error)) {
      if (showToast) {
        toast({
          title: "احراز هویت مجدد",
          description: "جلسه شما منقضی شده است. لطفاً مجدد وارد شوید",
          variant: "destructive",
        });
      }
      
      // Logout user after a short delay
      setTimeout(() => {
        logout();
      }, 2000);
      
      return;
    }

    // Show toast notification
    if (showToast) {
      const toastConfig = formatErrorForToast(error, {
        ...toastOptions,
        title: toastOptions?.title || (context ? `خطا در ${context}` : undefined)
      });
      
      toast({
        title: toastConfig.title,
        description: toastConfig.description,
        variant: toastConfig.variant
      });
    }

    // Call custom error handler
    if (onError) {
      onError(error, context);
    }
  }, [toast, logout, logErrors, showToast, onError, handleAuthErrors]);

  // Specialized handlers for common operations
  const handleApiError = useCallback((error: any, operation?: string) => {
    handleError(error, operation ? `عملیات ${operation}` : "API");
  }, [handleError]);

  const handleFileError = useCallback((error: any, filename?: string) => {
    const context = filename ? `عملیات فایل ${filename}` : "عملیات فایل";
    handleError(error, context);
  }, [handleError]);

  const handleValidationError = useCallback((error: any, fieldName?: string) => {
    const context = fieldName ? `اعتبارسنجی ${fieldName}` : "اعتبارسنجی";
    handleError(error, context, {
      title: "خطا در اطلاعات ورودی"
    });
  }, [handleError]);

  const handleNetworkError = useCallback((error: any) => {
    if (isNetworkError(error)) {
      handleError(error, "اتصال شبکه", {
        title: "مشکل اتصال",
        description: "لطفاً اتصال اینترنت خود را بررسی کنید"
      });
    } else {
      handleError(error, "شبکه");
    }
  }, [handleError]);

  // Create error handler for async operations
  const withErrorHandler = useCallback(<T,>(
    asyncFn: () => Promise<T>,
    context?: string,
    options?: {
      showLoadingToast?: boolean;
      successMessage?: string;
      errorToastOptions?: ToastErrorOptions;
    }
  ) => {
    return async (): Promise<T | undefined> => {
      try {
        // Show loading toast if requested
        if (options?.showLoadingToast) {
          toast({
            title: "در حال پردازش...",
            description: context ? `${context} در حال انجام` : undefined,
          });
        }

        const result = await asyncFn();

        // Show success message if provided
        if (options?.successMessage) {
          toast({
            title: "موفقیت",
            description: options.successMessage,
            variant: "default",
          });
        }

        return result;
      } catch (error) {
        handleError(error, context, options?.errorToastOptions);
        return undefined;
      }
    };
  }, [handleError, toast]);

  // Create a wrapper for mutation error handlers
  const createMutationErrorHandler = useCallback((context?: string) => {
    return (error: any) => {
      handleError(error, context);
    };
  }, [handleError]);

  // Utility to get user-friendly error message without showing toast
  const getErrorMessage = useCallback((error: any): string => {
    return getUserFriendlyErrorMessage(error, { fallbackMessage, logToConsole: logErrors });
  }, [fallbackMessage, logErrors]);

  // Check error types
  const checkErrorType = useCallback((error: any) => {
    return {
      isAuth: isAuthError(error),
      isNetwork: isNetworkError(error),
      isTemporary: isTemporaryError(error)
    };
  }, []);

  return {
    // Main error handler
    handleError,
    
    // Specialized handlers
    handleApiError,
    handleFileError,
    handleValidationError,
    handleNetworkError,
    
    // Utilities
    withErrorHandler,
    createMutationErrorHandler,
    getErrorMessage,
    checkErrorType,
    
    // For external use
    getUserFriendlyMessage: getErrorMessage
  };
}

// Hook for handling specific operation errors
export function useOperationErrorHandler(operationName: string, options?: UseErrorHandlerOptions) {
  const errorHandler = useErrorHandler(options);
  
  return {
    ...errorHandler,
    handleError: (error: any, toastOptions?: ToastErrorOptions) => 
      errorHandler.handleError(error, operationName, toastOptions),
    
    withErrorHandler: <T,>(asyncFn: () => Promise<T>, successMessage?: string) =>
      errorHandler.withErrorHandler(asyncFn, operationName, { successMessage })
  };
} 