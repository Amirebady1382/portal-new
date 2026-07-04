export interface HealthStatus {
  status: string;
  timestamp: string;
  message: string;
  uptime?: number;
  version?: string;
  environment?: string;
}

export class MiscellaneousService {
  /**
   * Get system health status
   */
  getHealthStatus(): HealthStatus {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      message: "سرور در حال اجرا است",
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || "development"
    };
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      environment: process.env.NODE_ENV || "development"
    };
  }

  /**
   * Validate system readiness
   */
  async validateSystemReadiness(): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const maxMemory = 1024 * 1024 * 1024; // 1GB threshold
    
    if (memUsage.heapUsed > maxMemory) {
      issues.push("بالا بودن مصرف حافظه");
    }
    
    // Check uptime (if too low, might indicate frequent restarts)
    if (process.uptime() < 30) {
      issues.push("uptime پایین سیستم");
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * Get API endpoints summary (for documentation/debugging)
   */
  getAPIEndpoints() {
    return {
      authentication: [
        "POST /api/login",
        "POST /api/login/verify",
        "POST /api/register",
        "GET /api/me"
      ],
      companies: [
        "GET /api/companies",
        "POST /api/companies",
        "GET /api/companies/:id",
        "PATCH /api/companies/:id"
      ],
      documents: [
        "GET /api/documents",
        "POST /api/companies/:id/documents",
        "GET /api/documents/:id/download"
      ],
      contracts: [
        "GET /api/contract/templates",
        "POST /api/contract/generate"
      ],
      administration: [
        "GET /api/admin/users",
        "GET /api/admin/monitoring",
        "DELETE /api/admin/users/:id"
      ],
      reports: [
        "GET /api/admin/stats",
        "GET /api/investment/stats",
        "GET /api/fund/overview"
      ],
      baleChat: [
        "POST /api/webhooks/bale",
        "GET /api/bale/conversations",
        "POST /api/bale/conversations/:id/messages"
      ],
      rasmio: [
        "GET /api/rasmio/company/:nationalId",
        "POST /api/companies/validate",
        "GET /api/rasmio/health"
      ],
      documentRequirements: [
        "GET /api/document-requirements",
        "POST /api/form-submissions"
      ]
    };
  }
}

export const miscellaneousService = new MiscellaneousService(); 