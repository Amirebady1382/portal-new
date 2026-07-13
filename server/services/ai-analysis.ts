// سرویس تحلیل هوش مصنوعی برای شرکت‌ها
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { logger, PerformanceTimer, ErrorCategory } from '../utils/logger';
import { storage } from '../storage';
import { pitchDeckExtractorService } from './pitch-deck-extractor.service';
import { gapGPTService } from './gap-gpt.service';
import { aiOrchestrator } from './ai-orchestrator.service';
import PDFParser from 'pdf2json';
// Remove static import: import pdf from 'pdf-parse';

// 🚀 استفاده از قوی‌ترین مدل موجود - Claude 4 Sonnet
const DEFAULT_MODEL_STR = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

// Lazy initialization helpers
function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return apiKey;
}

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): any {
  const disableDirect = process.env.DISABLE_DIRECT_CLAUDE === 'true';
  if (disableDirect) {
    return {
      messages: {
        create: async (options: any) => {
          logger.info("🤖 Routing direct Claude call to GapGPT because DISABLE_DIRECT_CLAUDE is active", "ai-analysis");
          const prompt = options.messages?.[0]?.content || "";
          const systemPrompt = options.system || undefined;
          const content = await gapGPTService.generateResponse(prompt, systemPrompt);
          return {
            content: [{ type: "text", text: content }]
          };
        }
      }
    };
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: getAnthropicApiKey(),
    });
  }
  return anthropicClient;
}

// Add path conversion utility for cross-platform compatibility
const convertPathToLinux = (filePath: string): string => {
  // If it's already a Linux path, return as is
  if (!filePath.includes('\\') || filePath.startsWith('/')) {
    return filePath;
  }

  // Convert Windows path to Linux path
  // C:\Users\kinga\OneDrive\Desktop\CustomerManagementDashboard3-main\uploads\file.pdf
  // becomes: /path/to/current/project/uploads/file.pdf

  const windowsUploadsPath = /.*\\uploads\\(.+)$/;
  const match = filePath.match(windowsUploadsPath);

  if (match) {
    const fileName = match[1];
    // Use current working directory + uploads + filename
    return path.join(process.cwd(), 'uploads', fileName);
  }

  // Fallback: just replace backslashes with forward slashes and use relative path
  const relativePath = filePath.replace(/^.*\\uploads\\/, 'uploads/').replace(/\\/g, '/');
  return path.join(process.cwd(), relativePath);
};

interface CompanyAnalysisData {
  basicInfo?: any;
  managers?: any[];
  activities?: any[];
  news?: any[];
  formSubmissions?: any[];
  documents?: any[];
  companyPanels?: {
    teamInfo?: any;
    productInfo?: any;
    marketInfo?: any;
    financialInfo?: any;
  };
  serviceId?: number; // Optional: ID of service to focus analysis on
}

interface AnalysisResult {
  companyOverview?: string;
  teamAnalysis: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    summary: string;
  };
  productAnalysis: {
    score: number;
    marketPotential: string;
    competitiveAdvantage: string;
    summary: string;
  };
  marketAnalysis: {
    score: number;
    marketSize: string;
    competition: string;
    trends: string;
    summary: string;
  };
  financialAnalysis: {
    score: number;
    capitalStructure: string;
    growthPotential: string;
    summary: string;
  };
  riskAnalysis: {
    score: number;
    mainRisks: string[];
    mitigationStrategies: string[];
    summary: string;
  };
  formAnalysis?: {
    score: number;
    completedForms: string[];
    keyInsights: string[];
    documentsQuality: string;
    missingInfo: string[];
    summary: string;
  };
  overallRecommendation: {
    score: number;
    recommendation: 'strongly_recommend' | 'recommend' | 'neutral' | 'not_recommend' | 'strongly_not_recommend';
    reasoning: string;
    nextSteps: string[];
  };
}

interface DocumentContent {
  fileName: string;
  content: string;
  extractionMethod: 'pdf-parse' | 'claude-vision' | 'text' | 'error' | 'file-info';
  error?: string;
}

export class AIAnalysisService {

