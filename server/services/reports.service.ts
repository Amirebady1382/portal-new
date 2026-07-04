import { storage } from "../storage";

export interface SystemStats {
  totalUsers: number;
  totalCompanies: number;
  totalDocuments: number;
  activeUsers: number;
  recentActivity: any[];
}

export interface InvestmentStats {
  totalCompanies: number;
  activeCompanies: number;
  totalCapital: number;
  totalEmployees: number;
  averageCapital: number;
  sectorDistribution: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    capital: number;
  }>;
  lastUpdate: string;
}

export interface AdministrativeStats {
  totalDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  processingRate: number;
  totalCompanies: number;
  categoryDistribution: Record<string, number>;
  monthlyProcessing: Array<{
    month: string;
    total: number;
    approved: number;
    rejected: number;
  }>;
  averageProcessingTime: string;
  lastUpdate: string;
}

export interface FundOverview {
  kpis: {
    totalCommitted: number;
    totalInvested: number;
    defaultRate: number;
    averageIRR: number;
    activeCompanies: number;
  };
  receivables: {
    collected: number;
    pending: number;
    overdue: number;
  };
  industryDistribution: Array<{
    industry: string;
    seed: number;
    growth: number;
  }>;
  cashFlowTrend: Array<{
    month: string;
    cash: number;
  }>;
  resourcesOverTime: Array<{
    month: string;
    resources: number;
  }>;
  fundStatus: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  lastUpdate: string;
}

export interface ReportData {
  type: string;
  period: string;
  summary: Record<string, any>;
  generatedAt: string;
}

export class ReportsService {
  /**
   * Get system-wide statistics for admin dashboard
   */
  async getSystemStats(): Promise<any> {
    return await storage.getSystemStats();
  }

  /**
   * Get investment unit statistics
   */
  async getInvestmentStats(): Promise<InvestmentStats> {
    // Get all companies in investment department
    const companies = await storage.getCompanies({
      department: "investment",
      limit: 1000
    });
    
    // Calculate statistics
    const activeCompanies = companies.filter((c: any) => c.status === "active");
    const totalCapital = companies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0);
    const totalEmployees = companies.reduce((sum: number, c: any) => sum + (c.employeeCount || 0), 0);
    
    // Calculate sector distribution
    const sectorDistribution: Record<string, number> = {};
    companies.forEach((company: any) => {
      const sector = company.industry || "سایر";
      sectorDistribution[sector] = (sectorDistribution[sector] || 0) + 1;
    });
    
    // Monthly investment trend (last 6 months)
    const monthlyTrend = this.calculateMonthlyTrend(companies);
    
