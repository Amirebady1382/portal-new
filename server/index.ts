import 'dotenv/config';

import { baleBotService } from "./services/bale-bot";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { initializeDatabase } from "./db";
import { runMigrations } from "./migration";
import otpRoutes from "./routes/otp.routes";
import { requestLoggingMiddleware } from "./middleware/logging";
import { logger } from "./utils/logger";
import path from "path";
import { fileURLToPath } from "url";
import { setupSecurityMiddleware, validateEnvironmentVariables } from "./middleware/security";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  globalErrorHandler,
  notFoundHandler,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler
} from "./middleware/errorHandler";
import { tempFileCleanupService } from "./services/temp-file-cleanup.service";

// Validate required environment variables
validateEnvironmentVariables();

// Setup global error handlers for unhandled rejections and exceptions
setupUnhandledRejectionHandler();
setupUncaughtExceptionHandler();

const app = express();
app.set('etag', false);

// Setup security middleware (helmet, rate limiting, etc.)
setupSecurityMiddleware(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware early
app.use(requestLoggingMiddleware);

// Add OTP routes
app.use('/api/otp', otpRoutes);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // راه‌اندازی اولیه دیتابیس
  try {
    await initializeDatabase();
    await runMigrations();
    await seedDatabase();
  } catch (error) {
    logger.error("خطا در راه‌اندازی دیتابیس", "startup", error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }

  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Secure static file serving for production
    const clientBuildPath = path.resolve(__dirname, '..', 'dist', 'public');
    app.use(express.static(clientBuildPath));

    // SPA routing support - catch-all route
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(clientBuildPath, 'index.html'));
    });
  }

  // Handle 404 errors for API routes only - must be after vite setup
  app.use('/api/*', notFoundHandler);

  // Global error handler - must be the last middleware
  app.use(globalErrorHandler);

  // Use port 5000 as configured for Replit
  const port = parseInt(process.env.PORT || "5000");
  const host = process.env.HOST || "0.0.0.0";


  server.listen(port, host, () => {
    logger.info(`سرور در حال اجرا در آدرس http://localhost:${port}`, "startup", { port, host, env: process.env.NODE_ENV });

    // شروع سرویس پاکسازی فایل‌های موقت
    tempFileCleanupService.start();

    // Register Bale Webhook
    baleBotService.setWebhookOnStartup().catch(err => {
      logger.error('Failed to set Bale webhook', 'startup', err);
    });
  });


  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} signal received. Starting graceful shutdown...`, "shutdown");

    // توقف سرویس پاکسازی
    tempFileCleanupService.stop();

    // پاکسازی فوری تمام فایل‌های موقت
    tempFileCleanupService.cleanupAll().catch(err => {
      logger.warn('Failed to cleanup temp files during shutdown', 'shutdown', err);
    });

    server.close(async () => {
      logger.info('HTTP server closed.', "shutdown");

      try {
        // Import socketManager here to avoid circular dependency
        const { socketManager } = await import('./services/socket-manager');
        socketManager.shutdown();

        // Close DB connections

        const { closeDatabase } = await import('./db');
        if (typeof closeDatabase === 'function') {
          await closeDatabase();
        }


        logger.info('Database connections closed.', "shutdown");
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', "shutdown", err);
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down', "shutdown");
      process.exit(1);
    }, 30000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
