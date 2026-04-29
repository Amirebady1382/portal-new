import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  DATABASE = 'DATABASE',
  FILE_SYSTEM = 'FILE_SYSTEM',
  EXTERNAL_API = 'EXTERNAL_API',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM'
}

export interface RequestContext {
  requestId: string;
  userId?: number;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  category?: ErrorCategory;
  source: string;
  message: string;
  userId?: number;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean; // Deprecated in favor of pino transport, but kept for interface compatibility
  maxFileSize: number;
  redactSensitiveData: boolean;
}

// AsyncLocalStorage for request context tracking
export const storage = new AsyncLocalStorage<RequestContext>();

class Logger {
  private config: LoggerConfig;
  private recentLogs: LogEntry[] = [];
  private maxRecentLogs: number = 1000;
  private pinoLogger: pino.Logger;

  constructor(config?: Partial<LoggerConfig>) {
    const isDev = process.env.NODE_ENV !== 'production';
    const isDebug = process.env.DEBUG_MODE === 'true';

    this.config = {
      level: isDebug ? LogLevel.DEBUG : (isDev ? LogLevel.DEBUG : LogLevel.INFO),
      enableConsole: true,
      enableFile: !isDev,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      redactSensitiveData: true,
      ...config
    };

    // Initialize Pino
    this.pinoLogger = pino({
      level: isDebug ? 'debug' : (isDev ? 'debug' : 'info'),
      transport: isDev ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        }
      } : undefined,
      redact: this.config.redactSensitiveData ? {
        paths: [
          'password', 'token', 'key', 'secret', 'auth', 'authorization',
          'metadata.password', 'metadata.token', 'metadata.key'
        ],
        censor: '[REDACTED]'
      } : undefined,
    });
  }

  // Set context for request tracking - wrapper around AsyncLocalStorage.run if needed
  // But typically middleware will call storage.run()
  // This method is kept for backward compatibility but might not be effective if not used inside run()
  setContext(context: Record<string, any>) {
    const currentStore = storage.getStore();
    if (currentStore) {
      Object.assign(currentStore, context);
    }
  }

  clearContext() {
    // No-op for AsyncLocalStorage as it cleans up automatically
  }

  // Main logging methods
  debug(message: string, source: string = 'system', metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, source, metadata);
  }

  info(message: string, source: string = 'system', metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, source, metadata);
  }

  warn(message: string, source: string = 'system', metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, source, metadata);
  }

  error(message: string, source: string = 'system', error?: Error, category?: ErrorCategory, metadata?: Record<string, any>) {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: (this.config.level === LogLevel.DEBUG || process.env.DEBUG_MODE === 'true') ? error.stack : undefined
    } : undefined;

    this.log(LogLevel.ERROR, message, source, metadata, category, errorData);
  }

  // Operation-specific logging methods
  logAuth(action: string, userId?: number, success: boolean = true, metadata?: Record<string, any>) {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `${action}: ${success ? 'موفق' : 'ناموفق'}`;
    this.log(level, message, 'auth', { userId, ...metadata }, ErrorCategory.AUTHENTICATION);
  }

  logDatabase(operation: string, table?: string, success: boolean = true, metadata?: Record<string, any>) {
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    const message = `${operation} ${table ? `در جدول ${table}` : ''}: ${success ? 'موفق' : 'ناموفق'}`;
    this.log(level, message, 'database', metadata, ErrorCategory.DATABASE);
  }

  logFileOperation(operation: string, filename?: string, success: boolean = true, metadata?: Record<string, any>) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `${operation} ${filename ? `فایل ${filename}` : ''}: ${success ? 'موفق' : 'ناموفق'}`;
    this.log(level, message, 'file-system', metadata, ErrorCategory.FILE_SYSTEM);
  }

  logExternalAPI(service: string, endpoint: string, status?: number, duration?: number, metadata?: Record<string, any>) {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API ${service} - ${endpoint}: ${status ? `status ${status}` : 'درخواست ارسال شد'}${duration ? ` (${duration}ms)` : ''}`;
    this.log(level, message, 'external-api', { status, duration, ...metadata }, ErrorCategory.EXTERNAL_API);
  }

  // Performance monitoring
  logPerformance(operation: string, duration: number, success: boolean = true, metadata?: Record<string, any>) {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO; // Warn if operation takes more than 5 seconds
    const message = `عملیات ${operation}: ${duration}ms (${success ? 'موفق' : 'ناموفق'})`;
    this.log(level, message, 'performance', { duration, success, ...metadata });
  }

  private log(level: LogLevel, message: string, source: string, metadata?: Record<string, any>, category?: ErrorCategory, error?: any) {
    if (level < this.config.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const context = storage.getStore() || {};

    // Combine metadata
    const combinedMetadata = {
      ...metadata,
      ...context,
      source,
      category,
      error
    };

    // Log via Pino
    const pinoLevel = level === LogLevel.DEBUG ? 'debug' :
                      level === LogLevel.INFO ? 'info' :
                      level === LogLevel.WARN ? 'warn' : 'error';

    this.pinoLogger[pinoLevel](combinedMetadata, this.sanitizeMessage(message));

    // Store recent log for in-memory monitoring
    // We recreate the structure expected by legacy viewers if needed
    const entry: LogEntry = {
      timestamp,
      level: levelName,
      source,
      message: this.sanitizeMessage(message),
      ...context,
      ...(category && { category }),
      ...(metadata && { metadata: this.sanitizeMetadata(metadata) }),
      ...(error && { error })
    };

    this.storeRecentLog(entry);
  }

  private sanitizeMessage(message: string): string {
    if (!this.config.redactSensitiveData) return message;

    // Remove sensitive patterns - redundancy with pino redact but good for in-memory store
    return message
      .replace(/password['\"]?\s*:\s*['\"]?[^'\"]+['\"]?/gi, 'password: [REDACTED]')
      .replace(/token['\"]?\s*:\s*['\"]?[^'\"]+['\"]?/gi, 'token: [REDACTED]')
      .replace(/key['\"]?\s*:\s*['\"]?[^'\"]+['\"]?/gi, 'key: [REDACTED]')
      .replace(/09\d{9}/g, '09XXXXXXXXX') // Hide phone numbers
      .replace(/\d{10}/g, 'XXXXXXXXXX'); // Hide national IDs
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!this.config.redactSensitiveData) return metadata;

    const sanitized = { ...metadata };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private storeRecentLog(entry: LogEntry) {
    this.recentLogs.push(entry);
    
    // Keep only the most recent logs
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs = this.recentLogs.slice(-this.maxRecentLogs);
    }
  }

  // Get recent logs for monitoring
  getRecentLogs(limit?: number): LogEntry[] {
    const logs = limit ? this.recentLogs.slice(-limit) : this.recentLogs;
    return [...logs]; // Return copy to prevent external modification
  }

  // Get log statistics
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    errorRate: number;
  } {
    const stats = {
      total: this.recentLogs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      errorRate: 0
    };

    let errorCount = 0;
    
    this.recentLogs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by category
      if (log.category) {
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      }
      
      // Count errors
      if (log.level === 'ERROR') {
        errorCount++;
      }
    });

    stats.errorRate = stats.total > 0 ? (errorCount / stats.total) * 100 : 0;
    
    return stats;
  }

  // Clear recent logs
  clearRecentLogs() {
    this.recentLogs = [];
  }
}

// Create singleton instance
export const logger = new Logger();

// Performance timer utility
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(success: boolean = true, metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    logger.logPerformance(this.operation, duration, success, metadata);
    return duration;
  }
}

export function createRequestContext(req: any): RequestContext {
  return {
    requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    userId: req.user?.userId,
    userRole: req.user?.role,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent')
  };
}

export default logger;