    return {
      totalCompanies: companies.length,
      activeCompanies: activeCompanies.length,
      totalCapital,
      totalEmployees,
      averageCapital: companies.length > 0 ? Math.round(totalCapital / companies.length) : 0,
      sectorDistribution,
      monthlyTrend,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get administrative unit statistics
   */
  async getAdministrativeStats(): Promise<AdministrativeStats> {
    // Get all documents for administrative department
    const documents = await storage.getDocuments({
      department: "administrative"
    });
    
    // Get all companies in administrative department
    const companies = await storage.getCompanies({
      department: "administrative",
      limit: 1000
    });
    
    // Calculate document statistics
    const pendingDocs = documents.filter((d: any) => d.status === "pending");
    const approvedDocs = documents.filter((d: any) => d.status === "approved");
    const rejectedDocs = documents.filter((d: any) => d.status === "rejected");
    
    // Document categories distribution
    const categoryDistribution: Record<string, number> = {};
    documents.forEach((doc: any) => {
      const category = doc.category || "other";
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });
    
    // Monthly document processing trend
    const monthlyProcessing = this.calculateMonthlyProcessing(documents);
    
    return {
      totalDocuments: documents.length,
      pendingDocuments: pendingDocs.length,
      approvedDocuments: approvedDocs.length,
      rejectedDocuments: rejectedDocs.length,
      processingRate: documents.length > 0 ? Math.round((approvedDocs.length / documents.length) * 100) : 0,
      totalCompanies: companies.length,
      categoryDistribution,
      monthlyProcessing,
      averageProcessingTime: "۲ روز", // This would need actual calculation
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get fund overview statistics
   */
  async getFundOverview(): Promise<FundOverview> {
    // Get all companies
    const allCompanies = await storage.getCompanies({ limit: 1000 });
    
    // Calculate KPIs
    const activeCompanies = allCompanies.filter((c: any) => c.status === "active");
    const totalCommittedCapital = allCompanies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0);
    const totalInvestedCapital = activeCompanies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0);
    
    // Calculate receivables (این بخش نیاز به جدول جداگانه دارد، فعلا مقادیر نمونه)
    const receivables = {
      collected: Math.round(totalInvestedCapital * 0.65),
      pending: Math.round(totalInvestedCapital * 0.20),
      overdue: Math.round(totalInvestedCapital * 0.15)
    };
    
    // Industry distribution
    const industryDistribution = this.calculateIndustryDistribution(allCompanies);
    
    // Monthly cash flow trend
    const cashFlowTrend = this.calculateCashFlowTrend(allCompanies);
    
    // Resources over time
    const resourcesOverTime = this.calculateResourcesOverTime(allCompanies);
    
    // Overall fund status (income vs expense) - نمونه
    const fundStatus = this.calculateFundStatus();
    
    return {
      kpis: {
        totalCommitted: totalCommittedCapital,
        totalInvested: totalInvestedCapital,
        defaultRate: 3.5, // نمونه - باید محاسبه شود
        averageIRR: 27, // نمونه - باید محاسبه شود
        activeCompanies: activeCompanies.length
      },
      receivables,
      industryDistribution,
      cashFlowTrend,
      resourcesOverTime,
      fundStatus,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Generate custom reports based on type and date range
   */
  async generateReport(
    type: string = "general", 
    startDate?: Date, 
    endDate?: Date
  ): Promise<ReportData> {
    // Get date range
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    let reportData: any = {};
    
    switch (type) {
      case "monthly":
        reportData = await this.generateMonthlyReport(start, end);
        break;
        
      case "investment":
        reportData = await this.generateInvestmentReport(start, end);
        break;
        
      default:
        reportData = await this.generateGeneralReport(start, end);
    }
    
    return {
      ...reportData,
      generatedAt: new Date().toISOString()
    };
  }

  // Private helper methods
  private calculateMonthlyTrend(companies: any[]) {
    const monthlyTrend = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthCompanies = companies.filter((c: any) => {
        const regDate = new Date(c.registrationDate);
        return regDate.getMonth() === monthDate.getMonth() && 
               regDate.getFullYear() === monthDate.getFullYear();
      });
      
      monthlyTrend.push({
        month: monthDate.toLocaleDateString('fa-IR', { month: 'long' }),
        count: monthCompanies.length,
        capital: monthCompanies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0)
      });
    }
    
    return monthlyTrend;
  }

  private calculateMonthlyProcessing(documents: any[]) {
    const monthlyProcessing = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthDocs = documents.filter((d: any) => {
        const uploadDate = new Date(d.uploadedAt);
        return uploadDate.getMonth() === monthDate.getMonth() && 
               uploadDate.getFullYear() === monthDate.getFullYear();
      });
      
      monthlyProcessing.push({
        month: monthDate.toLocaleDateString('fa-IR', { month: 'long' }),
        total: monthDocs.length,
        approved: monthDocs.filter((d: any) => d.status === "approved").length,
        rejected: monthDocs.filter((d: any) => d.status === "rejected").length
      });
    }
    
    return monthlyProcessing;
  }

