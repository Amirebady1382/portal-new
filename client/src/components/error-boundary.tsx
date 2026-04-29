import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // به‌روزرسانی state تا next render نمایش UI fallback را نشان دهد
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = crypto.randomUUID();
    this.setState({
      error,
      errorInfo,
      errorId
    });

    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log using our enhanced logger
    logger.error('UI Error Boundary Caught Error:', {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // فراخوانی callback اختیاری
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  private handleGoHome = () => {
    // رفتن به صفحه اصلی بر اساس نقش کاربر
    const userRole = localStorage.getItem('user_role') || 'customer';
    let homePath = '/';
    
    switch (userRole) {
      case 'admin':
        homePath = '/admin';
        break;
      case 'ceo':
        homePath = '/ceo';
        break;
      case 'employee':
        homePath = '/employee';
        break;
      case 'customer':
        homePath = '/customer';
        break;
      default:
        homePath = '/login';
    }
    
    window.location.href = homePath;
  };

  private copyErrorId = () => {
    if (this.state.errorId) {
      navigator.clipboard.writeText(this.state.errorId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      // اگر fallback سفارشی ارائه شده، آن را نمایش بده
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI پیش‌فرض برای خطا
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                متأسفانه خطایی رخ داده است
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                یک خطای غیرمنتظره در برنامه رخ داده است. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {this.state.errorId && (
                <div className="bg-gray-100 p-3 rounded-md flex items-center justify-between border border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium ml-2">کد رهگیری خطا:</span>
                    <code className="bg-gray-200 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={this.copyErrorId}
                    title="کپی کد خطا"
                  >
                    {this.state.copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </Button>
                </div>
              )}

              {/* نمایش جزئیات خطا فقط در development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left" dir="ltr">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Error Details (Development Only):
                  </h4>
                  <pre className="text-xs text-red-700 overflow-auto max-h-32 whitespace-pre-wrap font-mono">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack && 
                      '\n\nComponent Stack:' + this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تلاش مجدد
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="w-4 h-4 ml-2" />
                  صفحه اصلی
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
