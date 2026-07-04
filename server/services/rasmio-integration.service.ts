import { storage } from "../storage";
import { rasmioService } from "./rasmio";
import { logger } from "../utils/logger";

export interface CompanyValidationRequest {
  nationalId: string;
  companyName: string;
}

export interface CompanyValidationResult {
  isValid: boolean;
  company?: any;
  message?: string;
  error?: string;
}

export interface EnrichedCompanyData {
  basicInfo?: any;
  managers?: any[];
  activities?: any[];
  news?: any[];
  error?: string;
  [key: string]: any;
}

export interface PersonData {
  nationalId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  [key: string]: any;
}

export interface HealthStatus {
  isOnline: boolean;
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export class RasmioIntegrationService {
  /**
   * Validate company using Rasmio API
   */
  async validateCompany(nationalId: string, companyName: string): Promise<CompanyValidationResult> {
    if (!nationalId || !companyName) {
      throw new Error("شناسه ملی و نام شرکت الزامی است");
    }

    try {
      logger.info(`🔍 اعتبارسنجی شرکت: ${companyName} (${nationalId})`, 'rasmio-integration');
      
      const validation = await rasmioService.validateCompany(nationalId, companyName);
      
      logger.info(`✅ نتیجه اعتبارسنجی:`, 'rasmio-integration', { validation });
      return validation;
    } catch (error) {
      logger.error("خطا در اعتبارسنجی شرکت", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در اعتبارسنجی شرکت");
    }
  }

  /**
   * Enrich company data using Rasmio API
   */
  async enrichCompanyData(companyId: number): Promise<EnrichedCompanyData> {
    // Get company from storage
    const company = await storage.getCompany(companyId);
    
    if (!company) {
      throw new Error("شرکت یافت نشد");
    }

    try {
      logger.info(`🔄 تکمیل اطلاعات شرکت ${company.name} از راسمیو`, 'rasmio-integration');
      
      const enrichedData = await rasmioService.enrichCompanyData(company.nationalId);
      
      logger.info(`✅ اطلاعات تکمیل شد:`, 'rasmio-integration', { fields: Object.keys(enrichedData) });
      return enrichedData;
    } catch (error) {
      logger.error("خطا در تکمیل اطلاعات شرکت", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در تکمیل اطلاعات شرکت");
    }
  }

  /**
   * Get company data by national ID from Rasmio
   */
  async getCompanyByNationalId(nationalId: string): Promise<EnrichedCompanyData | null> {
    if (!nationalId || nationalId.length !== 11) {
      throw new Error("شناسه ملی ۱۱ رقمی الزامی است");
    }

    try {
      logger.info(`🔄 درخواست اطلاعات شرکت از رسمیو: ${nationalId}`, 'rasmio-integration');
      
      const enrichedData = await rasmioService.enrichCompanyData(nationalId);
      
      if (!enrichedData) {
        logger.warn(`❌ شرکت با شناسه ${nationalId} در راسمیو یافت نشد`, 'rasmio-integration');
        return null;
      }
      
      logger.info(`✅ اطلاعات شرکت از راسمیو دریافت شد`, 'rasmio-integration');
      return enrichedData;
    } catch (error) {
      logger.error("خطا در دریافت اطلاعات شرکت از رسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در دریافت اطلاعات شرکت از رسمیو");
    }
  }

  async getCompanyMembers(nationalId: string): Promise<any[] | null> {
    if (!nationalId || nationalId.length !== 11) {
      throw new Error("شناسه ملی ۱۱ رقمی الزامی است");
    }

    try {
      logger.info(`🔄 درخواست اعضای شرکت از رسمیو: ${nationalId}`, 'rasmio-integration');
      
      const members = await rasmioService.getCompanyMembers(nationalId);
      
      if (!members) {
        logger.warn(`❌ اعضای شرکت با شناسه ${nationalId} در راسمیو یافت نشد`, 'rasmio-integration');
        return null;
      }
      
      logger.info(`✅ اعضای شرکت از راسمیو دریافت شد`, 'rasmio-integration');
      return members;
    } catch (error) {
      logger.error("خطا در دریافت اعضای شرکت از رسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در دریافت اعضای شرکت از رسمیو");
    }
  }

  /**
   * Get person data by national ID from Rasmio
   */
  async getPersonByNationalId(nationalId: string): Promise<PersonData | null> {
    if (!nationalId || nationalId.length !== 10) {
      throw new Error("کد ملی ۱۰ رقمی الزامی است");
    }

    try {
      logger.info(`🔄 درخواست اطلاعات شخص از رسمیو: ${nationalId}`, 'rasmio-integration');
      
      const personData = await rasmioService.getPersonByNationalId(nationalId);
      
      if (!personData) {
        logger.warn(`❌ شخص با کد ملی ${nationalId} در راسمیو یافت نشد`, 'rasmio-integration');
        return null;
      }
      
      logger.info(`✅ اطلاعات شخص از راسمیو دریافت شد`, 'rasmio-integration');
      return personData;
    } catch (error) {
      logger.error("خطا در دریافت اطلاعات شخص از رسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در دریافت اطلاعات شخص از رسمیو");
    }
  }

  /**
   * Check Rasmio service health
   */
  async checkServiceHealth(): Promise<HealthStatus> {
    try {
      logger.info(`🏥 بررسی وضعیت سرویس راسمیو...`, 'rasmio-integration');
      
      const startTime = Date.now();
      const healthStatus = await rasmioService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      logger.info(`✅ سرویس راسمیو آنلاین است (${responseTime}ms)`, 'rasmio-integration');
      
      return {
        ...healthStatus,
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error("خطا در بررسی وضعیت سرویس رسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      
      return {
        isOnline: false,
        error: error instanceof Error ? error.message : "خطای ناشناخته",
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Create company from Rasmio data (for login flow)
   */
  async createCompanyFromRasmio(nationalId: string): Promise<any> {
    if (!nationalId || nationalId.length !== 11) {
      throw new Error("شناسه ملی ۱۱ رقمی الزامی است");
    }

    try {
      logger.info(`🏗️ ایجاد شرکت جدید از داده‌های راسمیو: ${nationalId}`, 'rasmio-integration');
      
      // Get data from Rasmio
      const rasmioData = await rasmioService.getCompanyByNationalId(nationalId);
      
      if (!rasmioData) {
        throw new Error("شرکت با این شناسه ملی در سیستم رسمیو یافت نشد");
      }

      // Create company record
      const newCompany = await storage.createCompany({
        name: rasmioData.title,
        nationalId,
        registrationNumber: rasmioData.registrationNo || "",
        phone: rasmioData.tel || "",
        address: rasmioData.address || "",
        email: rasmioData.email || "",
        type: rasmioData.registrationType?.title || "private",
        status: "active",
        rasmioData: JSON.stringify(rasmioData),
        capital: rasmioData.capital ? String(rasmioData.capital) : null
      });

      logger.info(`✅ شرکت جدید ایجاد شد: ${newCompany.name} (ID: ${newCompany.id})`, 'rasmio-integration');
      return newCompany;
    } catch (error) {
      logger.error("خطا در ایجاد شرکت از داده‌های راسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
   * Update company with Rasmio data
   */
  async updateCompanyWithRasmioData(companyId: number): Promise<any> {
    const company = await storage.getCompany(companyId);
    
    if (!company) {
      throw new Error("شرکت یافت نشد");
    }

    try {
      logger.info(`🔄 به‌روزرسانی شرکت ${company.name} با داده‌های راسمیو`, 'rasmio-integration');
      
      const enrichedData = await rasmioService.enrichCompanyData(company.nationalId);
      
      // Update company with enriched data
      const updatedCompany = await storage.updateCompany(companyId, {
        rasmioData: JSON.stringify(enrichedData),
        updatedAt: new Date().toISOString()
      });

      logger.info(`✅ شرکت ${company.name} با داده‌های راسمیو به‌روزرسانی شد`, 'rasmio-integration');
      return updatedCompany;
    } catch (error) {
      logger.error("خطا در به‌روزرسانی شرکت با داده‌های راسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در به‌روزرسانی شرکت با داده‌های راسمیو");
    }
  }

  /**
   * Validate national ID format
   */
  validateNationalId(nationalId: string, expectedLength: number = 11): boolean {
    if (!nationalId || nationalId.length !== expectedLength) {
      return false;
    }
    
    // Check if all characters are digits
    return /^\d+$/.test(nationalId);
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics(): Promise<any> {
    try {
      const healthStatus = await this.checkServiceHealth();
      
      // Get usage statistics (this would need to be implemented in storage)
      const stats = {
        serviceHealth: healthStatus,
        totalCompaniesValidated: 0, // Would need tracking
        totalPersonsQueried: 0, // Would need tracking
        averageResponseTime: healthStatus.responseTime || 0,
        lastHealthCheck: healthStatus.lastCheck
      };

      return stats;
    } catch (error) {
      logger.error("خطا در دریافت آمار سرویس راسمیو", 'rasmio-integration', error instanceof Error ? error : new Error(String(error)));
      throw new Error("خطا در دریافت آمار سرویس");
    }
  }

  /**
   * Parse and format Rasmio data for AI analysis
   */
  parseRasmioDataForAnalysis(company: any): any {
    const companyData: any = {
      name: company.name,
      nationalId: company.nationalId,
      type: company.type,
      status: company.status
    };

    // Parse Rasmio (enriched) data if available
    if (company.rasmioData) {
      try {
        const rasmio = typeof company.rasmioData === "object" 
          ? company.rasmioData 
          : JSON.parse(company.rasmioData);
          
        companyData.managers = rasmio.managers || rasmio.boardMembers || [];
        companyData.activities = rasmio.activities || [];
        companyData.news = rasmio.ads || rasmio.news || [];
        companyData.capital = rasmio.capital || company.capital;
        companyData.registrationDate = rasmio.registrationDate;
      } catch (err) {
        logger.warn("Unable to parse rasmioData for analysis", 'rasmio-integration', { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return companyData;
  }
}

export const rasmioIntegrationService = new RasmioIntegrationService();
