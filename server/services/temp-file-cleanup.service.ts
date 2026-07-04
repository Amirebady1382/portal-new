/**
 * سرویس پاکسازی خودکار فایل‌های موقت
 * این سرویس به صورت دوره‌ای فایل‌های موقت قدیمی را پاک می‌کند
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export class TempFileCleanupService {
  private isRunning = false;
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * شروع سرویس پاکسازی خودکار
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Temp file cleanup service is already running', 'temp-cleanup');
      return;
    }

    logger.info('Starting temp file cleanup service', 'temp-cleanup');
    this.isRunning = true;

    // اجرای فوری یک بار
    this.cleanup().catch(error => {
      logger.error('Initial cleanup failed', 'temp-cleanup', error as Error);
    });

    // تنظیم cleanup دوره‌ای
    this.intervalId = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Scheduled cleanup failed', 'temp-cleanup', error as Error);
      });
    }, this.CLEANUP_INTERVAL_MS);

    logger.info(`Cleanup scheduled every ${this.CLEANUP_INTERVAL_MS / 1000 / 60} minutes`, 'temp-cleanup');
  }

  /**
   * توقف سرویس پاکسازی
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping temp file cleanup service', 'temp-cleanup');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * پاکسازی فایل‌های موقت قدیمی
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Starting temp file cleanup', 'temp-cleanup');

      // بررسی وجود پوشه temp
      try {
        await fs.access(this.TEMP_DIR);
      } catch {
        logger.debug('Temp directory does not exist, skipping cleanup', 'temp-cleanup');
        return;
      }

      const now = Date.now();
      const files = await fs.readdir(this.TEMP_DIR);
      
      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        // فقط فایل‌های temp_report_ را پردازش کن
        if (!file.startsWith('temp_report_')) {
          continue;
        }

        const filePath = path.join(this.TEMP_DIR, file);

        try {
          const stats = await fs.stat(filePath);
          const fileAge = now - stats.mtimeMs;

          // اگر فایل قدیمی‌تر از MAX_AGE باشد، حذف کن
          if (fileAge > this.MAX_AGE_MS) {
            await fs.unlink(filePath);
            deletedCount++;
            totalSize += stats.size;
            logger.debug(`Deleted old temp file: ${file} (age: ${Math.round(fileAge / 1000 / 60)} minutes)`, 'temp-cleanup');
          }
        } catch (error) {
          logger.warn(`Failed to process temp file: ${file}`, 'temp-cleanup', error as Error);
        }
      }

      if (deletedCount > 0) {
        const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
        logger.info(`Cleanup completed: deleted ${deletedCount} files (${sizeMB} MB)`, 'temp-cleanup');
      } else {
        logger.debug('Cleanup completed: no old files found', 'temp-cleanup');
      }

    } catch (error) {
      logger.error('Temp file cleanup error', 'temp-cleanup', error as Error);
      throw error;
    }
  }

  /**
   * پاکسازی فوری تمام فایل‌های temp (استفاده در shutdown)
   */
  async cleanupAll(): Promise<void> {
    try {
      logger.info('Cleaning up all temp files', 'temp-cleanup');

      try {
        await fs.access(this.TEMP_DIR);
      } catch {
        return;
      }

      const files = await fs.readdir(this.TEMP_DIR);
      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('temp_report_')) {
          continue;
        }

        const filePath = path.join(this.TEMP_DIR, file);

        try {
          await fs.unlink(filePath);
          deletedCount++;
        } catch (error) {
          logger.warn(`Failed to delete temp file: ${file}`, 'temp-cleanup', error as Error);
        }
      }

      logger.info(`All temp files cleaned: ${deletedCount} files deleted`, 'temp-cleanup');
    } catch (error) {
      logger.error('Cleanup all error', 'temp-cleanup', error as Error);
    }
  }

  /**
   * دریافت آمار فایل‌های موقت
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldFiles: number;
    oldSize: number;
  }> {
    try {
      await fs.access(this.TEMP_DIR);
    } catch {
      return { totalFiles: 0, totalSize: 0, oldFiles: 0, oldSize: 0 };
    }

    const now = Date.now();
    const files = await fs.readdir(this.TEMP_DIR);
    
    let totalFiles = 0;
    let totalSize = 0;
    let oldFiles = 0;
    let oldSize = 0;

    for (const file of files) {
      if (!file.startsWith('temp_report_')) {
        continue;
      }

      const filePath = path.join(this.TEMP_DIR, file);

      try {
        const stats = await fs.stat(filePath);
        totalFiles++;
        totalSize += stats.size;

        const fileAge = now - stats.mtimeMs;
        if (fileAge > this.MAX_AGE_MS) {
          oldFiles++;
          oldSize += stats.size;
        }
      } catch (error) {
        // Ignore errors for individual files
      }
    }

    return { totalFiles, totalSize, oldFiles, oldSize };
  }
}

// Singleton instance
export const tempFileCleanupService = new TempFileCleanupService();