  private calculateIndustryDistribution(companies: any[]) {
    const industryDistribution: { [key: string]: { seed: number, growth: number } } = {};
    
    companies.forEach((company: any) => {
      const industry = company.industry || "سایر";
      if (!industryDistribution[industry]) {
        industryDistribution[industry] = { seed: 0, growth: 0 };
      }
      // فرض می‌کنیم شرکت‌های با سرمایه کمتر از 5 میلیارد در مرحله seed هستند
      if ((company.capital || 0) < 5000000000) {
        industryDistribution[industry].seed += 1;
      } else {
        industryDistribution[industry].growth += 1;
      }
    });
    
    return Object.entries(industryDistribution).map(([industry, data]) => ({
      industry,
      ...data
    }));
  }

  private calculateCashFlowTrend(companies: any[]) {
    const cashFlowTrend = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthCompanies = companies.filter((c: any) => {
        const regDate = new Date(c.registrationDate);
        return regDate <= monthDate;
      });
      
      const monthCapital = monthCompanies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0);
      cashFlowTrend.push({
        month: monthDate.toLocaleDateString('fa-IR', { month: 'long' }),
        cash: monthCapital / 1000000000 // Convert to billions
      });
    }
    
    return cashFlowTrend;
  }

  private calculateResourcesOverTime(companies: any[]) {
    const resourcesOverTime = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthCompanies = companies.filter((c: any) => {
        const regDate = new Date(c.registrationDate);
        return regDate <= monthDate;
      });
      
      resourcesOverTime.push({
        month: monthDate.toLocaleDateString('fa-IR', { month: 'long' }),
        resources: monthCompanies.length
      });
    }
    
    return resourcesOverTime;
  }

  private calculateFundStatus() {
    const fundStatus = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      fundStatus.push({
        month: monthDate.toLocaleDateString('fa-IR', { month: 'long' }),
        income: 2.0 + (Math.random() * 1.5), // نمونه - باید از داده‌های واقعی استفاده شود
        expense: 1.5 + (Math.random() * 1.0) // نمونه - باید از داده‌های واقعی استفاده شود
      });
    }
    
    return fundStatus;
  }

  private async generateMonthlyReport(start: Date, end: Date) {
    const companies = await storage.getCompanies({ limit: 1000 });
    const documents = await storage.getDocuments({});
    
    return {
      type: "monthly",
      period: `${start.toLocaleDateString('fa-IR')} تا ${end.toLocaleDateString('fa-IR')}`,
      summary: {
        newCompanies: companies.filter((c: any) => {
          const regDate = new Date(c.registrationDate);
          return regDate >= start && regDate <= end;
        }).length,
        totalDocuments: documents.filter((d: any) => {
          const uploadDate = new Date(d.uploadedAt);
          return uploadDate >= start && uploadDate <= end;
        }).length,
        totalCapital: companies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0)
      }
    };
  }

  private async generateInvestmentReport(start: Date, end: Date) {
    const investmentCompanies = await storage.getCompanies({ 
      department: "investment",
      limit: 1000 
    });
    
    return {
      type: "investment",
      period: `${start.toLocaleDateString('fa-IR')} تا ${end.toLocaleDateString('fa-IR')}`,
      summary: {
        totalCompanies: investmentCompanies.length,
        totalInvestment: investmentCompanies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0),
        averageInvestment: investmentCompanies.length > 0 ? 
          Math.round(investmentCompanies.reduce((sum: number, c: any) => sum + (c.capital || 0), 0) / investmentCompanies.length) : 0
      }
    };
  }

  private async generateGeneralReport(start: Date, end: Date) {
    const allStats = await Promise.all([
      storage.getCompanies({ limit: 1000 }),
      storage.getDocuments({}),
      storage.getUsers({ limit: 1000 })
    ]);
    
    return {
      type: "general",
      period: `${start.toLocaleDateString('fa-IR')} تا ${end.toLocaleDateString('fa-IR')}`,
      summary: {
        totalCompanies: allStats[0].length,
        totalDocuments: allStats[1].length,
        totalUsers: allStats[2].length,
        activeUsers: allStats[2].filter((u: any) => u.isActive).length
      }
    };
  }
}

export const reportsService = new ReportsService(); 