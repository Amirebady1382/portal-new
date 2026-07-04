import { logger } from './logger';
import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SYSTEM_EMAIL || 'your-system-email@gmail.com',
    pass: process.env.SYSTEM_EMAIL_PASSWORD || 'your-app-password'
  }
};

const ADMIN_EMAIL = 'amirebady0@gmail.com';

// Email service
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Only initialize email service if monitoring is enabled
    if (process.env.ENABLE_EMAIL_MONITORING === 'true') {
      this.initializeTransporter();
    }
  }

  private async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport(EMAIL_CONFIG);
      if (this.transporter) {
        await this.transporter.verify();
        logger.info('سرویس ایمیل با موفقیت راه‌اندازی شد', 'email');
      }
    } catch (error) {
      logger.error('خطا در راه‌اندازی سرویس ایمیل', 'email', error instanceof Error ? error : new Error(String(error)));
      this.transporter = null;
    }
  }

  async sendSystemReport(subject: string, content: string) {
    if (!this.transporter) {
      logger.warn('سرویس ایمیل در دسترس نیست - گزارش ارسال نشد', 'email');
      return false;
    }

    try {
      const mailOptions = {
        from: EMAIL_CONFIG.auth.user,
        to: ADMIN_EMAIL,
        subject: `[سیستم مدیریت مشتریان] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
            <h2 style="color: #2563eb;">گزارش سیستم مدیریت مشتریان</h2>
            <p><strong>تاریخ و زمان:</strong> ${new Date().toLocaleString('fa-IR')}</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${content}
            </div>
            <hr style="margin: 20px 0;">
            <p style="color: #64748b; font-size: 12px;">
              این گزارش به صورت خودکار توسط سیستم monitoring تولید شده است.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`گزارش سیستم با موفقیت ارسال شد`, 'email', { to: ADMIN_EMAIL });
      return true;
    } catch (error) {
      logger.error('خطا در ارسال گزارش سیستم', 'email', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async sendAlert(title: string, message: string, severity: 'warning' | 'error' | 'critical' = 'warning') {
    const colors = {
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626'
    };

    const icons = {
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };

    const content = `
      <div style="border-right: 4px solid ${colors[severity]}; padding: 15px; margin: 10px 0;">
        <h3 style="color: ${colors[severity]}; margin: 0 0 10px 0;">
          ${icons[severity]} ${title}
        </h3>
        <p style="margin: 0;">${message}</p>
      </div>
    `;

    return await this.sendSystemReport(`هشدار سیستم - ${title}`, content);
  }
}

const emailService = new EmailService();

// Monitoring metrics storage (in production, this would be sent to external monitoring service)
interface OperationMetrics {
  name: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecuted: Date;
  errors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
}

class MonitoringService {
  private metrics = new Map<string, OperationMetrics>();
  private readonly maxErrorHistory = 10;

  // Track an operation execution
  recordOperation(
    operationName: string,
    duration: number,
    success: boolean,
    errorMessage?: string
  ) {
    let metric = this.metrics.get(operationName);
    
    if (!metric) {
      metric = {
        name: operationName,
        totalCount: 0,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastExecuted: new Date(),
        errors: []
      };
    }

    // Update counts
    metric.totalCount++;
    metric.lastExecuted = new Date();

    if (success) {
      metric.successCount++;
    } else {
      metric.failureCount++;
      
      // Track error
      if (errorMessage) {
        const existingError = metric.errors.find(e => e.message === errorMessage);
        if (existingError) {
          existingError.count++;
          existingError.lastOccurred = new Date();
        } else {
          metric.errors.push({
            message: errorMessage,
            count: 1,
            lastOccurred: new Date()
          });
          
          // Keep only recent errors
          if (metric.errors.length > this.maxErrorHistory) {
            metric.errors.sort((a, b) => b.lastOccurred.getTime() - a.lastOccurred.getTime());
            metric.errors = metric.errors.slice(0, this.maxErrorHistory);
          }
        }
      }
    }

    // Update duration metrics
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.totalCount;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);

    this.metrics.set(operationName, metric);

    // Log warnings for poor performance
    this.checkPerformanceThresholds(operationName, metric, duration, success);
  }

  private checkPerformanceThresholds(
    operationName: string,
    metric: OperationMetrics,
    currentDuration: number,
    success: boolean
  ) {
    const successRate = metric.successCount / metric.totalCount;
    
    // Alert on low success rate (less than 95% over last 10 operations)
    if (metric.totalCount >= 10 && successRate < 0.95) {
      logger.warn(
        `عملیات ${operationName} دارای نرخ موفقیت پایین است`,
        'monitoring',
        {
          successRate: (successRate * 100).toFixed(1) + '%',
          totalOperations: metric.totalCount,
          recentErrors: metric.errors.slice(0, 3)
        }
      );
    }

    // Alert on slow performance (more than 2x average)
    if (success && metric.totalCount >= 5 && currentDuration > metric.averageDuration * 2) {
      logger.warn(
        `عملیات ${operationName} کندتر از حد معمول اجرا شد`,
        'monitoring',
        {
          currentDuration,
          averageDuration: metric.averageDuration,
          slowdownRatio: (currentDuration / metric.averageDuration).toFixed(1) + 'x'
        }
      );
    }

    // Alert on very slow operations (more than 10 seconds)
    if (currentDuration > 10000) {
      logger.warn(
        `عملیات ${operationName} بیش از ۱۰ ثانیه طول کشید`,
        'monitoring',
        { duration: currentDuration }
      );
    }
  }

  // Get metrics for specific operation
  getOperationMetrics(operationName: string): OperationMetrics | undefined {
    return this.metrics.get(operationName);
  }

  // Get all metrics
  getAllMetrics(): Array<OperationMetrics & { successRate: number }> {
    return Array.from(this.metrics.values()).map(metric => ({
      ...metric,
      successRate: metric.totalCount > 0 ? metric.successCount / metric.totalCount : 0
    }));
  }

  // Get summary of system health
  getSystemHealth(): {
    totalOperations: number;
    overallSuccessRate: number;
    slowOperations: string[];
    frequentErrors: Array<{
      operation: string;
      error: string;
      count: number;
    }>;
    performanceAlerts: string[];
  } {
    const allMetrics = this.getAllMetrics();
    
    const totalOperations = allMetrics.reduce((sum, m) => sum + m.totalCount, 0);
    const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.successCount, 0);
    const overallSuccessRate = totalOperations > 0 ? totalSuccesses / totalOperations : 1;

    // Identify slow operations (average > 5 seconds)
    const slowOperations = allMetrics
      .filter(m => m.averageDuration > 5000)
      .map(m => `${m.name} (${(m.averageDuration / 1000).toFixed(1)}s)`);

    // Get most frequent errors
    const frequentErrors: Array<{ operation: string; error: string; count: number }> = [];
    allMetrics.forEach(metric => {
      metric.errors.forEach(error => {
        if (error.count >= 3) { // Only show errors that occurred 3+ times
          frequentErrors.push({
            operation: metric.name,
            error: error.message,
            count: error.count
          });
        }
      });
    });
    frequentErrors.sort((a, b) => b.count - a.count);

    // Performance alerts
    const performanceAlerts: string[] = [];
    allMetrics.forEach(metric => {
      if (metric.successRate < 0.9) {
        performanceAlerts.push(`${metric.name}: نرخ موفقیت ${(metric.successRate * 100).toFixed(1)}%`);
      }
      if (metric.averageDuration > 5000) {
        performanceAlerts.push(`${metric.name}: متوسط زمان اجرا ${(metric.averageDuration / 1000).toFixed(1)} ثانیه`);
      }
    });

    return {
      totalOperations,
      overallSuccessRate,
      slowOperations,
      frequentErrors: frequentErrors.slice(0, 10),
      performanceAlerts
    };
  }

  // Reset metrics (useful for testing or periodic cleanup)
  resetMetrics() {
    this.metrics.clear();
    logger.info('آمار monitoring پاک شد', 'monitoring');
  }

  // Log periodic health report
  async logHealthReport() {
    const health = this.getSystemHealth();
    
    const reportContent = `
      <h2>گزارش سیستم مدیریت مشتریان</h2>
      <p><strong>تاریخ و زمان:</strong> ${new Date().toLocaleString('fa-IR')}</p>
      <h3>خلاصه سیستم</h3>
      <ul>
        <li>تعداد کل عملیات: ${health.totalOperations}</li>
        <li>نرخ موفقیت کل: ${(health.overallSuccessRate * 100).toFixed(1)}%</li>
      </ul>
      <h3>عملیات کند</h3>
      <ul>
        ${health.slowOperations.map(op => `<li>${op}</li>`).join('')}
      </ul>
      <h3>خطاهای متداول</h3>
      <ul>
        ${health.frequentErrors.map(err => `<li>${err.operation}: ${err.error} (${err.count} بار)</li>`).join('')}
      </ul>
      <h3>هشدارهای عملکرد</h3>
      <ul>
        ${health.performanceAlerts.map(alert => `<li>${alert}</li>`).join('')}
      </ul>
    `;

    await emailService.sendSystemReport('گزارش سیستم سالم', reportContent);
  }
}

// Singleton monitoring service
export const monitoring = new MonitoringService();

// Decorator/wrapper for monitoring operations
export function withMonitoring<T extends any[], R>(
  operationName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      monitoring.recordOperation(operationName, duration, success, errorMessage);
    }
  };
}

// High-level operations to monitor
export const CRITICAL_OPERATIONS = {
  USER_LOGIN: 'user_login',
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download',
  CONTRACT_GENERATION: 'contract_generation',
  RASMIO_API_CALL: 'rasmio_api_call',
  AI_ANALYSIS: 'ai_analysis',
  DATABASE_QUERY: 'database_query',
  OTP_SEND: 'otp_send',
  OTP_VERIFY: 'otp_verify',
  DOCUMENT_PROCESSING: 'document_processing'
} as const;

// Convenient wrappers for common operations
export const monitoredOperations = {
  userLogin: <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
    withMonitoring(CRITICAL_OPERATIONS.USER_LOGIN, fn),
    
  fileUpload: <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
    withMonitoring(CRITICAL_OPERATIONS.FILE_UPLOAD, fn),
    
  contractGeneration: <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
    withMonitoring(CRITICAL_OPERATIONS.CONTRACT_GENERATION, fn),
    
  rasmioApiCall: <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
    withMonitoring(CRITICAL_OPERATIONS.RASMIO_API_CALL, fn),
    
  aiAnalysis: <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
    withMonitoring(CRITICAL_OPERATIONS.AI_ANALYSIS, fn),
    
  databaseQuery: <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
    withMonitoring(CRITICAL_OPERATIONS.DATABASE_QUERY, fn),
};

// Start periodic health reporting - controlled by environment variable
const enableEmailReports = process.env.ENABLE_EMAIL_MONITORING === 'true';

if (enableEmailReports) {
  setInterval(async () => {
    await monitoring.logHealthReport();
  }, 2 * 60 * 60 * 1000); // Every 2 hours
  
  logger.info('سیستم monitoring فعال شد (ایمیل خودکار فعال)', 'monitoring');
} else {
  logger.info('سیستم monitoring فعال شد (ایمیل خودکار غیرفعال)', 'monitoring');
} 