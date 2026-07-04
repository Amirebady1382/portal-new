import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth";
import { healthService } from "../services/health.service";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /health - Simple health check for load balancers
 */
router.get("/", async (req, res) => {
  try {
    const health = await healthService.getSimpleHealth();
    
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint failed', 'health-check', error instanceof Error ? error : new Error(String(error)));
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed'
    });
  }
});

/**
 * GET /health/detailed - Comprehensive health status (admin only)
 */
router.get("/detailed", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const healthStatus = await healthService.getHealthStatus();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    logger.error('Detailed health check failed', 'health-check', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت وضعیت سلامت سیستم',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/logs - Get recent system logs (admin only)
 */
router.get("/logs", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    
    let logs = logger.getRecentLogs(limit);
    
    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level.toLowerCase() === level.toLowerCase());
    }
    
    const logStats = logger.getLogStats();
    
    res.json({
      success: true,
      data: {
        logs,
        stats: logStats,
        total: logs.length
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve logs', 'health-check', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لاگ‌های سیستم'
    });
  }
});

/**
 * DELETE /health/logs - Clear recent logs (admin only)
 */
router.delete("/logs", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    logger.clearRecentLogs();
    
    res.json({
      success: true,
      message: 'لاگ‌های اخیر پاک شدند'
    });
  } catch (error) {
    logger.error('Failed to clear logs', 'health-check', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      message: 'خطا در پاک کردن لاگ‌ها'
    });
  }
});

/**
 * GET /health/cache - Get cache statistics (admin only)
 */
router.get("/cache", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const { cacheService } = await import("../services/cache.service");
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to retrieve cache stats', 'health-check', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت آمار کش'
    });
  }
});

/**
 * DELETE /health/cache - Clear cache (admin only)
 */
router.delete("/cache", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const { cacheService } = await import("../services/cache.service");
    cacheService.clear();
    
    res.json({
      success: true,
      message: 'کش سیستم پاک شد'
    });
  } catch (error) {
    logger.error('Failed to clear cache', 'health-check', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      message: 'خطا در پاک کردن کش'
    });
  }
});

export { router as healthRoutes };
