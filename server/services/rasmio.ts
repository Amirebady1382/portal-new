// API رسمیو برای دریافت اطلاعات رسمی شرکت‌ها
import { logger, PerformanceTimer, ErrorCategory } from '../utils/logger';

// استفاده از endpoint دقیق که در PowerShell کار کرده
const RASMIO_BASE_URL = "https://api.rasm.io/API";

// Helper function to get API key with validation
function getRasmioApiKey(): string {
  const apiKey = process.env.RASMIO_API_KEY;
  if (!apiKey) {
    throw new Error('RASMIO_API_KEY environment variable is required');
  }
  return apiKey;
}

interface RasmioCompanyResponse {
  id: number;
  registrationNo: string;
  title: string;
  registrationTypeId: number;
  registrationDate: string;
  capital: number;
  address: string;
  postalCode: string;
  picture?: string;
  taxNumber: string;
  lat?: number;
  lng?: number;
  website?: string;
  tel?: string;
  fax?: string;
  mobile?: string;
  email?: string;
  status: string;
  edareKol?: string;
  vahedSabti?: string;
  lastUpdate: string;
  registrationType?: {
    id: number;
    title: string;
    wordUsedToShow: string;
  };
  companyPerson?: any[];
  companyNews?: any[];
  pictureUrl?: string;
  persianRegistrationDate?: string;
}

interface RasmioNewsResponse {
  id: number;
  title: string;
  description: string;
  companyId: number;
  capitalTo?: number;
  newspaperDate: string;
  newsLetterDate: string;
  newspaperNumber: string;
  newspaperCityType: string;
  pageNumber: number;
  indicatorNumber: string;
}

interface RasmioPersonResponse {
  nationalId: string;
  firstName: string;
  lastName: string;
  positions: Array<{
    companyId: number;
    companyName: string;
    position: string;
    startDate: string;
    endDate?: string;
  }>;
}

