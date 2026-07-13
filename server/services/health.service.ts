import { db } from "../db";
import { logger } from "../utils/logger";
import { cacheService } from "./cache.service";
import { socketManager } from "./socket-manager";
import { otpService } from "./otp.service";
import { smsService } from "./sms.service";
import { rasmioService } from "./rasmio";
import { gapGPTService } from "./gap-gpt.service";
import { perplexityResearchService } from "./perplexity-research.service";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    socket: HealthCheck;
    filesystem: HealthCheck;
    externalServices: HealthCheck;
    memory: HealthCheck;
    logging: HealthCheck;
  };
  metrics: SystemMetrics;
}

export interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
  lastCheck: string;
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  diskUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  activeConnections: number;
  cacheStats: {
    size: number;
    hitRate?: number;
  };
  logStats: {
    total: number;
    errorRate: number;
    byLevel: Record<string, number>;
  };
}

export class HealthService {
  private startTime: number;
  private version: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const [
      databaseCheck,
      cacheCheck,
      socketCheck,
      filesystemCheck,
      externalServicesCheck,
      memoryCheck,
      loggingCheck,
      metrics
    ] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkSocket(),
      this.checkFilesystem(),
      this.checkExternalServices(),
      this.checkMemory(),
      this.checkLogging(),
      this.getSystemMetrics()
    ]);

    const checks = {
      database: databaseCheck,
      cache: cacheCheck,
      socket: socketCheck,
      filesystem: filesystemCheck,
      externalServices: externalServicesCheck,
      memory: memoryCheck,
      logging: loggingCheck
    };

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version: this.version,
      checks,
      metrics
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple connectivity test
      const result = await db.execute("SELECT 1 as test");
      const responseTime = Date.now() - startTime;
      
      if (result.rows.length === 0) {
        throw new Error("Database query returned no results");
      }

      // Additional health checks
      const userCountResult = await db.execute("SELECT COUNT(*) as count FROM users");
      const userCount = (userCountResult.rows[0] as any)?.count || 0;

      return {
        status: responseTime > 1000 ? 'degraded' : 'up',
        responseTime,
        message: responseTime > 1000 ? 'Database response is slow' : 'Database is healthy',
        details: {
          userCount,
          queryTime: responseTime
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed', 'health-check', error instanceof Error ? error : new Error(String(error)));
      
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Database connection failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check cache service status
   */
  private async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health-check-test';
      const testValue = { timestamp: Date.now() };
      
      // Test cache operations
      cacheService.set(testKey, testValue, 10);
      const retrieved = cacheService.get(testKey);
      
      if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
        throw new Error('Cache read/write test failed');
      }
      
      cacheService.delete(testKey);
      const stats = cacheService.getStats();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        responseTime,
        message: 'Cache is working properly',
        details: {
          cacheSize: stats.size,
          totalKeys: stats.keys.length
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Cache service failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check Socket.io status
   */
  private async checkSocket(): Promise<HealthCheck> {
    try {
      const onlineUsers = socketManager.getOnlineUsers();
      
      return {
        status: 'up',
        message: 'Socket service is running',
        details: {
          onlineUsers,
          isInitialized: socketManager !== null
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Socket service failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check filesystem access
   */
  private async checkFilesystem(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists and is writable
      await fs.access(uploadsDir, fs.constants.F_OK | fs.constants.W_OK);
      
      // Test file operations
      const testFile = path.join(uploadsDir, 'health-check-test.txt');
      const testContent = `Health check at ${new Date().toISOString()}`;
      
      await fs.writeFile(testFile, testContent);
      const readContent = await fs.readFile(testFile, 'utf-8');
      await fs.unlink(testFile);
      
      if (readContent !== testContent) {
        throw new Error('File read/write test failed');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        responseTime,
        message: 'Filesystem is accessible',
        details: {
          uploadsDir,
          testPassed: true
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Filesystem check failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

    /**
     * Check external services (SMS, Rasmio, AI services)
     */
    private async checkExternalServices(): Promise<HealthCheck> {
      const startTime = Date.now();
      const services: Record<string, any> = {};

      try {
        // Check SMS service configuration
        try {
          const testPhone = '09123456789';
          const isValidPhone = smsService.validatePhoneNumber(testPhone);
          services.sms = {
            configured: true,
            phoneValidation: isValidPhone
          };
        } catch (error) {
          services.sms = {
            configured: false,
            error: error instanceof Error ? error.message : 'SMS service error'
          };
        }

        // Check Rasmio service
        try {
          const healthCheck = await rasmioService.healthCheck();
          services.rasmio = {
            isOnline: healthCheck.isOnline,
            responseTime: healthCheck.responseTime
          };
        } catch (error) {
          services.rasmio = {
            isOnline: false,
            error: error instanceof Error ? error.message : 'Rasmio service error'
          };
        }

        // Check Claude (direct API — may be network-blocked on some servers; GapGPT is the designed fallback)
        try {
          const disableDirect = process.env.DISABLE_DIRECT_CLAUDE === 'true';
          if (disableDirect) {
            // Test Claude via GapGPT
            const start = Date.now();
            await gapGPTService.generateResponse('ping');
            services.claude = { isOnline: true, responseTime: Date.now() - start, model: 'claude-sonnet-4-6 (via GapGPT)' };
          } else {
            const apiKey = process.env.ANTHROPIC_API_KEY || '';
            if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
            const anthropic = new Anthropic({ apiKey });
            const start = Date.now();
            const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
            await anthropic.messages.create({
              model,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'ping' }]
            }, { timeout: 5000 });
            services.claude = { isOnline: true, responseTime: Date.now() - start, model };
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Claude error';
          // Network-level failures (server can't reach api.anthropic.com) are not config issues
          const isNetworkBlock = msg.includes('Premature close') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('fetch failed');
          services.claude = {
            isOnline: false,
            networkBlocked: isNetworkBlock,
            error: isNetworkBlock ? 'Network blocked (GapGPT fallback active)' : msg
          };
        }

        // Check GapGPT
        try {
          const start = Date.now();
          await gapGPTService.generateResponse('ping');
          services.gapGpt = { isOnline: true, responseTime: Date.now() - start };
        } catch (error) {
          services.gapGpt = { isOnline: false, error: error instanceof Error ? error.message : 'GapGPT error' };
        }

        // Check Perplexity (sonar-deep-research requires min 16 tokens)
        try {
          const start = Date.now();
          await perplexityResearchService.research('ping', { maxTokens: 50 });
          services.perplexity = { isOnline: true, responseTime: Date.now() - start };
        } catch (error) {
          services.perplexity = { isOnline: false, error: error instanceof Error ? error.message : 'Perplexity error' };
        }

        const responseTime = Date.now() - startTime;
        const hasFailures = Object.values(services).some((service: any) =>
          service.configured === false || (service.isOnline === false && service.rasmio === undefined) || (service.isOnline === false)
        );

        return {
          status: hasFailures ? 'degraded' : 'up',
          responseTime,
          message: hasFailures ? 'Some external services have issues' : 'External services are healthy',
          details: services,
          lastCheck: new Date().toISOString()
        };
      } catch (error) {
        return {
          status: 'down',
          responseTime: Date.now() - startTime,
          message: error instanceof Error ? error.message : 'External services check failed',
          lastCheck: new Date().toISOString()
        };
      }
    }
  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheck> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;
      
      const status = memoryPercentage > 90 ? 'degraded' : 'up';
      const message = memoryPercentage > 90 ? 
        'High memory usage detected' : 
        'Memory usage is normal';
      
      return {
        status,
        message,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round(memoryPercentage),
          external: Math.round(memUsage.external / 1024 / 1024), // MB
          rss: Math.round(memUsage.rss / 1024 / 1024) // MB
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Memory check failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Check logging system
   */
  private async checkLogging(): Promise<HealthCheck> {
    try {
      const logStats = logger.getLogStats();
      const recentLogs = logger.getRecentLogs(10);
      
      const status = logStats.errorRate > 50 ? 'degraded' : 'up';
      const message = logStats.errorRate > 50 ? 
        'High error rate in logs' : 
        'Logging system is healthy';
      
      return {
        status,
        message,
        details: {
          totalLogs: logStats.total,
          errorRate: Math.round(logStats.errorRate),
          recentErrorCount: recentLogs.filter(log => log.level === 'ERROR').length,
          byLevel: logStats.byLevel
        },
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Logging check failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const cacheStats = cacheService.getStats();
    const logStats = logger.getLogStats();
    
    return {
      memoryUsage: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      diskUsage: {
        used: 0, // Would need additional implementation
        available: 0,
        percentage: 0
      },
      activeConnections: socketManager.getOnlineUsers(),
      cacheStats: {
        size: cacheStats.size,
        hitRate: 0 // Would need additional tracking
      },
      logStats: {
        total: logStats.total,
        errorRate: Math.round(logStats.errorRate),
        byLevel: logStats.byLevel
      }
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('down')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get simple health check (for load balancer)
   */
  async getSimpleHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      // Quick database check
      await db.execute("SELECT 1");
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const healthService = new HealthService();
