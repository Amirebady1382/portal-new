import { storage } from "../storage";
import { rasmioService } from "./rasmio";
import { aiAnalysisService } from "./ai-analysis";

export interface Company {
  id: number;
  name: string;
  nationalId: string;
  type: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  status: string;
  establishedYear: number | null;
  employeeCount: number | null;
  capital: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyData {
  name: string;
  nationalId: string;
  type: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  status?: string;
  establishedYear?: number;
  employeeCount?: number;
  capital?: string | number; // Can be string or number, will be converted to string
  primaryUnit?: string;
}

export interface CompanyFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  department?: string;
  userId?: number;
}

export class CompaniesService {
  /**
   * Get companies with filters
   */
  async getCompanies(filters: CompanyFilters): Promise<any> {
    return await storage.getCompanies({
      page: filters.page || 1,
      limit: filters.limit || 20,
      status: filters.status,
      search: filters.search,
      department: filters.department,
      userId: filters.userId,
    });
  }

  /**
   * Get single company by ID
   */
  async getCompany(companyId: number): Promise<Company | null> {
    const company = await storage.getCompany(companyId);
    return company ? company as Company : null;
  }

  /**
   * Get company by national ID
   */
  async getCompanyByNationalId(nationalId: string): Promise<Company | null> {
    const company = await storage.getCompanyByNationalId(nationalId);
    return company ? company as Company : null;
  }

  /**
   * Create new company
   */
  async createCompany(companyData: CreateCompanyData): Promise<Company> {
    // Validate national ID format (11 digits)
    if (!/^\d{11}$/.test(companyData.nationalId)) {
      throw new Error("شناسه ملی باید ۱۱ رقم باشد");
    }

    // Check if company with this national ID exists
    const existingCompany = await this.getCompanyByNationalId(companyData.nationalId);
    if (existingCompany) {
      throw new Error("شرکتی با این شناسه ملی قبلاً ثبت شده است");
    }

    // Ensure primary_unit is set for company creation
    const companyWithUnit = {
      ...companyData,
      primaryUnit: companyData.primaryUnit || "investment", // Default to investment if not specified
      status: companyData.status || "pending"
    };

    const createdCompany = await storage.createCompany(companyWithUnit as any);
    return createdCompany as Company;
  }

  /**
   * Update company
   */
  async updateCompany(companyId: number, updateData: Partial<CreateCompanyData>): Promise<Company | null> {
    const updated = await storage.updateCompany(companyId, updateData as any);
    return updated ? updated as Company : null;
  }

  /**
   * Delete company (admin only)
   */
  async deleteCompany(companyId: number): Promise<boolean> {
    return await storage.deleteCompany(companyId);
  }

  /**
   * Validate company with Rasmio API
   */
  async validateCompany(nationalId: string, companyName: string): Promise<any> {
    if (!nationalId || !companyName) {
      throw new Error("شناسه ملی و نام شرکت الزامی است");
    }

    return await rasmioService.validateCompany(nationalId, companyName);
  }

  /**
   * Enrich company data with Rasmio API
   */
  async enrichCompanyData(companyId: number): Promise<any> {
    const company = await this.getCompany(companyId);
    if (!company) {
      throw new Error("شرکت یافت نشد");
    }

    const enrichedData = await rasmioService.enrichCompanyData(company.nationalId);
    
    // Save to database so it persists
    if (enrichedData && !enrichedData.error) {
      await storage.updateCompany(companyId, {
        rasmioData: JSON.stringify(enrichedData.basicInfo || enrichedData)
      });
    }

    return enrichedData;
  }

  /**
   * Update company info panels (teamInfo, productInfo, marketInfo, financialInfo)
   */
  async updateCompanyInfo(companyId: number, infoType: 'teamInfo' | 'productInfo' | 'marketInfo' | 'financialInfo', data: any): Promise<Company | null> {
    // Validate info type
    if (!['teamInfo', 'productInfo', 'marketInfo', 'financialInfo'].includes(infoType)) {
      throw new Error("نوع اطلاعات نامعتبر است");
    }

    const updated = await storage.updateCompanyInfo(companyId, infoType, data);
    return updated ? updated as Company : null;
  }

  /**
   * Check if user has access to company
   */
  async userHasAccessToCompany(userId: number, companyId: number): Promise<boolean> {
    return await storage.userHasAccessToCompany(userId, companyId);
  }

  /**
   * Associate user with company
   */
  async associateUserWithCompany(userId: number, companyId: number, isOwner: boolean = false): Promise<void> {
    await storage.associateUserWithCompany(userId, companyId, isOwner);
  }