  async analyzeCompany(companyData: CompanyAnalysisData): Promise<AnalysisResult> {
    const timer = new PerformanceTimer('analyzeCompany');
    try {
      const companyName = companyData.basicInfo?.name || companyData.basicInfo?.title || 'شرکت نامشخص';

      logger.info(`شروع تحلیل هوش مصنوعی برای شرکت: ${companyName}`, 'ai-analysis');

      // If serviceId is provided, get service context
      let serviceContext: any = null;
      if (companyData.serviceId) {
        try {
          const { servicesService } = await import('./services.service');
          const service = await servicesService.getService(companyData.serviceId);

          if (service) {
            logger.info(`🎯 تمرکز تحلیل بر خدمت: ${service.title}`, 'ai-analysis');

            // Get forms related to this service
            const serviceForms = await servicesService.getServiceForms(companyData.serviceId);

            serviceContext = {
              id: service.id,
              title: service.title,
              description: service.description,
              category: service.category,
              estimatedDays: service.estimatedDays,
              requirements: service.requirements,
              forms: serviceForms.map((sf: any) => ({
                formTitle: sf.formTitle,
                formDescription: sf.formDescription,
                formFields: sf.formFields,
                formCategory: sf.formCategory,
                isRequired: sf.isRequired
              }))
            };

            logger.info(`📋 فرم‌های مرتبط با خدمت: ${serviceForms.length}`, 'ai-analysis');
          }
        } catch (error) {
          logger.warn(`⚠️ خطا در دریافت اطلاعات خدمت ${companyData.serviceId}`, 'ai-analysis', { error });
        }
      }

      // Extract financial summary data if available
      let financialContext: any = null;
      if (companyData.basicInfo?.financialSummaryData) {
        try {
          logger.info(`💰 استخراج خلاصه مالی شرکت...`, 'ai-analysis');
          const financialData = typeof companyData.basicInfo.financialSummaryData === 'string'
            ? JSON.parse(companyData.basicInfo.financialSummaryData)
            : companyData.basicInfo.financialSummaryData;

          if (financialData && financialData.metadata) {
            financialContext = {
              hasData: true,
              fiscalYears: financialData.metadata.fiscalYears || [],
              confidence: financialData.metadata.confidence || 0,
              extractionDate: financialData.metadata.extractionDate,

              // اقلام مستقیم (فقط کلیدی‌ترین‌ها)
              directItems: {
                revenue: financialData.directItems?.revenue,
                netProfit: financialData.directItems?.netProfit,
                ebit: financialData.directItems?.ebit,
                totalAssets: financialData.directItems?.totalAssets,
                totalLiabilities: financialData.directItems?.totalLiabilities,
                equity: financialData.directItems?.equity
              },

              // نسبت‌های کلیدی
              keyRatios: {
                currentRatio: financialData.keyRatios?.currentRatio,
                debtToEquity: financialData.keyRatios?.debtToEquity,
                equityRatio: financialData.keyRatios?.equityRatio,
                netProfitMargin: financialData.keyRatios?.netProfitMargin,
                roe: financialData.keyRatios?.roe,
                interestCoverage: financialData.keyRatios?.interestCoverage,
                revenueGrowth: financialData.keyRatios?.revenueGrowth,
                netProfitGrowth: financialData.keyRatios?.netProfitGrowth
              },

              // شاخص‌های ریسک
              riskIndicators: {
                altmanZScore: financialData.riskIndicators?.altmanZScore,
                dfl: financialData.riskIndicators?.dfl,
                netDebtToEbitda: financialData.riskIndicators?.netDebtToEbitda,
                confidenceScore: financialData.riskIndicators?.confidenceScore
              }
            };

            logger.info(`✅ خلاصه مالی استخراج شد - سال‌های ${financialContext.fiscalYears.join('، ')}`, 'ai-analysis');
          }
        } catch (error) {
          logger.warn(`⚠️ خطا در پردازش خلاصه مالی`, 'ai-analysis', { error });
        }
      } else {
        logger.info(`ℹ️ خلاصه مالی برای این شرکت موجود نیست`, 'ai-analysis');
      }

      // مرحله ۱: تحقیق اینترنتی با Perplexity (فقط اگر کلید API موجود باشد)
      let researchData: any = null;
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

      if (perplexityApiKey) {
        logger.info(`شروع تحقیق اینترنتی برای شرکت: ${companyName}`, 'ai-analysis');
        try {
          researchData = await this.researchCompanyWithPerplexity(companyName, perplexityApiKey);
          logger.info('✅ تحقیق اینترنتی با Perplexity موفقیت‌آمیز بود', 'ai-analysis');
        } catch (error) {
          logger.warn(`⚠️ تحقیق اینترنتی با Perplexity ناموفق: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ai-analysis');
          logger.info('🔄 تلاش برای استفاده از Claude AI به عنوان پشتیبان...', 'ai-analysis');

          // استفاده از Claude AI به عنوان fallback
          try {
            researchData = await this.researchCompanyWithClaudeAI(companyName);
            logger.info('✅ تحقیق با Claude AI موفقیت‌آمیز بود', 'ai-analysis');
          } catch (fallbackError) {
            logger.warn(`⚠️ تحقیق با Claude AI نیز ناموفق: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`, 'ai-analysis');
            logger.info('🔄 ادامه تحلیل فقط با داده‌های موجود...', 'ai-analysis');
          }
        }
      } else {
        logger.info('❌ کلید API Perplexity موجود نیست - تلاش برای استفاده از Claude AI...', 'ai-analysis');

        // اگر Perplexity API key نداریم، مستقیماً از Claude AI استفاده کنیم
        try {
          researchData = await this.researchCompanyWithClaudeAI(companyName);
          logger.info('✅ تحقیق با Claude AI موفقیت‌آمیز بود', 'ai-analysis');
        } catch (error) {
          logger.warn(`⚠️ تحقیق با Claude AI ناموفق: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ai-analysis');
          logger.info('🔄 ادامه تحلیل فقط با داده‌های موجود...', 'ai-analysis');
        }
      }

      // مرحله ۲: تجمیع داده‌های موجود و تحقیق شده
      const combinedData = {
        ...companyData,
        researchData,
        serviceContext, // Add service context to combined data
        financialContext // Add financial context to combined data
      };

      // مرحله ۳: تحلیل نهایی با Claude
      const analysisPrompt = await this.createAnalysisPrompt(combinedData);

      // Log the prompt length and key sections
      logger.info(`📋 آماده‌سازی prompt برای Claude AI`, 'ai-analysis', {
        promptLength: analysisPrompt.length,
        includesForms: analysisPrompt.includes('فرم‌های ثبت شده'),
        includesDocs: analysisPrompt.includes('مدارک و فایل‌های ارائه شده'),
        includesPanels: analysisPrompt.includes('اطلاعات تیم'),
        includesNamedForms: analysisPrompt.includes('نوع فرم:')
      });

      // Log a preview of the prompt (first 500 chars)
      if (process.env.DEBUG_MODE === 'true') {
        logger.debug(`📝 Full prompt: ${analysisPrompt}`, 'ai-analysis');
      } else {
        logger.debug(`📝 نمونه محتوای prompt: ${analysisPrompt.substring(0, 500)}...`, 'ai-analysis');
      }

      logger.info('شروع تحلیل با استفاده از AI Orchestrator...', 'ai-analysis');

      const systemPrompt = serviceContext
        ? `شما یک تحلیلگر حرفه‌ای سرمایه‌گذاری در صندوق پژوهشی فناوری غیردولتی گیلان هستید. باید بر اساس اطلاعات واقعی ارائه شده، تحلیل جامع و دقیق ارائه دهید.

🎯 تمرکز ویژه: این تحلیل باید بر روی خدمت "${serviceContext.title}" متمرکز باشد.

قوانین مهم:
- هرگز از داده‌های فرضی یا خیالی استفاده نکنید
- تنها بر اساس اطلاعات واقعی و مستند تحلیل کنید
- اگر اطلاعاتی در دسترس نیست، صراحت اعلام کنید "اطلاعات کافی در دسترس نیست"
- نمره‌دهی باید منصفانه و بر اساس داده‌های واقعی باشد
- اگر اطلاعات محدود است، نمره پایین‌تری دهید

قوانین ویژه تحلیل فرم‌ها:
- فرم‌های ارائه شده را به دقت بررسی کنید
- کیفیت و کامل بودن اطلاعات و مدارک را بررسی کنید
- نکات و نقاط قوت/ضعف موجود در فرم‌ها را شناسایی کنید
- اطلاعات گمشده یا ناقص را مشخص کنید
- فرم‌های ارائه شده را با نام‌های معنادار مشخص کنید (نه فقط نام فایل)

قوانین ویژه تحلیل بر اساس خدمت:
- در تمام بخش‌های تحلیل، ارتباط شرکت با خدمت "${serviceContext.title}" را بررسی کنید
- آمادگی و مناسب بودن شرکت برای استفاده از این خدمت را ارزیابی کنید
- فرم‌های مربوط به این خدمت را با دقت بیشتری بررسی کنید
- در بخش overallRecommendation، توصیه‌های خود را با توجه به این خدمت ارائه دهید`
        : `شما یک تحلیلگر حرفه‌ای سرمایه‌گذاری در صندوق پژوهشی فناوری غیردولتی گیلان هستید. باید بر اساس اطلاعات واقعی ارائه شده، تحلیل جامع و دقیق ارائه دهید.

قوانین مهم:
- هرگز از داده‌های فرضی یا خیالی استفاده نکنید
- تنها بر اساس اطلاعات واقعی و مستند تحلیل کنید
- اگر اطلاعاتی در دسترس نیست، صراحت اعلام کنید "اطلاعات کافی در دسترس نیست"
- نمره‌دهی باید منصفانه و بر اساس داده‌های واقعی باشد
- اگر اطلاعات محدود است، نمره پایین‌تری دهید

قوانین ویژه تحلیل فرم‌ها:
- فرم‌های ارائه شده را به دقت بررسی کنید
- کیفیت و کامل بودن اطلاعات و مدارک را بررسی کنید
- نکات و نقاط قوت/ضعف موجود در فرم‌ها را شناسایی کنید
- اطلاعات گمشده یا ناقص را مشخص کنید
- فرم‌های ارائه شده را با نام‌های معنادار مشخص کنید (نه فقط نام فایل)`;

      const responseFormat = `
پاسخ شما باید یک JSON معتبر باشد با ساختار زیر:
{
  "companyOverview": "معرفی کوتاه شرکت",
  "teamAnalysis": {
    "score": عدد_از_۱_تا_۱۰,
    "strengths": ["نقطه قوت ۱", "نقطه قوت ۲"],
    "weaknesses": ["نقطه ضعف ۱", "نقطه ضعف ۲"],
    "summary": "خلاصه تحلیل تیم"
  },
  "productAnalysis": {
    "score": عدد_از_۱_تا_۱۰,
    "marketPotential": "پتانسیل بازار",
    "competitiveAdvantage": "مزیت رقابتی",
    "summary": "خلاصه تحلیل محصول"
  },
  "marketAnalysis": {
    "score": عدد_از_۱_تا_۱۰,
    "marketSize": "اندازه بازار",
    "competition": "وضعیت رقابت",
    "trends": "روندهای بازار",
    "summary": "خلاصه تحلیل بازار"
  },
  "financialAnalysis": {
    "score": عدد_از_۱_تا_۱۰,
    "capitalStructure": "ساختار سرمایه",
    "growthPotential": "پتانسیل رشد",
    "summary": "خلاصه تحلیل مالی"
  },
  "riskAnalysis": {
    "score": عدد_از_۱_تا_۱۰,
    "mainRisks": ["ریسک ۱", "ریسک ۲"],
    "mitigationStrategies": ["راهکار ۱", "راهکار ۲"],
    "summary": "خلاصه تحلیل ریسک"
  },
  "formAnalysis": {
    "score": عدد_از_۱_تا_۱۰,
    "completedForms": ["نام فرم ۱", "نام فرم ۲"],
    "keyInsights": ["نکته کلیدی ۱", "نکته کلیدی ۲"],
    "documentsQuality": "کیفیت مدارک ارائه شده",
    "missingInfo": ["اطلاعات گمشده ۱", "اطلاعات گمشده ۲"],
    "summary": "خلاصه تحلیل فرم‌ها و مدارک"
  },
  "overallRecommendation": {
    "score": عدد_از_۱_تا_۱۰,
    "recommendation": "neutral",
    "reasoning": "دلیل توصیه",
    "nextSteps": ["گام ۱", "گام ۲"]
  }
}`;

      let analysisText = '';
      try {
        // استفاده از aiOrchestrator برای مدیریت هوشمند خطا و Failover به GapGPT
        analysisText = await aiOrchestrator.execute(analysisPrompt, {
          systemPrompt: `${systemPrompt}\n\n${responseFormat}`,
          maxTokens: 4000,
          timeout: 60000 // افزایش تایم‌اوت برای تحلیل‌های سنگین
        });
        
        logger.info('تحلیل هوش مصنوعی دریافت شد', 'ai-analysis');
      } catch (error) {
        logger.error('❌ خطا در فراخوانی هوش مصنوعی (اصلی و پشتیبان هر دو شکست خوردند)', 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
        throw new Error('متأسفانه امکان دریافت تحلیل در حال حاضر وجود ندارد. لطفاً دقایقی دیگر تلاش کنید.');
      }

      timer.end();

      // تلاش برای parse کردن JSON
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // اضافه کردن companyOverview اگر وجود نداشته باشد
          if (!parsed.companyOverview && researchData && researchData.queries && researchData.queries.length > 0) {
            const firstResearch = researchData.queries[0];
            parsed.companyOverview = firstResearch.content.substring(0, 300) + '...';
          }

          logger.info('تحلیل با موفقیت parse شد', 'ai-analysis');

          // Debug: Log analysis sections
          logger.debug('🔍 بخش‌های تحلیل موجود:', 'ai-analysis', { sections: Object.keys(parsed) });
          if (parsed.formAnalysis) {
            logger.info(`✅ formAnalysis موجود است - نمره: ${parsed.formAnalysis.score}`, 'ai-analysis');
          } else {
            logger.warn('❌ formAnalysis موجود نیست', 'ai-analysis');
          }

          return parsed;
        }
      } catch (parseError) {
        logger.error('خطا در parse JSON', 'ai-analysis', parseError instanceof Error ? parseError : new Error(String(parseError)));
      }

      // اگر JSON نبود، تحلیل manual انجام می‌دهیم
      logger.info('استفاده از parseAnalysisText', 'ai-analysis');
      return this.parseAnalysisText(analysisText, combinedData);

    } catch (error: unknown) {
      logger.error('خطا در تحلیل AI', 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
      timer.end(false, { error: error instanceof Error ? error.message : String(error) });

      // در صورت خطا، تحلیل محدود ارائه دهیم
      return this.createLimitedAnalysis(companyData);
    }
  }

  private async createAnalysisPrompt(data: any): Promise<string> {
    const companyName = data.basicInfo?.name || data.basicInfo?.title || 'شرکت نامشخص';

    let prompt = `تحلیل جامع شرکت ${companyName}\n\n`;

    // خدمت مورد تمرکز (اگر وجود داشته باشد)
    if (data.serviceContext) {
      prompt += `🎯 خدمت مورد تمرکز تحلیل:\n`;
      prompt += `- عنوان خدمت: ${data.serviceContext.title}\n`;
      if (data.serviceContext.description) {
        prompt += `- توضیحات خدمت: ${data.serviceContext.description}\n`;
      }
      if (data.serviceContext.category) {
        prompt += `- دسته‌بندی: ${data.serviceContext.category}\n`;
      }
      if (data.serviceContext.estimatedDays) {
        prompt += `- زمان تخمینی: ${data.serviceContext.estimatedDays} روز\n`;
      }
      if (data.serviceContext.requirements) {
        try {
          const requirements = typeof data.serviceContext.requirements === 'string'
            ? JSON.parse(data.serviceContext.requirements)
            : data.serviceContext.requirements;
          if (requirements && typeof requirements === 'object') {
            prompt += `- الزامات و شرایط: ${JSON.stringify(requirements, null, 2)}\n`;
          }
        } catch (e) {
          prompt += `- الزامات: ${data.serviceContext.requirements}\n`;
        }
      }

      // فرم‌های مرتبط با این خدمت
      if (data.serviceContext.forms && data.serviceContext.forms.length > 0) {
        prompt += `\n📋 فرم‌های مرتبط با این خدمت (${data.serviceContext.forms.length} فرم):\n`;
        data.serviceContext.forms.forEach((form: any, index: number) => {
          prompt += `\nفرم ${index + 1}: ${form.formTitle}\n`;
          if (form.formDescription) {
            prompt += `  توضیحات: ${form.formDescription}\n`;
          }
          prompt += `  الزامی: ${form.isRequired ? 'بله' : 'خیر'}\n`;
          if (form.formCategory) {
            prompt += `  دسته: ${form.formCategory}\n`;
          }
        });
      }

      prompt += `\n⚠️ توجه مهم: تحلیل شما باید بر روی این خدمت متمرکز باشد. در تحلیل خود:\n`;
      prompt += `- آمادگی شرکت برای استفاده از این خدمت را بررسی کنید\n`;
      prompt += `- فرم‌های مربوط به این خدمت را به دقت بررسی کنید\n`;
      prompt += `- نقاط قوت و ضعف شرکت را در رابطه با این خدمت ارزیابی کنید\n`;
      prompt += `- پیشنهادات خود را برای بهبود آمادگی شرکت در استفاده از این خدمت ارائه دهید\n\n`;
    }

    // خلاصه مالی از اظهارنامه مالیاتی
    if (data.financialContext && data.financialContext.hasData) {
      const fc = data.financialContext;
      prompt += `📊 خلاصه مالی شرکت (از اظهارنامه مالیاتی):\n`;
      prompt += `- سال‌های مالی: ${fc.fiscalYears.join('، ')}\n`;
      prompt += `- اعتبار داده‌ها: ${fc.confidence}%\n`;
      prompt += `- تاریخ استخراج: ${fc.extractionDate}\n\n`;

      // اقلام مستقیم
      if (fc.directItems) {
        prompt += `💰 اقلام مالی مستقیم:\n`;
        if (fc.directItems.revenue) {
          const rev = fc.directItems.revenue;
          prompt += `- فروش/درآمد: سال ${fc.fiscalYears[0]}: ${rev.year1?.toLocaleString() || 'نامشخص'} ریال`;
          if (rev.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${rev.year2.toLocaleString()} ریال`;
          if (rev.growth) prompt += ` (رشد: ${rev.growth > 0 ? '+' : ''}${rev.growth.toFixed(1)}%)`;
          prompt += `\n`;
        }
        if (fc.directItems.netProfit) {
          const profit = fc.directItems.netProfit;
          prompt += `- سود خالص: سال ${fc.fiscalYears[0]}: ${profit.year1?.toLocaleString() || 'نامشخص'} ریال`;
          if (profit.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${profit.year2.toLocaleString()} ریال`;
          if (profit.growth) prompt += ` (رشد: ${profit.growth > 0 ? '+' : ''}${profit.growth.toFixed(1)}%)`;
          prompt += `\n`;
        }
        if (fc.directItems.ebit) {
          const ebit = fc.directItems.ebit;
          prompt += `- EBIT (سود عملیاتی): سال ${fc.fiscalYears[0]}: ${ebit.year1?.toLocaleString() || 'نامشخص'} ریال`;
          if (ebit.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${ebit.year2.toLocaleString()} ریال`;
          prompt += `\n`;
        }
        if (fc.directItems.totalAssets) {
          const assets = fc.directItems.totalAssets;
          prompt += `- کل دارایی‌ها: سال ${fc.fiscalYears[0]}: ${assets.year1?.toLocaleString() || 'نامشخص'} ریال`;
          if (assets.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${assets.year2.toLocaleString()} ریال`;
          prompt += `\n`;
        }
        if (fc.directItems.equity) {
          const equity = fc.directItems.equity;
          prompt += `- حقوق صاحبان سهام: سال ${fc.fiscalYears[0]}: ${equity.year1?.toLocaleString() || 'نامشخص'} ریال`;
          if (equity.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${equity.year2.toLocaleString()} ریال`;
          prompt += `\n`;
        }
        prompt += `\n`;
      }

      // نسبت‌های کلیدی
      if (fc.keyRatios) {
        prompt += `📈 نسبت‌های مالی کلیدی:\n`;
        if (fc.keyRatios.currentRatio) {
          const ratio = fc.keyRatios.currentRatio;
          prompt += `- نسبت جاری (توان پرداخت): ${ratio.year1?.toFixed(2) || 'نامشخص'}`;
          if (ratio.year2) prompt += ` → ${ratio.year2.toFixed(2)}`;
          prompt += ` (بهینه: > 1.5)\n`;
        }
        if (fc.keyRatios.debtToEquity) {
          const ratio = fc.keyRatios.debtToEquity;
          prompt += `- نسبت بدهی به حقوق صاحبان سهام (D/E): ${ratio.year1?.toFixed(3) || 'نامشخص'}`;
          if (ratio.year2) prompt += ` → ${ratio.year2.toFixed(3)}`;
          prompt += ` (بهینه: < 1)\n`;
        }
        if (fc.keyRatios.roe) {
          const ratio = fc.keyRatios.roe;
          prompt += `- بازده حقوق صاحبان سهام (ROE): ${ratio.year1?.toFixed(2) || 'نامشخص'}%`;
          if (ratio.year2) prompt += ` → ${ratio.year2.toFixed(2)}%`;
          prompt += ` (بهینه: > 15%)\n`;
        }
        if (fc.keyRatios.netProfitMargin) {
          const ratio = fc.keyRatios.netProfitMargin;
          prompt += `- حاشیه سود خالص: ${ratio.year1?.toFixed(2) || 'نامشخص'}%`;
          if (ratio.year2) prompt += ` → ${ratio.year2.toFixed(2)}%`;
          prompt += ` (بهینه: > 10%)\n`;
        }
        if (fc.keyRatios.interestCoverage) {
          const ratio = fc.keyRatios.interestCoverage;
          prompt += `- پوشش بهره: ${ratio.year1?.toFixed(2) || 'نامشخص'}`;
          if (ratio.year2) prompt += ` → ${ratio.year2.toFixed(2)}`;
          prompt += ` (بهینه: > 3)\n`;
        }
        if (fc.keyRatios.revenueGrowth !== undefined) {
          prompt += `- رشد فروش (2 ساله): ${fc.keyRatios.revenueGrowth > 0 ? '+' : ''}${fc.keyRatios.revenueGrowth.toFixed(1)}%\n`;
        }
        if (fc.keyRatios.netProfitGrowth !== undefined) {
          prompt += `- رشد سود خالص (2 ساله): ${fc.keyRatios.netProfitGrowth > 0 ? '+' : ''}${fc.keyRatios.netProfitGrowth.toFixed(1)}%\n`;
        }
        prompt += `\n`;
      }

      // شاخص‌های ریسک
      if (fc.riskIndicators) {
        prompt += `⚠️ شاخص‌های ریسک مالی:\n`;
        if (fc.riskIndicators.altmanZScore) {
          const zScore = fc.riskIndicators.altmanZScore;
          prompt += `- امتیاز آلتمن (Z-Score): سال ${fc.fiscalYears[0]}: ${zScore.year1?.toFixed(2) || 'نامشخص'}`;
          if (zScore.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${zScore.year2.toFixed(2)}`;
          if (zScore.status) prompt += ` (وضعیت: ${zScore.status})`;
          prompt += `\n  معنی: Z > 2.6 = امن، 1.8-2.6 = هشدار، < 1.8 = خطر\n`;
        }
        if (fc.riskIndicators.dfl) {
          const dfl = fc.riskIndicators.dfl;
          prompt += `- درجه اهرم مالی (DFL): سال ${fc.fiscalYears[0]}: ${dfl.year1?.toFixed(4) || 'نامشخص'}`;
          if (dfl.year2) prompt += ` → سال ${fc.fiscalYears[1]}: ${dfl.year2.toFixed(4)}`;
          if (dfl.risk) prompt += ` (ریسک: ${dfl.risk})`;
          prompt += `\n  معنی: < 1 = ریسک کم، 1-2 = متوسط، > 2 = بالا\n`;
        }
        if (fc.riskIndicators.confidenceScore !== undefined) {
          prompt += `- امتیاز اطمینان داده‌ها: ${fc.riskIndicators.confidenceScore.toFixed(0)}%`;
          if (fc.riskIndicators.confidenceScore >= 80) prompt += ` (عالی)`;
          else if (fc.riskIndicators.confidenceScore >= 60) prompt += ` (قابل قبول)`;
          else prompt += ` (نیاز به بررسی)`;
          prompt += `\n`;
        }
        prompt += `\n`;
      }

      prompt += `⚠️ توجه: این اطلاعات مالی از اظهارنامه مالیاتی رسمی شرکت استخراج شده است. لطفاً در تحلیل خود:\n`;
      prompt += `- از این داده‌های دقیق مالی برای ارزیابی توانمندی مالی شرکت استفاده کنید\n`;
      prompt += `- نسبت‌های مالی را با استانداردهای صنعت مقایسه کنید\n`;
      prompt += `- شاخص‌های ریسک را در توصیه نهایی خود لحاظ کنید\n`;
      prompt += `- روند رشد را در ارزیابی پتانسیل آینده شرکت در نظر بگیرید\n\n`;
    }

    // اطلاعات پایه
    if (data.basicInfo) {
      prompt += `اطلاعات ثبتی:\n`;
      prompt += `- نام: ${data.basicInfo.title || data.basicInfo.name}\n`;
      prompt += `- شناسه ملی: ${data.basicInfo.registrationNo || data.basicInfo.nationalId}\n`;
      if (data.basicInfo.capital) prompt += `- سرمایه: ${data.basicInfo.capital} ریال\n`;
      if (data.basicInfo.address) prompt += `- آدرس: ${data.basicInfo.address}\n`;
      if (data.basicInfo.status) prompt += `- وضعیت: ${data.basicInfo.status}\n`;
      if (data.basicInfo.registrationDate) prompt += `- تاریخ ثبت: ${data.basicInfo.registrationDate}\n`;
      prompt += `\n`;
    }

    // نتایج تحقیق اینترنتی
    if (data.researchData && data.researchData.queries && data.researchData.queries.length > 0) {
      prompt += `نتایج تحقیق اینترنتی:\n`;
      data.researchData.queries.forEach((research: any, index: number) => {
        prompt += `${index + 1}. سوال: ${research.query}\n`;
        prompt += `پاسخ: ${research.content}\n`;
        if (research.citations && research.citations.length > 0) {
          prompt += `منابع: ${research.citations.slice(0, 3).join(', ')}\n`;
        }
        prompt += `\n`;
      });
    } else {
      prompt += `نتایج تحقیق اینترنتی: در دسترس نیست\n\n`;
    }

    // اطلاعات مدیران
    if (data.managers && data.managers.length > 0) {
      prompt += `مدیران شرکت:\n`;
      data.managers.forEach((manager: any) => {
        prompt += `- ${manager.name}: ${manager.position}\n`;
      });
      prompt += `\n`;
    }

    // فعالیت‌ها
    if (data.activities && data.activities.length > 0) {
      prompt += `فعالیت‌های ثبت شده:\n`;
      data.activities.forEach((activity: any) => {
        prompt += `- ${activity.description} (کد: ${activity.code})\n`;
      });
      prompt += `\n`;
    }

    // فرم‌های ثبت شده - حالا محتوای واقعی رو می‌خونیم
    if (data.formSubmissions && data.formSubmissions.length > 0) {
      logger.info(`📝 پردازش ${data.formSubmissions.length} فرم برای prompt:`, 'ai-analysis');

      prompt += `فرم‌های ثبت شده توسط شرکت:\n`;
      prompt += `- تعداد فرم‌های ثبت شده: ${data.formSubmissions.length}\n`;

      for (let i = 0; i < data.formSubmissions.length; i++) {
        const form = data.formSubmissions[i];
        logger.debug(`  پردازش فرم ${i + 1} با ID: ${form.id}`, 'ai-analysis');

        const formTitle = form.requirement?.title || `فرم ${i + 1}`;
        const formDescription = form.requirement?.description || 'بدون توضیح';

        prompt += `\n--- ${formTitle} ---\n`;
        prompt += `- نوع فرم: ${formTitle}\n`;
        prompt += `- توضیحات: ${formDescription}\n`;
        prompt += `- وضعیت: ${form.status}\n`;
        prompt += `- تاریخ ثبت: ${form.createdAt}\n`;

        // پردازش محتوای فرم
        if (form.formData) {
          try {
            const formData = typeof form.formData === 'string' ? JSON.parse(form.formData) : form.formData;
            logger.debug(`    تعداد فیلدهای فرم: ${Object.keys(formData).length}`, 'ai-analysis');

            prompt += `- محتوای فرم:\n`;

            // پردازش فیلدهای فرم
            let fieldsProcessed = 0;
            for (const [key, value] of Object.entries(formData)) {
              if (value && typeof value === 'string' && value.trim() !== '') {
                prompt += `  ${key}: ${value}\n`;
                fieldsProcessed++;
              } else if (value && typeof value === 'object' && value !== null) {
                prompt += `  ${key}: ${JSON.stringify(value)}\n`;
                fieldsProcessed++;
              } else if (value !== null && value !== undefined && value !== '') {
                prompt += `  ${key}: ${value}\n`;
                fieldsProcessed++;
              }
            }
            logger.debug(`    فیلدهای پردازش شده: ${fieldsProcessed}`, 'ai-analysis');
          } catch (error) {
            logger.error(`    خطا در پردازش فرم: ${error}`, 'ai-analysis');
            prompt += `- خطا در پردازش محتوای فرم: ${error}\n`;
          }
        } else {
          logger.debug(`    فرم بدون محتوا`, 'ai-analysis');
        }

        if (form.reviewNotes) {
          prompt += `- نظرات بررسی: ${form.reviewNotes}\n`;
        }
      }
      prompt += `\n`;
    } else {
      logger.info(`📝 هیچ فرم ثبت شده‌ای برای پردازش وجود ندارد`, 'ai-analysis');
    }

    // مدارک - حالا محتوای فایل‌ها رو می‌خونیم
    let totalDocumentCount = 0;
    let processedDocuments: any[] = [];

    // پردازش مدارک مستقل
    if (data.documents && data.documents.length > 0) {
      totalDocumentCount += data.documents.length;
      processedDocuments = [...data.documents];
    }

    // پردازش فایل‌های موجود در فرم‌ها
    if (data.formSubmissions && data.formSubmissions.length > 0) {
      logger.info(`🔍 بررسی ${data.formSubmissions.length} فرم برای یافتن فایل‌های اضافی...`, 'ai-analysis');

      for (const form of data.formSubmissions) {
        logger.debug(`\n📋 بررسی فرم ID: ${form.id}`, 'ai-analysis');

        if (form.formData) {
          logger.debug(`   ✅ فرم دارای formData است`, 'ai-analysis');

          try {
            const formData = typeof form.formData === 'string' ? JSON.parse(form.formData) : form.formData;
            logger.debug(`   ✅ formData با موفقیت parse شد`, 'ai-analysis');
            logger.debug(`   📊 تعداد فیلدها: ${Object.keys(formData).length}`, 'ai-analysis');

            // دنبال فیلدهای فایل می‌گردیم (هم filePath و هم fileId را پشتیبانی می‌کنیم)
            let fileFieldsFound = 0;
            for (const [key, value] of Object.entries(formData)) {
              // logger.debug(`   🔎 بررسی فیلد "${key}": type=${typeof value}, value=${JSON.stringify(value)?.substring(0, 100)}`, 'ai-analysis');

              if (value && typeof value === 'object' && (value as any).fileName) {
                fileFieldsFound++;
                logger.debug(`   🎯 فیلد "${key}" یک فایل است!`, 'ai-analysis');
                const fileInfo = value as { filePath?: string; fileName: string; fileId?: number };

                // اگر fileId داشته باشد، باید document را از دیتابیس بگیریم
                if (fileInfo.fileId && !fileInfo.filePath) {
                  logger.debug(`📎 فایل با fileId پیدا شد در فرم: ${fileInfo.fileName} (ID: ${fileInfo.fileId})`, 'ai-analysis');

                  // پیدا کردن document از لیست documents
                  const document = await storage.getDocument(fileInfo.fileId);
                  if (document) {
                    logger.debug(`   ✅ Document یافت شد:`, 'ai-analysis');
                    // logger.debug(`      - filePath: ${document.filePath}`, 'ai-analysis');
                    // logger.debug(`      - filename: ${(document as any).filename}`, 'ai-analysis');
                    // logger.debug(`      - originalName: ${document.originalName}`, 'ai-analysis');

                    // اگر filePath خالی است، از filename استفاده کنیم
                    let actualFilePath = document.filePath;
                    if (!actualFilePath && (document as any).filename) {
                      actualFilePath = `uploads/${(document as any).filename}`;
                      logger.debug(`   🔧 filePath خالی بود، ساخته شد: ${actualFilePath}`, 'ai-analysis');
                    }

                    if (actualFilePath) {
                      const formDocument = {
                        id: `form_${form.id}_${key}`,
                        name: document.originalName,
                        originalName: document.originalName,
                        filePath: actualFilePath,
                        mimeType: document.mimeType,
                        status: document.status,
                        category: key,
                        description: `فایل ضمیمه فرم: ${key}`
                      };

                      processedDocuments.push(formDocument);
                      totalDocumentCount++;
                      logger.debug(`   ✅ فایل به لیست اضافه شد`, 'ai-analysis');
                    } else {
                      logger.warn(`   ❌ filePath و filename هر دو خالی هستند!`, 'ai-analysis');
                    }
                  } else {
                    logger.warn(`   ⚠️ Document با ID ${fileInfo.fileId} یافت نشد`, 'ai-analysis');
                  }
                } else if (fileInfo.filePath) {
                  // روش قدیمی - فایل با filePath
                  logger.debug(`📎 فایل با filePath پیدا شد در فرم: ${fileInfo.fileName}`, 'ai-analysis');

                  const formDocument = {
                    id: `form_${form.id}_${key}`,
                    name: fileInfo.fileName,
                    originalName: fileInfo.fileName,
                    filePath: fileInfo.filePath,
                    mimeType: fileInfo.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'unknown',
                    status: 'approved',
                    category: key,
                    description: `فایل ضمیمه فرم: ${key}`
                  };

                  processedDocuments.push(formDocument);
                  totalDocumentCount++;
                }
              }
            }

            logger.debug(`   📊 فایل‌های پیدا شده در این فرم: ${fileFieldsFound}`, 'ai-analysis');

          } catch (error) {
            logger.error(`   ❌ خطا در پردازش فرم ${form.id}:`, 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
          }
        } else {
          logger.debug(`   ⚠️ فرم بدون formData است`, 'ai-analysis');
        }
      }
    }

    if (totalDocumentCount > 0) {
      prompt += `مدارک و فایل‌های ارائه شده:\n`;
      prompt += `- تعداد کل مدارک و فایل‌ها: ${totalDocumentCount}\n`;

      for (let i = 0; i < processedDocuments.length; i++) {
        const doc = processedDocuments[i];
        prompt += `\n--- مدرک ${i + 1} ---\n`;
        prompt += `- نام: ${doc.name || doc.originalName}\n`;
        prompt += `- نوع: ${doc.mimeType || 'نامشخص'}\n`;
        prompt += `- وضعیت: ${doc.status}\n`;
        prompt += `- دسته‌بندی: ${doc.category || 'نامشخص'}\n`;

        // خواندن محتوای فایل
        if (doc.filePath) {
          try {
            logger.info(`📄 شروع پردازش مدرک ${i + 1}/${processedDocuments.length}:`, 'ai-analysis');
            logger.debug(`   - نام فایل: ${doc.name || doc.originalName}`, 'ai-analysis');
            logger.debug(`   - مسیر فایل: ${doc.filePath}`, 'ai-analysis');
            logger.debug(`   - نوع فایل: ${doc.mimeType}`, 'ai-analysis');

            // بررسی وجود فایل قبل از تلاش برای خواندن
            const fs = await import('fs/promises');
            const path = await import('path');

            // تبدیل مسیر نسبی به مطلق
            let absolutePath = doc.filePath;
            if (!path.isAbsolute(doc.filePath)) {
              // اگر مسیر نسبی است، از root پروژه شروع می‌کنیم
              absolutePath = path.join(process.cwd(), doc.filePath);
              logger.debug(`   - مسیر تبدیل شده به مطلق: ${absolutePath}`, 'ai-analysis');
            }

            try {
              await fs.access(absolutePath);
              logger.debug(`   ✅ فایل موجود است، شروع استخراج محتوا...`, 'ai-analysis');
            } catch (accessError) {
              logger.warn(`   ❌ فایل در مسیر مشخص شده یافت نشد!`, 'ai-analysis');
              prompt += `- ⚠️ خطا: فایل در مسیر "${absolutePath}" یافت نشد\n`;

              if (doc.description) {
                prompt += `- توضیحات: ${doc.description}\n`;
              }
              continue;
            }

            const documentContent = await this.extractFileContent(absolutePath, doc.mimeType);
            if (documentContent) {
              logger.info(`   ✅ محتوا با موفقیت استخراج شد (روش: ${documentContent.extractionMethod})`, 'ai-analysis');
              prompt += `- روش استخراج: ${documentContent.extractionMethod}\n`;
              prompt += `- محتوای استخراج شده:\n${documentContent.content}\n`;

              if (documentContent.error) {
                logger.warn(`   ⚠️ خطا در استخراج: ${documentContent.error}`, 'ai-analysis');
                prompt += `- خطا در پردازش: ${documentContent.error}\n`;
              }
            } else {
              logger.warn(`   ❌ محتوای فایل قابل خواندن نیست (null برگشت داده شد)`, 'ai-analysis');
              prompt += `- ⚠️ محتوای فایل قابل خواندن نیست\n`;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`   ❌ خطا در خواندن فایل: ${errorMessage}`, 'ai-analysis');
            logger.error(`   جزئیات خطا:`, 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
            prompt += `- ⚠️ خطا در خواندن فایل: ${errorMessage}\n`;
          }
        } else {
          logger.warn(`   ⚠️ مسیر فایل موجود نیست`, 'ai-analysis');
          prompt += `- ⚠️ مسیر فایل در دیتابیس موجود نیست\n`;
        }

        if (doc.description) {
          prompt += `- توضیحات: ${doc.description}\n`;
        }
      }
      prompt += `\n`;
    }

    // پنل‌های اطلاعاتی شرکت
    if (data.companyPanels) {
      if (data.companyPanels.teamInfo) {
        prompt += `اطلاعات تیم (ثبت شده توسط شرکت):\n`;
        prompt += `${JSON.stringify(data.companyPanels.teamInfo, null, 2)}\n\n`;
      }

      if (data.companyPanels.productInfo) {
        prompt += `اطلاعات محصولات و خدمات (ثبت شده توسط شرکت):\n`;
        prompt += `${JSON.stringify(data.companyPanels.productInfo, null, 2)}\n\n`;
      }

      if (data.companyPanels.marketInfo) {
        prompt += `اطلاعات بازار (ثبت شده توسط شرکت):\n`;
        prompt += `${JSON.stringify(data.companyPanels.marketInfo, null, 2)}\n\n`;
      }

      if (data.companyPanels.financialInfo) {
        prompt += `اطلاعات مالی تکمیلی (ثبت شده توسط شرکت):\n`;
        prompt += `${JSON.stringify(data.companyPanels.financialInfo, null, 2)}\n\n`;
      }
    }

    // آگهی‌های روزنامه رسمی (رسمیو)
    if (data.news && data.news.length > 0) {
      prompt += `## آگهی‌های روزنامه رسمی (API رسمیو):\n`;
      prompt += `تعداد آگهی‌ها: ${data.news.length}\n`;
      data.news.slice(0, 5).forEach((news: any, index: number) => {
        prompt += `آگهی ${index + 1}:\n`;
        prompt += `- عنوان: ${news.title}\n`;
        prompt += `- تاریخ چاپ: ${news.newspaperDate}\n`;
        prompt += `- روزنامه شماره: ${news.newspaperNumber} (${news.newspaperCityType})\n`;
        if (news.capitalTo) {
          prompt += `- سرمایه جدید: ${news.capitalTo} ریال\n`;
        }
        prompt += `- شرح: ${news.description?.substring(0, 300)}...\n`;
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    prompt += `لطفاً این شرکت را از شش بعد زیر تحلیل کنید و برای هر بعد نمره‌ای از 1 تا 10 بدهید:

1. **تحلیل تیم** (قدرت تیم مدیریتی، تجربه، سوابق)
2. **تحلیل محصول** (پتانسیل محصول/خدمات، مزیت رقابتی)
3. **تحلیل بازار** (اندازه بازار، رقابت، روندهای بازار)
4. **تحلیل مالی** (ساختار سرمایه، پتانسیل رشد مالی)
5. **تحلیل ریسک** (ریسک های عمده، راهکارهای کاهش ریسک)
6. **تحلیل فرم‌ها و مدارک** (کیفیت و کامل بودن اطلاعات، مدارک ارائه شده، نواقص موجود)

در نهایت یک توصیه کلی برای سرمایه‌گذاری ارائه دهید.

پاسخ را به صورت JSON با ساختار زیر ارائه دهید:
{
  "teamAnalysis": {
    "score": نمره از 1-10,
    "strengths": ["نقاط قوت"],
    "weaknesses": ["نقاط ضعف"],
    "summary": "خلاصه تحلیل تیم"
  },
  "productAnalysis": {
    "score": نمره از 1-10,
    "marketPotential": "پتانسیل بازار",
    "competitiveAdvantage": "مزیت رقابتی", 
    "summary": "خلاصه تحلیل محصول"
  },
  "marketAnalysis": {
    "score": نمره از 1-10,
    "marketSize": "اندازه بازار",
    "competition": "وضعیت رقابت",
    "trends": "روندهای بازار",
    "summary": "خلاصه تحلیل بازار"
  },
  "financialAnalysis": {
    "score": نمره از 1-10,
    "capitalStructure": "ساختار سرمایه",
    "growthPotential": "پتانسیل رشد",
    "summary": "خلاصه تحلیل مالی"
  },
  "riskAnalysis": {
    "score": نمره از 1-10,
    "mainRisks": ["ریسک‌های اصلی"],
    "mitigationStrategies": ["راهکارهای کاهش ریسک"],
    "summary": "خلاصه تحلیل ریسک"
  },
  "formAnalysis": {
    "score": نمره از 1-10,
    "completedForms": ["نام فرم‌های تکمیل شده"],
    "keyInsights": ["نکات کلیدی از فرم‌ها و مدارک"],
    "documentsQuality": "توضیح کیفیت مدارک ارائه شده",
    "missingInfo": ["اطلاعات و مدارک گمشده"],
    "summary": "خلاصه تحلیل فرم‌ها و مدارک"
  },
  "overallRecommendation": {
    "score": نمره کلی از 1-10,
    "recommendation": "strongly_recommend|recommend|neutral|not_recommend|strongly_not_recommend",
    "reasoning": "دلیل توصیه",
    "nextSteps": ["گام‌های بعدی پیشنهادی"]
  }
}`;

    return prompt;
  }

  // متد پیشرفته برای استخراج محتوای فایل‌ها
  async extractFileContent(filePath: string, mimeType?: string): Promise<DocumentContent | null> {
    const fileName = path.basename(filePath);

    try {
      logger.debug(`🔍 استخراج محتوا: ${fileName} (${mimeType || 'نامشخص'})`, 'ai-analysis');
      logger.debug(`   مسیر: ${filePath}`, 'ai-analysis');

      // Convert Windows path to Linux path if needed
      const convertedPath = convertPathToLinux(filePath);
      logger.debug(`📁 مسیر تبدیل شده: ${convertedPath}`, 'ai-analysis');

      // بررسی وجود فایل
      await fs.access(convertedPath);

      // شناسایی نوع فایل
      const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath);
      const isPDF = mimeType?.includes('pdf') || filePath.toLowerCase().endsWith('.pdf');
      const isText = mimeType?.startsWith('text/') || /\.(txt|md|json|xml|csv)$/i.test(filePath);

      if (isPDF) {
        logger.info(`📄 شناسایی فایل PDF: ${fileName}`, 'ai-analysis');

        // بررسی وجود فایل
        try {
          await fs.access(convertedPath);
          logger.debug(`   ✅ فایل PDF موجود است`, 'ai-analysis');
        } catch (accessError) {
          logger.error(`   ❌ فایل PDF یافت نشد: ${convertedPath}`, 'ai-analysis');
          return {
            fileName,
            content: `[فایل PDF: ${fileName} - فایل در مسیر مشخص شده یافت نشد]`,
            extractionMethod: 'error',
            error: `File not found: ${convertedPath}`
          };
        }

        // ۱. تلاش برای استخراج متنی به صورت محلی با pdf2json (بسیار سریع و بدون مصرف کلید)
        try {
          logger.info(`   📖 تلاش برای استخراج متنی محلی از PDF: ${fileName}`, 'ai-analysis');
          const pdfParser = new (PDFParser as any)(null, 1);
          const rawText: string = await new Promise((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
            pdfParser.on("pdfParser_dataReady", () => {
              resolve(pdfParser.getRawTextContent());
            });
            pdfParser.loadPDF(convertedPath);
          });

          if (rawText && rawText.trim().length > 100) {
            logger.info(`   ✅ استخراج محلی موفقیت‌آمیز بود! (${rawText.length} کاراکتر)`, 'ai-analysis');
            return {
              fileName,
              content: `📄 محتوای کامل استخراج شده از PDF "${fileName}":\n\n${rawText.trim()}`,
              extractionMethod: 'local-pdf2json'
            };
          }
          logger.info(`   ⚠️ متن استخراج شده محلی خالی یا بسیار کوتاه است (${rawText?.length || 0} کاراکتر). استفاده از مدل هوش مصنوعی...`, 'ai-analysis');
        } catch (localError) {
          logger.warn(`   ⚠️ خطای استخراج محلی: ${localError instanceof Error ? localError.message : String(localError)}. تلاش با مدل...`, 'ai-analysis');
        }

        // ۲. پردازش PDF با Claude/GapGPT Document API (در صورت عدم موفقیت استخراج متنی)
        try {
          logger.debug(`   📖 خواندن فایل PDF برای ارسال به هوش مصنوعی...`, 'ai-analysis');
          const buffer = await fs.readFile(convertedPath);
          const fileSize = Math.round(buffer.length / 1024);

          logger.debug(`   📊 حجم فایل: ${fileSize}KB (${buffer.length} بایت)`, 'ai-analysis');

          // بررسی اعتبار PDF
          const pdfHeader = buffer.slice(0, 4).toString();
          const isValidPDF = pdfHeader === '%PDF';
          if (!isValidPDF) {
            logger.error(`   ❌ فایل PDF نامعتبر (هدر: ${pdfHeader})`, 'ai-analysis');
            throw new Error('فایل PDF نامعتبر');
          }
          logger.debug(`   ✅ فایل PDF معتبر`, 'ai-analysis');

          // بررسی محدودیت‌های Claude API
          if (fileSize > 32 * 1024) { // 32MB
            logger.error(`   ❌ PDF بیش از حد بزرگ: ${fileSize}KB`, 'ai-analysis');
            throw new Error(`PDF بیش از حد بزرگ است: ${fileSize}KB (حداکثر: 32MB)`);
          }

          const base64Data = buffer.toString('base64');
          logger.debug(`   📦 فایل به base64 تبدیل شد (${base64Data.length} کاراکتر)`, 'ai-analysis');

          logger.info(`   🤖 ارسال PDF به Claude Document API...`, 'ai-analysis');

          // استفاده از Document API جدید Claude
          const response = await getAnthropicClient().messages.create({
            model: DEFAULT_MODEL_STR,
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: base64Data
                    }
                  },
                  {
                    type: 'text',
                    text: `لطفاً این سند PDF را به دقت تحلیل کنید و تمام اطلاعات موجود را استخراج کنید:

🔍 **متن و نوشته‌ها:**
- تمام متن فارسی و انگلیسی
- اعداد، تاریخ‌ها، ارقام و واحدها
- نام‌های افراد، شرکت‌ها، سازمان‌ها

📊 **جداول و داده‌ها:**
- محتوای کامل جداول (عناوین ستون‌ها و تمام ردیف‌ها)
- فهرست‌ها و برچسب‌ها
- آمار و گزارش‌های عددی

📈 **نمودارها و تصاویر:**
- توضیح نمودارها و چارت‌ها
- اطلاعات موجود در تصاویر
- لوگوها و نشان‌ها

📋 **ساختار سند:**
- نوع سند (گواهینامه، قرارداد، صورت‌حساب، گزارش مالی، و...)
- عناوین و بخش‌بندی‌ها
- امضاها و مهرها

لطفاً همه‌چیز را به صورت کامل، دقیق و ساختاریافته بنویسید.`
                  }
                ]
              }
            ]
          });

          const content = response.content[0].type === 'text' ? response.content[0].text : '';

          if (content && content.length > 100) {
            logger.info(`   ✅ PDF با موفقیت پردازش شد!`, 'ai-analysis');
            logger.debug(`   📝 طول محتوای استخراج شده: ${content.length} کاراکتر`, 'ai-analysis');
            logger.debug(`   📋 نمونه محتوا: ${content.substring(0, 200)}...`, 'ai-analysis');
            return {
              fileName,
              content: `📄 محتوای کامل استخراج شده از PDF "${fileName}" (${fileSize}KB):\n\n${content.trim()}`,
              extractionMethod: 'claude-vision'
            };
          } else {
            logger.error(`   ❌ محتوای استخراج شده کوتاه است: ${content.length} کاراکتر`, 'ai-analysis');
            throw new Error(`محتوای کافی از PDF استخراج نشد (${content.length} کاراکتر)`);
          }

        } catch (pdfError: any) {
          logger.error(`   ❌ خطا در پردازش PDF: ${pdfError.message}`, 'ai-analysis');
          logger.error(`   جزئیات خطا:`, 'ai-analysis', pdfError);

          // Fallback: اطلاعات پایه
          try {
            const buffer = await fs.readFile(convertedPath);
            const fileSize = Math.round(buffer.length / 1024);

            let fallbackContent = `فایل PDF "${fileName}" - ${fileSize}KB\n`;
            fallbackContent += `📊 وضعیت: فایل معتبر اما پردازش با Claude ناموفق\n`;
            fallbackContent += `⚠️ خطا: ${pdfError.message}\n`;

            // تشخیص نوع بر اساس نام
            const fileName_lower = fileName.toLowerCase();
            if (fileName_lower.includes('مالی') || fileName_lower.includes('financial')) {
              fallbackContent += `💰 نوع احتمالی: سند مالی - صورت‌های مالی`;
            } else if (fileName_lower.includes('اعتبارسنجی') || fileName_lower.includes('گواهی')) {
              fallbackContent += `🏆 نوع احتمالی: گواهینامه - مجوزها`;
            } else if (fileName_lower.includes('بیمه')) {
              fallbackContent += `🛡️ نوع احتمالی: اسناد بیمه`;
            }

            return {
              fileName,
              content: fallbackContent,
              extractionMethod: 'error',
              error: pdfError.message
            };
          } catch (fallbackError) {
            return {
              fileName,
              content: `[PDF: ${fileName} - خطا در پردازش: ${pdfError.message}]`,
              extractionMethod: 'error',
              error: pdfError.message
            };
          }
        }
      } else if (mimeType?.includes('text') || ['.txt', '.md', '.json', '.xml', '.csv'].some(ext => filePath.toLowerCase().endsWith(ext))) {
        logger.info(`📝 پردازش فایل متنی: ${fileName}`, 'ai-analysis');

        try {
          const content = await fs.readFile(convertedPath, 'utf-8');
          const fileSize = Math.round(content.length / 1024);

          logger.debug(`📊 حجم فایل متنی: ${fileSize}KB`, 'ai-analysis');
          logger.debug(`✅ فایل متنی با موفقیت خوانده شد (${content.length} کاراکتر)`, 'ai-analysis');

          if (content.trim().length > 5) {
            // محدود کردن طول برای جلوگیری از prompt طولانی
            const maxLength = 8000; // افزایش محدودیت
            const limitedContent = content.length > maxLength ?
              content.substring(0, maxLength) + '...\n[محتوا برای جلوگیری از طولانی شدن کوتاه شده است]' :
              content;

            return {
              fileName,
              content: `محتوای فایل متنی "${fileName}" (${fileSize}KB):\n\n${limitedContent.trim()}`,
              extractionMethod: 'text'
            };
          } else {
            logger.warn(`⚠️ فایل متنی خالی یا کوتاه: ${fileName}`, 'ai-analysis');
            return {
              fileName,
              content: `فایل متنی "${fileName}" - فایل خالی یا محتوای کافی ندارد`,
              extractionMethod: 'text'
            };
          }
        } catch (textError: any) {
          logger.warn(`⚠️ خوندن فایل متنی ناموفق: ${textError.message}`, 'ai-analysis');

          return {
            fileName,
            content: `فایل متنی "${fileName}"\n📊 وضعیت: خطا در خواندن فایل\n⚠️ خطا: ${textError.message}`,
            extractionMethod: 'file-info',
            error: textError.message
          };
        }
      } else if (mimeType?.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => filePath.toLowerCase().endsWith(ext))) {
        logger.info(`🖼️ پردازش تصویر: ${fileName}`, 'ai-analysis');

        try {
          const buffer = await fs.readFile(convertedPath);
          const fileSize = Math.round(buffer.length / 1024);
          const base64Data = buffer.toString('base64');

          // Properly detect image type based on file extension or mime type
          let imageType = 'image/jpeg'; // default
          if (mimeType) {
            imageType = mimeType;
          } else {
            const ext = filePath.toLowerCase();
            if (ext.endsWith('.png')) {
              imageType = 'image/png';
            } else if (ext.endsWith('.gif')) {
              imageType = 'image/gif';
            } else if (ext.endsWith('.webp')) {
              imageType = 'image/webp';
            } else if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
              imageType = 'image/jpeg';
            }
          }

          logger.debug(`📊 حجم تصویر: ${fileSize}KB`, 'ai-analysis');
          logger.debug(`🎨 نوع تصویر: ${imageType}`, 'ai-analysis');
          logger.info(`👁️ ارسال تصویر به Claude Vision...`, 'ai-analysis');

          const response = await getAnthropicClient().messages.create({
            model: DEFAULT_MODEL_STR,
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `لطفاً این تصویر را دقیق تحلیل کنید و تمام اطلاعات موجود را استخراج کنید:

🔍 **متن و نوشته‌ها:**
- تمام متن فارسی و انگلیسی
- اعداد، تاریخ‌ها و ارقام
- نام‌های افراد، شرکت‌ها و سازمان‌ها

📊 **جداول و داده‌ها:**
- محتوای جداول (سر ستون‌ها و مقادیر)
- فهرست‌ها و برچسب‌ها
- آمار و گزارش‌های عددی

📋 **نوع سند:**
- توضیح دهید این چه نوع سندی است (گواهینامه، مدرک، فاکتور، قرارداد، و غیره)
- اهمیت و کاربرد این سند

همه‌چیز را به صورت کامل و دقیق بنویسید:`
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: imageType as any,
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          });

          const content = response.content[0].type === 'text' ? response.content[0].text : '';

          if (content && content.length > 20) {
            logger.info(`✅ تصویر با موفقیت با Claude Vision تحلیل شد (${content.length} کاراکتر)`, 'ai-analysis');
            return {
              fileName,
              content: `محتوای استخراج شده از تصویر "${fileName}" (${fileSize}KB):\n\n${content.trim()}`,
              extractionMethod: 'claude-vision'
            };
          } else {
            throw new Error('محتوای کافی از تصویر استخراج نشد');
          }
        } catch (imageError: any) {
          logger.warn(`⚠️ تحلیل تصویر ناموفق: ${imageError.message}`, 'ai-analysis');

          const buffer = await fs.readFile(convertedPath);
          const fileSize = Math.round(buffer.length / 1024);

          return {
            fileName,
            content: `فایل تصویر "${fileName}" - ${fileSize}KB\n📊 وضعیت: فایل معتبر اما تحلیل تصویر ناموفق\n⚠️ خطا: ${imageError.message}`,
            extractionMethod: 'file-info',
            error: imageError.message
          };
        }

        return {
          fileName,
          content: `[تصویر: ${fileName} - نیاز به تحلیل دستی تصویر]`,
          extractionMethod: 'error'
        };
      } else if (mimeType?.includes('application/vnd.openxmlformats-officedocument') || filePath.toLowerCase().endsWith('.docx')) {
        logger.info(`📄 پردازش فایل Word: ${fileName}`, 'ai-analysis');

        try {
          // استفاده از سرویس موجود برای استخراج Word
          const { AIVariableDetectionService } = await import('./ai-variable-detection.service');
          const service = new AIVariableDetectionService();

          const extractedContent = await service.extractContentFromWord(convertedPath);

          if (extractedContent && extractedContent.length > 50) {
            logger.info(`✅ فایل Word با موفقیت خوانده شد (${extractedContent.length} کاراکتر)`, 'ai-analysis');

            const stats = await fs.stat(convertedPath);
            const fileSize = Math.round(stats.size / 1024);

            return {
              fileName,
              content: `📝 محتوای استخراج شده از Word "${fileName}" (${fileSize}KB):\n\n${extractedContent.trim()}`,
              extractionMethod: 'text'
            };
          } else {
            throw new Error('محتوای کافی از Word استخراج نشد');
          }

        } catch (wordError: any) {
          logger.warn(`⚠️ خطا در پردازش Word: ${wordError.message}`, 'ai-analysis');

          try {
            const stats = await fs.stat(convertedPath);
            const fileSize = Math.round(stats.size / 1024);

            return {
              fileName,
              content: `[Word: ${fileName} - ${fileSize}KB - خطا در پردازش: ${wordError.message}]`,
              extractionMethod: 'error',
              error: wordError.message
            };
          } catch (statError) {
            return {
              fileName,
              content: `[Word: ${fileName} - خطا در پردازش: ${wordError.message}]`,
              extractionMethod: 'error',
              error: wordError.message
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error(`❌ خطای کلی در خواندن فایل ${filePath}:`, 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
      return {
        fileName,
        content: `[خطا در خواندن فایل: ${fileName}]`,
        extractionMethod: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async researchCompanyWithPerplexity(companyName: string, apiKey: string): Promise<any> {
    try {
      logger.info('شروع تحقیق با Perplexity API...', 'ai-analysis');

      const queries = [
        `شرکت ${companyName} ایران چیست؟ حوزه فعالیت، محصولات و خدمات`,
        `مدیران و بنیان‌گذاران شرکت ${companyName} ایران`,
        `وضعیت مالی و عملکرد شرکت ${companyName} ایران`,
        `رقبا و وضعیت بازار شرکت ${companyName} ایران`
      ];

      const researchResults = [];

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        logger.debug(`تحقیق ${i + 1}/${queries.length}: ${query}`, 'ai-analysis');

        try {
          // logger.debug(`🔑 استفاده از API Key: ${apiKey.substring(0, 10)}...`, 'ai-analysis');

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          logger.info(`🌐 ارسال درخواست به Perplexity API...`, 'ai-analysis');
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar-pro',
              messages: [
                {
                  role: 'system',
                  content: 'شما یک محقق حرفه‌ای هستید. اطلاعات دقیق و واقعی ارائه دهید.'
                },
                {
                  role: 'user',
                  content: query
                }
              ],
              max_tokens: 1000,
              temperature: 0.1,
              search_recency_filter: 'month'
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          logger.info(`پاسخ Perplexity: ${response.status} ${response.statusText}`, 'ai-analysis');

          if (response.ok) {
            const data = await response.json();
            logger.info('تحقیق موفق بود', 'ai-analysis');
            researchResults.push({
              query,
              content: data.choices[0].message.content,
              citations: data.citations || []
            });
          } else {
            const errorText = await response.text();
            logger.error(`خطای API Perplexity: ${response.status} - ${errorText}`, 'ai-analysis');
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            logger.warn(`Timeout در تحقیق: ${query}`, 'ai-analysis');
          } else {
            logger.error(`خطا در تحقیق ${query}:`, 'ai-analysis', err instanceof Error ? err : new Error(String(err)));
          }
        }

        // تاخیر کوتاه بین درخواست‌ها
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      logger.info(`تحقیق تکمیل شد. ${researchResults.length} نتیجه دریافت شد`, 'ai-analysis');

      return {
        queries: researchResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('خطا در تحقیق Perplexity:', 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async researchCompanyWithClaudeAI(companyName: string): Promise<any> {
    try {
      logger.info('🔍 شروع تحقیق با Claude AI (اطلاعات عمومی)...', 'ai-analysis');

      // نکته: در آینده میتوان از Claude Web Search API استفاده کرد
      // فعلاً از دانش عمومی Claude AI استفاده می‌کنیم به عنوان fallback

      const queries = [
        `شرکت ${companyName} ایران چیست؟ حوزه فعالیت، محصولات و خدمات آن را به تفصیل توضیح دهید.`,
        `مدیران، بنیان‌گذاران و تیم مدیریتی شرکت ${companyName} ایران کیستند؟`,
        `وضعیت مالی، عملکرد و اخبار مربوط به شرکت ${companyName} ایران چگونه است؟`,
        `رقبای اصلی و وضعیت بازار شرکت ${companyName} ایران چگونه است؟`
      ];

      const researchResults = [];

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        logger.debug(`🔍 تحقیق ${i + 1}/${queries.length}: ${query}`, 'ai-analysis');

        try {
          logger.info(`🤖 ارسال درخواست به Claude AI...`, 'ai-analysis');

          const response = await getAnthropicClient().messages.create({
            model: DEFAULT_MODEL_STR,
            max_tokens: 1000,
            system: `شما یک تحلیلگر حرفه‌ای هستید که اطلاعات دقیق و مفصل در مورد شرکت‌های ایرانی ارائه می‌دهید. لطفاً بر اساس دانش عمومی خود، اطلاعات جامع و مفیدی ارائه دهید. اگر اطلاعات خاصی ندارید، آن را صراحت اعلام کنید.`,
            messages: [
              {
                role: "user",
                content: query
              }
            ]
          });

          // استخراج محتوا از response
          let content = '';
          if (response.content && response.content.length > 0) {
            for (const item of response.content) {
              if (item.type === 'text') {
                content += item.text + '\n';
              }
            }
          }

          if (content.trim()) {
            logger.info('✅ تحقیق موفق بود', 'ai-analysis');
            researchResults.push({
              query,
              content: content.trim(),
              citations: [] // Claude AI knowledge-based research
            });
          } else {
            logger.warn('⚠️ محتوای خالی دریافت شد', 'ai-analysis');
          }

        } catch (err) {
          logger.error(`❌ خطا در تحقیق ${query}:`, 'ai-analysis', err instanceof Error ? err : new Error(String(err)));
        }

        // تاخیر کوتاه بین درخواست‌ها
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      logger.info(`✅ تحقیق Claude AI تکمیل شد. ${researchResults.length} نتیجه دریافت شد`, 'ai-analysis');

      return {
        queries: researchResults,
        timestamp: new Date().toISOString(),
        source: 'Claude AI Knowledge Base'
      };
    } catch (error) {
      logger.error('❌ خطا در تحقیق Claude AI:', 'ai-analysis', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private parseAnalysisText(text: string, data: any): AnalysisResult {
    // استخراج اطلاعات از تحقیق اینترنتی
    let companyOverview = `${data.basicInfo?.name || 'شرکت'} - تحلیل بر اساس اطلاعات موجود`;

    if (data.researchData && data.researchData.queries && data.researchData.queries.length > 0) {
      const firstResearch = data.researchData.queries[0];
      companyOverview = firstResearch.content.substring(0, 300) + '...';
    }

    return {
      companyOverview,
      teamAnalysis: {
        score: 6,
        strengths: ["تیم مدیریتی با تجربه"],
        weaknesses: ["نیاز به بررسی بیشتر سوابق"],
        summary: "تیم مدیریتی نیاز به بررسی دقیق‌تر دارد"
      },
      productAnalysis: {
        score: 6,
        marketPotential: "متوسط",
        competitiveAdvantage: "نیاز به تعریف دقیق‌تر",
        summary: "محصولات و خدمات نیاز به تحلیل عمیق‌تر دارد"
      },
      marketAnalysis: {
        score: 6,
        marketSize: "قابل بررسی",
        competition: "متوسط",
        trends: "نیاز به تحقیق بازار",
        summary: "بازار نیاز به تحلیل دقیق‌تری دارد"
      },
      financialAnalysis: {
        score: data.basicInfo?.capital ? 7 : 5,
        capitalStructure: data.basicInfo?.capital ? "سرمایه مناسب" : "نیاز به بررسی",
        growthPotential: "قابل بررسی",
        summary: "وضعیت مالی نیاز به تحلیل دقیق‌تر دارد"
      },
      riskAnalysis: {
        score: 6,
        mainRisks: ["ریسک بازار", "ریسک مالی", "ریسک اجرایی"],
        mitigationStrategies: ["تحلیل دقیق‌تر", "برنامه‌ریزی مالی", "نظارت مستمر"],
        summary: "ریسک‌ها قابل مدیریت هستند"
      },
      overallRecommendation: {
        score: 6,
        recommendation: 'neutral',
        reasoning: "شرکت پتانسیل دارد اما نیاز به بررسی دقیق‌تر",
        nextSteps: ["تحلیل عمیق‌تر تیم", "بررسی وضعیت مالی", "تحقیق بازار"]
      }
    };
  }

  private createLimitedAnalysis(companyData: CompanyAnalysisData): AnalysisResult {
    const companyName = companyData.basicInfo?.name || companyData.basicInfo?.title || 'شرکت';

    return {
      companyOverview: `${companyName} - اطلاعات تکمیلی از تحقیق اینترنتی در دسترس نیست`,
      teamAnalysis: {
        score: 3,
        strengths: [],
        weaknesses: ['اطلاعات کافی در مورد تیم مدیریت در دسترس نیست'],
        summary: 'به دلیل کمبود اطلاعات، امکان ارزیابی دقیق تیم مدیریت وجود ندارد. برای تحلیل بهتر، نیاز به اطلاعات بیشتری در مورد مدیران و سابقه کاری آنها است.'
      },
      productAnalysis: {
        score: 3,
        marketPotential: 'نامشخص - نیاز به اطلاعات بیشتر',
        competitiveAdvantage: 'قابل تعیین نیست با اطلاعات موجود',
        summary: 'اطلاعات کافی در مورد محصولات یا خدمات شرکت در دسترس نیست. برای ارزیابی دقیق نیاز به شرح محصولات، بازار هدف و استراتژی رقابتی است.'
      },
      marketAnalysis: {
        score: 3,
        marketSize: 'قابل تعیین نیست',
        competition: 'نامشخص',
        trends: 'نیاز به تحقیق بیشتر',
        summary: 'تحلیل بازار به دلیل کمبود اطلاعات امکان‌پذیر نیست. نیاز به اطلاعات در مورد حوزه فعالیت، بازار هدف و وضعیت رقابتی است.'
      },
      financialAnalysis: {
        score: 3,
        capitalStructure: companyData.basicInfo?.capital ? `سرمایه ثبت شده: ${companyData.basicInfo.capital} ریال` : 'اطلاعات مالی محدود',
        growthPotential: 'قابل ارزیابی نیست با اطلاعات موجود',
        summary: 'تحلیل مالی محدود است. برای ارزیابی دقیق نیاز به صورت‌های مالی، سابقه درآمد و هزینه‌ها، و برنامه‌های مالی است.'
      },
      riskAnalysis: {
        score: 6,
        mainRisks: [
          'کمبود اطلاعات کافی برای ارزیابی دقیق ریسک‌ها',
          'عدم شفافیت در عملکرد مالی',
          'نامشخص بودن استراتژی کسب‌وکار'
        ],
        mitigationStrategies: [
          'جمع‌آوری اطلاعات کامل‌تر از شرکت',
          'بررسی سوابق مالی و عملکرد',
          'مصاحبه حضوری با تیم مدیریت',
          'ارائه برنامه کسب‌وکار تفصیلی'
        ],
        summary: 'ریسک اصلی در حال حاضر کمبود اطلاعات است. قبل از هرگونه تصمیم‌گیری سرمایه‌گذاری، باید اطلاعات کامل‌تری جمع‌آوری شود.'
      },
      overallRecommendation: {
        score: 3,
        recommendation: 'neutral' as const,
        reasoning: `${companyName} در مرحله ابتدایی ارزیابی قرار دارد. به دلیل کمبود اطلاعات کافی، امکان ارائه توصیه قطعی وجود ندارد. نیاز به جمع‌آوری اطلاعات بیشتر و بررسی دقیق‌تر است.`,
        nextSteps: [
          'درخواست ارائه برنامه کسب‌وکار تفصیلی',
          'جمع‌آوری صورت‌های مالی سه سال گذشته',
          'مصاحبه با تیم مدیریت',
          'بررسی سوابق و رزومه مدیران',
          'تحلیل بازار و رقبا',
          'ارزیابی فنی محصولات یا خدمات',
          'بررسی وضعیت حقوقی و مالیاتی شرکت'
        ]
      }
    };
  }

  async analyzePitchDeck(filePath: string, mimeType: string): Promise<AnalysisResult> {
    const timer = new PerformanceTimer('analyzePitchDeck');
    try {
      logger.info(`📊 Starting Pitch Deck Analysis: ${path.basename(filePath)}`, 'ai-analysis');

      // 1. Extract content using PitchDeckExtractorService
      const extractedContent = await pitchDeckExtractorService.extractText(filePath, mimeType);

      logger.info(`✅ Text extracted from Pitch Deck (${extractedContent.length} chars)`, 'ai-analysis');

      // 2. Analyze with Claude
      const systemPrompt = `You are an expert Venture Capital Analyst. Analyze the following Pitch Deck content and provide a detailed evaluation.

Focus on these key areas:
1. Team: Evaluate the team's experience, skills, and completeness.
2. Market: Evaluate the market size (TAM/SAM/SOM), growth potential, and competition.
3. Product-Market Fit (PMF): Evaluate the problem-solution fit, value proposition, and competitive advantage.
4. Revenue Model: Evaluate the business model, revenue streams, pricing, and financial projections.
5. Risks: Evaluate the main risks and mitigation strategies.

Provide a score (1-10) for each area.
Provide detailed strengths and weaknesses.
Provide a summary for each area.

Return the result as a JSON object matching this structure:
{
  "teamAnalysis": { "score": number, "strengths": string[], "weaknesses": string[], "summary": string },
  "marketAnalysis": { "score": number, "marketSize": string, "competition": string, "trends": string, "summary": string },
  "productAnalysis": { "score": number, "marketPotential": string, "competitiveAdvantage": string, "summary": string },
  "financialAnalysis": { "score": number, "capitalStructure": string, "growthPotential": string, "summary": string },
  "riskAnalysis": { "score": number, "mainRisks": string[], "mitigationStrategies": string[], "summary": string },
  "overallRecommendation": { "score": number, "recommendation": "strongly_recommend" | "recommend" | "neutral" | "not_recommend" | "strongly_not_recommend", "reasoning": string, "nextSteps": string[] }
}

If any information is missing, use your best judgment based on available context, but mention what is missing.
Output strictly JSON.`;

      logger.info('🤖 Sending content to Claude for analysis...', 'ai-analysis');

      const response = await getAnthropicClient().messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: extractedContent
          }
        ]
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info('✅ Pitch Deck Analysis successfully parsed', 'ai-analysis');

        timer.end();

        // Add default/missing fields to match AnalysisResult interface
        return {
          companyOverview: "Pitch Deck Analysis",
          teamAnalysis: parsed.teamAnalysis || { score: 0, strengths: [], weaknesses: [], summary: "Not analyzed" },
          productAnalysis: parsed.productAnalysis || { score: 0, marketPotential: "", competitiveAdvantage: "", summary: "Not analyzed" },
          marketAnalysis: parsed.marketAnalysis || { score: 0, marketSize: "", competition: "", trends: "", summary: "Not analyzed" },
          financialAnalysis: parsed.financialAnalysis || { score: 0, capitalStructure: "", growthPotential: "", summary: "Not analyzed" },
          riskAnalysis: parsed.riskAnalysis || { score: 5, mainRisks: [], mitigationStrategies: [], summary: "Not analyzed" },
          formAnalysis: { // Default form analysis
            score: 0,
            completedForms: [],
            keyInsights: [],
            documentsQuality: "Pitch Deck Provided",
            missingInfo: [],
            summary: "Pitch Deck Review"
          },
          overallRecommendation: parsed.overallRecommendation || { score: 0, recommendation: "neutral", reasoning: "", nextSteps: [] }
        };
      } else {
        throw new Error('Failed to parse JSON response from Claude');
      }

    } catch (error: any) {
      logger.error('❌ Error in Pitch Deck Analysis', 'ai-analysis', error);
      timer.end(false, { error: error.message });
      throw new Error(`Pitch Deck Analysis Failed: ${error.message}`);
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();
