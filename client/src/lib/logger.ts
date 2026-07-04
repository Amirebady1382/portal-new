// Logger utility برای مدیریت console logs در production و development

const LOG_ENDPOINT = "/api/logs/client";

export const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  private shouldLog = isDevelopment;

  private async phoneHome(level: string, message: string, meta?: any) {
    try {
      const payload = {
        level,
        message,
        meta: meta ? { ...meta } : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
        stack: meta?.error?.stack || meta?.stack
      };

      // Remove circular references if any
      const safePayload = JSON.parse(JSON.stringify(payload));

      await fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safePayload)
      });
    } catch (e) {
      if (this.shouldLog) {
        console.error("Failed to send log to server", e);
      }
    }
  }

  log(...args: any[]): void {
    if (this.shouldLog) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog) {
      console.warn(...args);
    }
    // Optional: send warnings to server?
    // this.phoneHome('warn', args[0], { args: args.slice(1) });
  }

  error(...args: any[]): void {
    // خطاها همیشه نمایش داده می‌شوند
    console.error(...args);
    this.phoneHome('error', typeof args[0] === 'string' ? args[0] : 'Unknown Error', { args: args.slice(1) });
  }

  info(...args: any[]): void {
    if (this.shouldLog) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog) {
      console.debug(...args);
    }
  }

  // برای debugging خطاها
  debugError(message: string, error: any): void {
    if (this.shouldLog) {
      console.group(`🔍 Debug: ${message}`);
      console.error('Error:', error);
      console.trace('Stack trace:');
      console.groupEnd();
    }
    this.phoneHome('error', message, { error });
  }

  // برای نمایش اطلاعات API calls
  apiCall(method: string, url: string, data?: any): void {
    if (this.shouldLog) {
      console.group(`🌐 API ${method} ${url}`);
      if (data) {
        console.log('Data:', data);
      }
      console.groupEnd();
    }
  }

  // برای نمایش اطلاعات navigation
  navigation(from: string, to: string): void {
    if (this.shouldLog) {
      console.log(`🧭 Navigation: ${from} → ${to}`);
    }
  }
}

export const logger = new Logger();