  /**
   * Get AI analysis for company
   */
  async getCompanyAIAnalysis(companyId: number, forceRefresh: boolean = false, serviceId?: number, onlyCache: boolean = false): Promise<any> {
    console.log(`🎯 AI Analysis Request: Company ${companyId} - ${forceRefresh ? 'FORCE REFRESH' : 'CACHE FIRST'}${onlyCache ? ' (ONLY CACHE)' : ''}`);

    // Make sure the company exists
    const company = await this.getCompany(companyId);
    if (!company) {
      console.log(`❌ Company ${companyId} not found`);
      throw new Error("شرکت یافت نشد");
    }

    console.log(`📊 Company ${companyId} found: ${company.name}`);

    // Check if we have cached analysis and it's not a forced refresh
    if (!forceRefresh && (company as any).aiAnalysisData) {
      try {
        const cachedAnalysis = typeof (company as any).aiAnalysisData === 'string'
          ? JSON.parse((company as any).aiAnalysisData)
          : (company as any).aiAnalysisData;

        // Check if cached analysis has required structure
        if (cachedAnalysis && cachedAnalysis.teamAnalysis && cachedAnalysis.overallRecommendation) {
          console.log(`✅ Using cached AI analysis for company ${companyId}`);
          return {
            ...cachedAnalysis,
            fromCache: true,
            cacheTimestamp: cachedAnalysis.analysisTimestamp
          };
        }
      } catch (error) {
        console.log(`⚠️ Error parsing cached analysis:`, error);
      }
    }

    // If we only wanted cache and didn't find valid cache, return null or empty
    if (onlyCache) {
      console.log(`ℹ️ No valid cache found and onlyCache is true. Returning null.`);
      return null;
    }

    if (forceRefresh) {
      console.log(`🔄 Force refresh requested - generating fresh analysis`);
    } else {
      console.log(`🆕 No valid cached analysis found - generating fresh analysis`);
    }

    // Build the data object expected by the AIAnalysisService
    const companyData: any = {
      basicInfo: {
        id: company.id,
        name: company.name,
        title: company.name,
        nationalId: company.nationalId,
        capital: company.capital,
        address: company.address,
        status: company.status,
        registrationDate: (company as any).registrationDate,
        financialSummaryData: (company as any).financialSummaryData, // اضافه شده برای تحلیل مالی
      },
      companyPanels: {
        teamInfo: (company as any).teamInfo ? (typeof (company as any).teamInfo === 'string' ? JSON.parse((company as any).teamInfo) : (company as any).teamInfo) : undefined,
        productInfo: (company as any).productInfo ? (typeof (company as any).productInfo === 'string' ? JSON.parse((company as any).productInfo) : (company as any).productInfo) : undefined,
        marketInfo: (company as any).marketInfo ? (typeof (company as any).marketInfo === 'string' ? JSON.parse((company as any).marketInfo) : (company as any).marketInfo) : undefined,
        financialInfo: (company as any).financialInfo ? (typeof (company as any).financialInfo === 'string' ? JSON.parse((company as any).financialInfo) : (company as any).financialInfo) : undefined,
      },
    };

    // Parse Rasmio (enriched) data if available
    if ((company as any).rasmioData) {
      try {
        const rasmio = typeof (company as any).rasmioData === "object" ? (company as any).rasmioData : JSON.parse((company as any).rasmioData as unknown as string);
        companyData.managers = rasmio.managers || rasmio.boardMembers || [];
        companyData.activities = rasmio.activities || [];
        companyData.news = rasmio.ads || rasmio.news || [];
      } catch (err) {
        console.warn("Unable to parse rasmioData for AI analysis", err);
      }
    }

    // Attach documents & form submissions
    const [documents, formSubmissions] = await Promise.all([
      storage.getDocumentsByCompany(companyId),
      storage.getFormSubmissions({ companyId }),
    ]);

    companyData.documents = documents.map((doc) => ({
      id: doc.id,
      name: doc.originalName,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      status: doc.status,
      category: doc.category,
      description: doc.description,
    }));

    // Enrich form submissions with requirement details for meaningful names
    const enrichedFormSubmissions = await Promise.all(
      formSubmissions.map(async (submission) => {
        try {
          const requirement = await storage.getDocumentRequirement(submission.requirementId);
          return {
            ...submission,
            requirement
          };
        } catch (error) {
          console.warn(`Could not load requirement for submission ${submission.id}:`, error);
          return submission;
        }
      })
    );
    companyData.formSubmissions = enrichedFormSubmissions;

    // Add serviceId to companyData if provided
    if (serviceId) {
      companyData.serviceId = serviceId;
      console.log(`🎯 AI Analysis will focus on service ${serviceId}`);
    }

    console.log(`🤖 Running FRESH AI analysis for company ${companyId}...`);
    const analysisResult = await aiAnalysisService.analyzeCompany(companyData);

    // Debug: Log what we got from AI analysis
    console.log('🔍 AI Analysis Result Keys:', Object.keys(analysisResult));
    if (analysisResult.formAnalysis) {
      console.log('✅ formAnalysis در نتیجه نهایی موجود است');
      console.log('   - نمره:', analysisResult.formAnalysis.score);
      console.log('   - فرم‌های تکمیل شده:', analysisResult.formAnalysis.completedForms?.length || 0);
    } else {
      console.log('❌ formAnalysis در نتیجه نهایی موجود نیست');
    }

    // Add timestamp to analysis result
    const timestampedResult = {
      ...analysisResult,
      analysisTimestamp: new Date().toISOString(),
      fromCache: false
    };

    console.log(`✅ FRESH AI analysis completed for company ${companyId}`);

    // Save the analysis result to database for future caching
    try {
      await storage.updateCompany(companyId, {
        aiAnalysisData: JSON.stringify(timestampedResult)
      });
      console.log(`💾 AI analysis cached to database for company ${companyId}`);
    } catch (error) {
      console.error(`❌ Error caching AI analysis for company ${companyId}:`, error);
      // Don't throw error, just continue without caching
    }

    return timestampedResult;
  }
}

export const companiesService = new CompaniesService(); 