export class RasmioService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      logger.debug(`استفاده از cache برای: ${key}`, 'rasmio-cache');
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const timer = new PerformanceTimer(`Rasmio API: ${endpoint}`);
    
    try {
      logger.logExternalAPI('Rasmio', endpoint, undefined, undefined, { 
        url: `${RASMIO_BASE_URL}${endpoint}`,
        headers: { 'X-Key': '[REDACTED]' }
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch(`${RASMIO_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'X-Key': getRasmioApiKey(),
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = timer.end(response.ok);

      logger.logExternalAPI('Rasmio', endpoint, response.status, duration, {
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        
        let errorMessage: string;
        if (response.status === 404) {
          errorMessage = 'شرکت با شناسه ملی مورد نظر در سیستم رسمیو یافت نشد';
        } else if (response.status >= 500) {
          errorMessage = 'سرور رسمیو در حال حاضر دردسترس نیست. لطفاً بعداً تلاش کنید';
        } else if (response.status === 401) {
          errorMessage = 'کلید API رسمیو نامعتبر است';
        } else if (response.status === 429) {
          errorMessage = 'محدودیت تعداد درخواست API رسمیو. لطفاً کمی صبر کنید';
        } else {
          errorMessage = `خطای API رسمیو: ${response.status} - ${response.statusText}`;
        }

        logger.error(
          errorMessage,
          'rasmio-api',
          new Error(errorText),
          ErrorCategory.EXTERNAL_API,
          { 
            status: response.status, 
            statusText: response.statusText,
            endpoint,
            errorText: errorText.substring(0, 200) // Limit error text length
          }
        );

        throw new Error(errorMessage);
      }

      const result = await response.json();
      logger.info(`موفقیت API رسمیو: ${endpoint}`, 'rasmio-api', {
        responseType: typeof result,
        hasData: !!result,
        keysCount: result && typeof result === 'object' ? Object.keys(result).length : 0
      });
      
      return result;
    } catch (error: unknown) {
      timer.end(false);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = 'سرور رسمیو پاسخگو نیست (timeout). ممکن است شبکه مشکل داشته باشد';
        logger.error(timeoutError, 'rasmio-api', error, ErrorCategory.EXTERNAL_API, { endpoint, timeout: 20000 });
        throw new Error(timeoutError);
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = 'امکان اتصال به سرور رسمیو وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کنید';
        logger.error(networkError, 'rasmio-api', error, ErrorCategory.EXTERNAL_API, { endpoint });
        throw new Error(networkError);
      }
      
      // Re-throw if it's already a handled error
      if (error instanceof Error && error.message.includes('رسمیو')) {
        throw error;
      }
      
      // Log unknown errors
      logger.error(
        'خطای غیرمنتظره در API رسمیو',
        'rasmio-api',
        error instanceof Error ? error : new Error(String(error)),
        ErrorCategory.EXTERNAL_API,
        { endpoint }
      );
      
      throw new Error('خطای غیرمنتظره در ارتباط با API رسمیو');
    }
  }

  // دریافت اطلاعات پایه شرکت
  async getCompanyByNationalId(nationalId: string): Promise<RasmioCompanyResponse | null> {
    try {
      // بررسی cache اول
      const cacheKey = `company_${nationalId}`;
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await this.makeRequest(`/Company/${nationalId}/Info`);
      
      // اگر API null برگرداند، آن را به عنوان عدم وجود شرکت در نظر بگیریم
      if (data === null || data === undefined) {
        logger.warn(`شرکت با شناسه ملی ${nationalId} در API رسمیو یافت نشد`, 'rasmio-api');
        return null;
      }
      
      // ذخیره در cache فقط اگر داده معتبر باشد
      if (data && typeof data === 'object') {
        this.setCachedData(cacheKey, data);
        logger.info(`اطلاعات شرکت ${nationalId} با موفقیت دریافت و cache شد`, 'rasmio-api');
      }
      
      return data;
    } catch (error: unknown) {
      logger.error(`خطا در دریافت اطلاعات شرکت ${nationalId}`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      
      // در صورت خطا، اگر cache داریم بازگردان
      const cacheKey = `company_${nationalId}`;
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        logger.debug(`استفاده از cache قدیمی برای شرکت ${nationalId}`, 'rasmio-cache');
        return staleCache.data;
      }
      
      return null;
    }
  }

  // دریافت آگهی‌های روزنامه رسمی شرکت
  async getCompanyNews(companyNationalId: string): Promise<RasmioNewsResponse[] | null> {
    try {
      const cachedData = this.getCachedData(`news-${companyNationalId}`);
      if (cachedData) {
        return cachedData as RasmioNewsResponse[];
      }

      const data = await this.makeRequest(`/Company/${companyNationalId}/News`);
      this.setCachedData(`news-${companyNationalId}`, data);
      return data;
    } catch (error: unknown) {
      logger.error(`خطا در دریافت آگهی‌های روزنامه رسمی شرکت ${companyNationalId}`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async getPersonByNationalId(nationalId: string): Promise<RasmioPersonResponse | null> {
    try {
      const cachedData = this.getCachedData(`person-${nationalId}`);
      if (cachedData) {
        return cachedData as RasmioPersonResponse;
      }

      const data = await this.makeRequest(`/Person/${nationalId}`);
      this.setCachedData(`person-${nationalId}`, data);
      return data;
    } catch (error: unknown) {
      logger.error(`خطا در دریافت اطلاعات شخص ${nationalId}`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  async getCompanyManagers(companyNationalId: string): Promise<any[]> {
    try {
      const cachedData = this.getCachedData(`managers-${companyNationalId}`);
      if (cachedData) {
        return cachedData as any[];
      }

      // تلاش با endpoint های مختلف
      const possibleEndpoints = [
        `/Company/${companyNationalId}/Managers`,
        `/CompanyManagers/${companyNationalId}`,
        `/Company/${companyNationalId}/PersonManager`,
        `/Manager/${companyNationalId}`
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          logger.debug(`تلاش برای endpoint مدیران: ${endpoint}`, 'rasmio-api');
          const data = await this.makeRequest(endpoint);
          if (data) {
            this.setCachedData(`managers-${companyNationalId}`, data);
            logger.debug(`endpoint موفق برای مدیران: ${endpoint}`, 'rasmio-api');
            return data || [];
          }
        } catch (error) {
          logger.debug(`endpoint ناموفق برای مدیران: ${endpoint}`, 'rasmio-api');
          continue; // تلاش با endpoint بعدی
        }
      }

      logger.warn(`هیچ endpoint معتبری برای مدیران شرکت ${companyNationalId} یافت نشد`, 'rasmio-api');
      return [];
    } catch (error: unknown) {
      logger.error(`خطا در دریافت مدیران شرکت ${companyNationalId}`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async getCompanyActivities(companyNationalId: string): Promise<any[]> {
    try {
      const cachedData = this.getCachedData(`activities-${companyNationalId}`);
      if (cachedData) {
        return cachedData as any[];
      }

      // تلاش با endpoint های مختلف
      const possibleEndpoints = [
        `/Company/${companyNationalId}/Activities`,
        `/CompanyActivities/${companyNationalId}`,
        `/Company/${companyNationalId}/Activity`,
        `/Activity/${companyNationalId}`
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          logger.debug(`تلاش برای endpoint فعالیت‌ها: ${endpoint}`, 'rasmio-api');
          const data = await this.makeRequest(endpoint);
          if (data) {
            this.setCachedData(`activities-${companyNationalId}`, data);
            logger.debug(`endpoint موفق برای فعالیت‌ها: ${endpoint}`, 'rasmio-api');
            return data || [];
          }
        } catch (error) {
          logger.debug(`endpoint ناموفق برای فعالیت‌ها: ${endpoint}`, 'rasmio-api');
          continue; // تلاش با endpoint بعدی
        }
      }

      logger.warn(`هیچ endpoint معتبری برای فعالیت‌های شرکت ${companyNationalId} یافت نشد`, 'rasmio-api');
      return [];
    } catch (error: unknown) {
      logger.error(`خطا در دریافت فعالیت‌های شرکت ${companyNationalId}`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async searchCompanies(query: string): Promise<any[]> {
    try {
      const cachedData = this.getCachedData(`search-${query}`);
      if (cachedData) {
        return cachedData as any[];
      }

      const data = await this.makeRequest(`/Company/Search?q=${encodeURIComponent(query)}`);
      this.setCachedData(`search-${query}`, data);
      return data || [];
    } catch (error: unknown) {
      logger.error(`خطا در جستجوی شرکت‌ها`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async healthCheck(): Promise<{ isOnline: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    logger.debug('شروع Health Check رسمیو', 'rasmio-health');
    
    try {
      // استفاده از یک شناسه ملی معتبر برای تست - اگر null برگردد، API کار می‌کند
      const response = await this.makeRequest('/Company/10320076731/Info');
      const responseTime = Date.now() - startTime;
      
      logger.debug(`Health Check Response Type: ${typeof response}`, 'rasmio-health', { responseValue: response });
      
      // اگر API پاسخ دهد (حتی null) یعنی آنلاین است
      logger.info(`API رسمیو پاسخ داد (${responseTime}ms) - وضعیت: ${response ? 'داده موجود' : 'داده موجود نیست'}`, 'rasmio-health');
      
      const result = { 
        isOnline: true, 
        responseTime,
        error: response === null ? 'شناسه ملی تست در سیستم وجود ندارد اما API کار می‌کند' : undefined
      };
      
      logger.debug('Returning health result', 'rasmio-health', result);
      return result;
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      logger.error('Rasmio API Health Check Failed', 'rasmio-health', error instanceof Error ? error : new Error(String(error)));
      
      const errorResult = { 
        isOnline: false, 
        responseTime: responseTime > 20000 ? undefined : responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      logger.debug('Returning error result', 'rasmio-health', errorResult);
      return errorResult;
    }
  }

  async validateCompany(nationalId: string, companyName: string): Promise<{
    isValid: boolean;
    officialData?: RasmioCompanyResponse;
    discrepancies?: string[];
  }> {
    try {
      const officialData = await this.getCompanyByNationalId(nationalId);
      
      if (!officialData) {
        return {
          isValid: false,
          discrepancies: ['شرکت با این شناسه ملی در رسمیو یافت نشد']
        };
      }

      const discrepancies: string[] = [];
      
      // بررسی نام شرکت
      if (officialData.title.toLowerCase() !== companyName.toLowerCase()) {
        discrepancies.push(`نام شرکت مطابقت ندارد. نام رسمی: ${officialData.title}`);
      }

      // بررسی وضعیت شرکت
      if (officialData.status !== 'فعال') {
        discrepancies.push(`وضعیت شرکت: ${officialData.status}`);
      }

      return {
        isValid: discrepancies.length === 0,
        officialData,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined
      };
    } catch (error: unknown) {
      logger.error("خطا در اعتبارسنجی شرکت", 'rasmio-validation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        discrepancies: ['خطا در ارتباط با سرویس رسمیو']
      };
    }
  }

  async enrichCompanyData(nationalId: string): Promise<{
    basicInfo?: RasmioCompanyResponse;
    managers?: any[];
    activities?: any[];
    news?: RasmioNewsResponse[];
    error?: string;
  }> {
    try {
      logger.info(`شروع دریافت اطلاعات رسمیو برای شناسه: ${nationalId}`, 'rasmio-full-data');
      
      // تلاش برای دریافت اطلاعات از API رسمیو
      const basicInfo = await this.getCompanyByNationalId(nationalId);
      
      if (!basicInfo) {
        return {
          managers: [],
          activities: [],
          news: [],
          error: `امکان دریافت اطلاعات این شرکت از API رسمیو وجود ندارد یا مشکل اتصال به سرور رخ داده است. لطفاً دوباره تلاش کنید.`,
        };
      }

              logger.info(`اطلاعات پایه شرکت ${nationalId} دریافت شد از API رسمیو`, 'rasmio-full-data');

      // فقط دریافت اخبار روزنامه رسمی - مدیران و فعالیت‌ها را درخواست نمی‌کنیم
      const newsResult = await this.getCompanyNews(nationalId).catch(() => []);

              logger.info(`نتیجه دریافت اطلاعات: اخبار(${(newsResult || []).length})`, 'rasmio-full-data');

      return {
        basicInfo,
        managers: [], // خالی می‌گذاریم چون نیازی نیست
        activities: [], // خالی می‌گذاریم چون نیازی نیست
        news: newsResult || [],
      };

    } catch (error: unknown) {
      logger.error(`خطا در دریافت اطلاعات کامل شرکت ${nationalId}`, 'rasmio-api', error instanceof Error ? error : new Error(String(error)));
      
      // بررسی نوع خطا و ارائه پیام مناسب
      let errorMessage = 'امکان دریافت اطلاعات این شرکت از API رسمیو وجود ندارد یا مشکل اتصال به سرور رخ داده است. لطفاً دوباره تلاش کنید.';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('منقضی') || error.message.includes('AbortError')) {
          errorMessage = 'سرور API رسمیو پاسخ نمی‌دهد (timeout). لطفاً بعداً دوباره تلاش کنید.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = 'مشکل در اتصال به شبکه یا سرور API رسمیو.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = `شرکت با شناسه ملی ${nationalId} در سیستم رسمیو یافت نشد.`;
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'کلید API رسمیو نامعتبر است. لطفاً کلید API را بررسی کنید.';
        }
      }

      return {
        managers: [],
        activities: [],
        news: [],
        error: errorMessage,
      };
    }
  }
}

export const rasmioService = new RasmioService();