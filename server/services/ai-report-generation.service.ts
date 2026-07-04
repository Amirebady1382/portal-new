import Anthropic from '@anthropic-ai/sdk';
import { perplexityResearchService } from './perplexity-research.service';
import { gapGPTService } from './gap-gpt.service';
import { aiOrchestrator } from './ai-orchestrator.service';
import { storage } from '../storage';

interface ReportGenerationOptions {
  companyId: number;
  serviceId?: number; // اضافه شده: برای تمرکز تحلیل بر خدمت خاص
  templateId?: number;
  customText?: string; // برای حالت بدون قالب
  usePerplexity?: boolean;
  perplexityOptions?: {
    researchCompany?: boolean;
    researchIndustry?: boolean;
    customQueries?: string[];
  };
  includeAnalysis?: boolean;
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
}

interface GeneratedReport {
  content: string; // HTML content
  metadata: {
    companyName: string;
    generatedAt: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    dataSources: string[];
  };
  perplexityResearch?: any;
  aiAnalysis?: any;
}

export class AIReportGenerationService {
  private anthropic: Anthropic | null = null;

  constructor() {
    // Lazy initialization - will be created when needed
  }

  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(options: ReportGenerationOptions): Promise<GeneratedReport> {
    const startTime = Date.now();
    console.log(`📊 Starting comprehensive report generation...`);

    // 1. دریافت اطلاعات شرکت
    const company = await storage.getCompany(options.companyId);
    if (!company) {
      throw new Error('شرکت یافت نشد');
    }

    console.log(`🏢 Company: ${company.name}`);

    // 1.5. دریافت اطلاعات خدمت (اگر ارائه شده باشد)
    let serviceContext: any = null;
    if (options.serviceId) {
      try {
        const { servicesService } = await import('./services.service');
        const service = await servicesService.getService(options.serviceId);

        if (service) {
          console.log(`🎯 تمرکز گزارش بر خدمت: ${service.title}`);

          // دریافت فرم‌های مربوط به خدمت
          const serviceForms = await servicesService.getServiceForms(options.serviceId);

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

          console.log(`📋 فرم‌های مرتبط با خدمت: ${serviceForms.length}`);
        }
      } catch (error) {
        console.warn(`⚠️ خطا در دریافت اطلاعات خدمت ${options.serviceId}:`, error);
      }
    }

    // 1.6. استخراج خلاصه مالی (اگر موجود باشد)
    let financialContext: any = null;
    if (company.financialSummaryData) {
      try {
        console.log(`💰 استخراج خلاصه مالی شرکت...`);
        const financialData = typeof company.financialSummaryData === 'string'
          ? JSON.parse(company.financialSummaryData)
          : company.financialSummaryData;

        if (financialData && financialData.metadata) {
          financialContext = {
            hasData: true,
            fiscalYears: financialData.metadata.fiscalYears || [],
            confidence: financialData.metadata.confidence || 0,
            extractionDate: financialData.metadata.extractionDate,
            directItems: {
              revenue: financialData.directItems?.revenue,
              netProfit: financialData.directItems?.netProfit,
              ebit: financialData.directItems?.ebit,
              totalAssets: financialData.directItems?.totalAssets,
              totalLiabilities: financialData.directItems?.totalLiabilities,
              equity: financialData.directItems?.equity
            },
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
            riskIndicators: {
              altmanZScore: financialData.riskIndicators?.altmanZScore,
              dfl: financialData.riskIndicators?.dfl,
              netDebtToEbitda: financialData.riskIndicators?.netDebtToEbitda,
              confidenceScore: financialData.riskIndicators?.confidenceScore
            }
          };

          console.log(`✅ خلاصه مالی استخراج شد - سال‌های ${financialContext.fiscalYears.join('، ')}`);
        }
      } catch (error) {
        console.warn(`⚠️ خطا در پردازش خلاصه مالی:`, error);
      }
    } else {
      console.log(`ℹ️ خلاصه مالی برای این شرکت موجود نیست`);
    }

    const dataSources: string[] = ['اطلاعات پایه شرکت'];
    if (financialContext) {
      dataSources.push('خلاصه مالی (اظهارنامه مالیاتی)');
    }

    // 2. دریافت فرم‌های تکمیل شده
    const formSubmissions = await storage.getFormSubmissions({ companyId: options.companyId });
    console.log(`📋 Form submissions: ${formSubmissions.length}`);
    if (formSubmissions.length > 0) {
      dataSources.push('فرم‌های تکمیل شده');
    }

    // 3. دریافت اسناد
    let documents = await storage.getDocumentsByCompany(options.companyId);
    console.log(`📄 Documents: ${documents.length}`);

    // 3.5. استخراج فایل‌های موجود در فرم‌ها و اضافه کردن به لیست اسناد
    if (formSubmissions.length > 0) {
      console.log(`🔍 بررسی فرم‌ها برای یافتن فایل‌های اضافی...`);

      for (const form of formSubmissions) {
        if (form.formData) {
          try {
            const formData = typeof form.formData === 'string' ? JSON.parse(form.formData) : form.formData;

            for (const [key, value] of Object.entries(formData)) {
              if (value && typeof value === 'object' && (value as any).fileName) {
                const fileInfo = value as { filePath?: string; fileName: string; fileId?: number };

                if (fileInfo.fileId && !fileInfo.filePath) {
                  const document = await storage.getDocument(fileInfo.fileId);
                  if (document) {
                    let actualFilePath = document.filePath;
                    if (!actualFilePath && (document as any).filename) {
                      actualFilePath = `uploads/${(document as any).filename}`;
                    }

                    if (actualFilePath) {
                      documents.push({
                        ...document,
                        filePath: actualFilePath,
                        category: key,
                        description: `فایل ضمیمه فرم: ${key}`
                      } as any);
                      console.log(`   📎 فایل فرم اضافه شد: ${document.originalName}`);
                    }
                  }
                } else if (fileInfo.filePath) {
                  documents.push({
                    id: 0,
                    originalName: fileInfo.fileName,
                    filePath: fileInfo.filePath,
                    mimeType: fileInfo.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'unknown',
                    category: key,
                    description: `فایل ضمیمه فرم: ${key}`
                  } as any);
                }
              }
            }
          } catch (error) {
            console.error('خطا در استخراج فایل‌های فرم:', error);
          }
        }
      }
    }

    console.log(`📊 تعداد کل اسناد (شامل فایل‌های فرم): ${documents.length}`);
    if (documents.length > 0) {
      dataSources.push('اسناد و مدارک');
    }

    // 4. دریافت تحلیل AI موجود (اگر وجود داشته باشد)
    let aiAnalysis: any = null;
    try {
      // فعلاً تحلیل AI را از جای دیگری نمی‌خوانیم - می‌توان بعداً اضافه کرد
      // const analysisData = await storage.getAIAnalysis(options.companyId);
      console.log(`ℹ️ Skipping AI analysis lookup (can be added later)`);
    } catch (error) {
      console.log(`ℹ️ No previous AI analysis found`);
    }

    // 5. تحقیق با Perplexity (اگر فعال باشد)
    let perplexityResearch: any = null;
    if (options.usePerplexity && perplexityResearchService.isConfigured()) {
      try {
        console.log(`🔍 Conducting Perplexity research...`);

        const researchResults: any = {};

        // تحقیق درباره شرکت
        if (options.perplexityOptions?.researchCompany !== false) {
          try {
            const companyResearch = await perplexityResearchService.researchCompany({
              name: company.name,
              nationalId: company.nationalId,
              industry: aiAnalysis?.productAnalysis?.industry || undefined
            });
            researchResults.company = companyResearch;
            console.log(`✅ Company research completed`);
          } catch (error) {
            console.error(`❌ Company research failed:`, error);
          }
        }

        // تحقیق درباره صنعت
        if (options.perplexityOptions?.researchIndustry && aiAnalysis?.productAnalysis?.industry) {
          try {
            const industryResearch = await perplexityResearchService.researchIndustry(
              aiAnalysis.productAnalysis.industry
            );
            researchResults.industry = industryResearch;
            console.log(`✅ Industry research completed`);
          } catch (error) {
            console.error(`❌ Industry research failed:`, error);
          }
        }

        // پرس و جوهای سفارشی
        if (options.perplexityOptions?.customQueries && options.perplexityOptions.customQueries.length > 0) {
          researchResults.custom = [];
          for (const query of options.perplexityOptions.customQueries) {
            try {
              const result = await perplexityResearchService.research(query);
              researchResults.custom.push({ query, result });
              console.log(`✅ Custom query research completed: ${query.substring(0, 50)}...`);
            } catch (error) {
              console.error(`❌ Custom query failed:`, error);
            }
          }
        }

        perplexityResearch = researchResults;
        dataSources.push('تحقیق Perplexity');
      } catch (error) {
        console.error('❌ Perplexity research error:', error);
      }
    }

    // 6. تولید گزارش با Claude
    console.log(`🤖 Generating report with Claude 4 Sonnet...`);
    const reportContent = await this.generateReportWithClaude(
      company,
      formSubmissions,
      documents,
      aiAnalysis,
      perplexityResearch,
      options,
      serviceContext,
      financialContext
    );

    const processingTime = Date.now() - startTime;

    return {
      content: reportContent.html,
      metadata: {
        companyName: company.name,
        generatedAt: new Date().toISOString(),
        model: 'claude-4-sonnet-20250514',
        tokensUsed: reportContent.tokensUsed,
        processingTime,
        dataSources
      },
      perplexityResearch,
      aiAnalysis
    };
  }

  /**
   * Generate report using Claude 4 Sonnet
   */
  private async generateReportWithClaude(
    company: any,
    formSubmissions: any[],
    documents: any[],
    aiAnalysis: any,
    perplexityResearch: any,
    options: ReportGenerationOptions,
    serviceContext?: any,
    financialContext?: any
  ): Promise<{ html: string; tokensUsed: number }> {

    // ساخت پرامپت جامع
    let prompt = '';

    if (options.customText) {
      // حالت بدون قالب - کاربر متن دلخواه داده
      prompt = `${options.customText}\n\n`;
      prompt += `لطفاً این گزارش را با استفاده از اطلاعات زیر کامل کنید:\n\n`;
    } else {
      // حالت با قالب استاندارد
      prompt = `گزارش ارزیابی جامع برای شرکت "${company.name}" را تهیه کنید.\n\n`;
    }

    // اضافه کردن اطلاعات خدمت (اگر وجود داشته باشد)
    if (serviceContext) {
      prompt += `## 🎯 خدمت مورد تمرکز گزارش:\n`;
      prompt += `- عنوان خدمت: ${serviceContext.title}\n`;
      if (serviceContext.description) {
        prompt += `- توضیحات: ${serviceContext.description}\n`;
      }
      if (serviceContext.category) {
        prompt += `- دسته‌بندی: ${serviceContext.category}\n`;
      }
      if (serviceContext.estimatedDays) {
        prompt += `- زمان تخمینی انجام: ${serviceContext.estimatedDays} روز\n`;
      }

      // فرم‌های مرتبط با خدمت
      if (serviceContext.forms && serviceContext.forms.length > 0) {
        prompt += `\n### 📋 فرم‌های مرتبط با این خدمت (${serviceContext.forms.length} فرم):\n`;
        serviceContext.forms.forEach((form: any, index: number) => {
          prompt += `${index + 1}. ${form.formTitle}`;
          if (form.isRequired) prompt += ` (الزامی)`;
          prompt += `\n`;
          if (form.formDescription) {
            prompt += `   توضیحات: ${form.formDescription}\n`;
          }
        });
      }

      prompt += `\n⚠️ توجه: این گزارش باید بر روی خدمت "${serviceContext.title}" متمرکز باشد.\n`;
      prompt += `- آمادگی و مناسب بودن شرکت برای استفاده از این خدمت را بررسی کنید\n`;
      prompt += `- فرم‌های مربوط به این خدمت را با دقت بیشتری تحلیل کنید\n`;
      prompt += `- توصیه‌های خود را برای بهبود استفاده از این خدمت ارائه دهید\n\n`;
    }

    // اضافه کردن خلاصه مالی (اگر موجود باشد)
    if (financialContext && financialContext.hasData) {
      const fc = financialContext;
      prompt += `## 💰 خلاصه مالی شرکت (از اظهارنامه مالیاتی رسمی):\n\n`;
      prompt += `**سال‌های مالی:** ${fc.fiscalYears.join(' و ')}\n`;
      prompt += `**اعتبار داده‌ها:** ${fc.confidence}% | **تاریخ استخراج:** ${new Date(fc.extractionDate).toLocaleDateString('fa-IR')}\n\n`;

      // اقلام مالی مستقیم
      if (fc.directItems) {
        prompt += `### 📊 اقلام مالی اصلی:\n\n`;

        if (fc.directItems.revenue) {
          const rev = fc.directItems.revenue;
          prompt += `**فروش/درآمد:**\n`;
          prompt += `- سال ${fc.fiscalYears[0]}: ${rev.year1?.toLocaleString('fa-IR')} ریال\n`;
          if (rev.year2) {
            prompt += `- سال ${fc.fiscalYears[1]}: ${rev.year2.toLocaleString('fa-IR')} ریال\n`;
            if (rev.growth) {
              const growthIcon = rev.growth > 0 ? '📈' : '📉';
              prompt += `- ${growthIcon} **رشد 2 ساله: ${rev.growth > 0 ? '+' : ''}${rev.growth.toFixed(1)}%**\n`;
            }
          }
          prompt += `\n`;
        }

        if (fc.directItems.netProfit) {
          const profit = fc.directItems.netProfit;
          prompt += `**سود خالص:**\n`;
          prompt += `- سال ${fc.fiscalYears[0]}: ${profit.year1?.toLocaleString('fa-IR')} ریال\n`;
          if (profit.year2) {
            prompt += `- سال ${fc.fiscalYears[1]}: ${profit.year2.toLocaleString('fa-IR')} ریال\n`;
            if (profit.growth) {
              const growthIcon = profit.growth > 0 ? '📈' : '📉';
              prompt += `- ${growthIcon} **رشد 2 ساله: ${profit.growth > 0 ? '+' : ''}${profit.growth.toFixed(1)}%**\n`;
            }
          }
          prompt += `\n`;
        }

        if (fc.directItems.totalAssets && fc.directItems.totalAssets.year2) {
          prompt += `**کل دارایی‌ها (${fc.fiscalYears[1]}):** ${fc.directItems.totalAssets.year2.toLocaleString('fa-IR')} ریال\n`;
        }
        if (fc.directItems.equity && fc.directItems.equity.year2) {
          prompt += `**حقوق صاحبان سهام (${fc.fiscalYears[1]}):** ${fc.directItems.equity.year2.toLocaleString('fa-IR')} ریال\n\n`;
        }
      }

      // نسبت‌های کلیدی
      if (fc.keyRatios) {
        prompt += `### 📈 نسبت‌های مالی کلیدی:\n\n`;
        prompt += `| نسبت | سال ${fc.fiscalYears[0]} | سال ${fc.fiscalYears[1]} | وضعیت |\n`;
        prompt += `|------|----------|----------|--------|\n`;

        if (fc.keyRatios.currentRatio) {
          const ratio = fc.keyRatios.currentRatio;
          const status = ratio.year2 >= 1.5 ? '✅ خوب' : ratio.year2 >= 1 ? '⚠️ متوسط' : '❌ ضعیف';
          prompt += `| نسبت جاری | ${ratio.year1?.toFixed(2)} | ${ratio.year2?.toFixed(2)} | ${status} |\n`;
        }
        if (fc.keyRatios.debtToEquity) {
          const ratio = fc.keyRatios.debtToEquity;
          const status = ratio.year2 < 1 ? '✅ خوب' : ratio.year2 < 2 ? '⚠️ متوسط' : '❌ بالا';
          prompt += `| بدهی به حقوق (D/E) | ${ratio.year1?.toFixed(3)} | ${ratio.year2?.toFixed(3)} | ${status} |\n`;
        }
        if (fc.keyRatios.roe) {
          const ratio = fc.keyRatios.roe;
          const status = ratio.year2 >= 15 ? '✅ عالی' : ratio.year2 >= 10 ? '⚠️ قابل قبول' : '❌ ضعیف';
          prompt += `| بازده حقوق (ROE) | ${ratio.year1?.toFixed(1)}% | ${ratio.year2?.toFixed(1)}% | ${status} |\n`;
        }
        if (fc.keyRatios.netProfitMargin) {
          const ratio = fc.keyRatios.netProfitMargin;
          const status = ratio.year2 >= 10 ? '✅ عالی' : ratio.year2 >= 5 ? '⚠️ متوسط' : '❌ کم';
          prompt += `| حاشیه سود خالص | ${ratio.year1?.toFixed(1)}% | ${ratio.year2?.toFixed(1)}% | ${status} |\n`;
        }
        prompt += `\n`;
      }

      // شاخص‌های ریسک
      if (fc.riskIndicators) {
        prompt += `### ⚠️ ارزیابی ریسک مالی:\n\n`;

        if (fc.riskIndicators.altmanZScore) {
          const zScore = fc.riskIndicators.altmanZScore;
          let zStatus = '';
          let zIcon = '';
          if (zScore.year2 > 2.6) {
            zStatus = 'منطقه امن - ریسک ورشکستگی پایین';
            zIcon = '✅';
          } else if (zScore.year2 > 1.8) {
            zStatus = 'منطقه هشدار - نیاز به مراقبت';
            zIcon = '⚠️';
          } else {
            zStatus = 'منطقه خطر - ریسک ورشکستگی بالا';
            zIcon = '❌';
          }
          prompt += `**${zIcon} امتیاز آلتمن (Z-Score):** ${zScore.year2?.toFixed(2)} - ${zStatus}\n`;
        }

        if (fc.riskIndicators.dfl) {
          const dfl = fc.riskIndicators.dfl;
          let dflStatus = '';
          if (dfl.year2 < 1) dflStatus = '✅ ریسک مالی کم';
          else if (dfl.year2 < 2) dflStatus = '⚠️ ریسک مالی متوسط';
          else dflStatus = '❌ ریسک مالی بالا';
          prompt += `**درجه اهرم مالی (DFL):** ${dfl.year2?.toFixed(4)} - ${dflStatus}\n`;
        }

        if (fc.riskIndicators.confidenceScore !== undefined) {
          const confidence = fc.riskIndicators.confidenceScore;
          const confIcon = confidence >= 80 ? '✅' : confidence >= 60 ? '⚠️' : '❌';
          prompt += `**${confIcon} اعتبار داده‌های مالی:** ${confidence.toFixed(0)}%\n`;
        }
        prompt += `\n`;
      }

      prompt += `---\n\n`;
      prompt += `**⚠️ نکات مهم برای استفاده از داده‌های مالی:**\n`;
      prompt += `1. این اطلاعات از اظهارنامه مالیاتی رسمی شرکت استخراج شده و قابل اعتماد است\n`;
      prompt += `2. در بخش "تحلیل مالی" گزارش، از این داده‌های دقیق استفاده کنید\n`;
      prompt += `3. نسبت‌های مالی را با استانداردهای صنعت مقایسه کنید\n`;
      prompt += `4. شاخص‌های ریسک را در توصیه نهایی خود لحاظ کنید\n`;
      prompt += `5. روند رشد را در ارزیابی پتانسیل سرمایه‌گذاری در نظر بگیرید\n\n`;
    }

    // اضافه کردن اطلاعات شرکت
    prompt += `## اطلاعات پایه شرکت:\n`;
    prompt += `- نام: ${company.name}\n`;
    prompt += `- شناسه ملی: ${company.nationalId}\n`;
    if (company.capital) prompt += `- سرمایه: ${company.capital} ریال\n`;
    if (company.address) prompt += `- آدرس: ${company.address}\n`;
    prompt += `\n`;

    // اضافه کردن فرم‌ها
    if (formSubmissions.length > 0) {
      prompt += `## اطلاعات از فرم‌های تکمیل شده (${formSubmissions.length} فرم):\n`;
      formSubmissions.forEach((form, index) => {
        try {
          const formData = typeof form.formData === 'string'
            ? JSON.parse(form.formData)
            : form.formData;
          prompt += `\nفرم ${index + 1}:\n`;
          Object.entries(formData).forEach(([key, value]) => {
            if (value && typeof value === 'string' && value.trim()) {
              prompt += `- ${key}: ${value}\n`;
            }
          });
        } catch (e) {
          console.error('Error parsing form data:', e);
        }
      });
      prompt += `\n`;
    }

    // اضافه کردن تحلیل AI قبلی
    if (aiAnalysis) {
      prompt += `## تحلیل هوش مصنوعی قبلی:\n`;
      if (aiAnalysis.companyOverview) {
        prompt += `### خلاصه:\n${aiAnalysis.companyOverview}\n\n`;
      }
      if (aiAnalysis.teamAnalysis) {
        prompt += `### تیم (امتیاز: ${aiAnalysis.teamAnalysis.score}/10):\n`;
        prompt += `${aiAnalysis.teamAnalysis.summary}\n\n`;
      }
      if (aiAnalysis.productAnalysis) {
        prompt += `### محصول (امتیاز: ${aiAnalysis.productAnalysis.score}/10):\n`;
        prompt += `${aiAnalysis.productAnalysis.summary}\n\n`;
      }
      if (aiAnalysis.marketAnalysis) {
        prompt += `### بازار (امتیاز: ${aiAnalysis.marketAnalysis.score}/10):\n`;
        prompt += `${aiAnalysis.marketAnalysis.summary}\n\n`;
      }
    }

    // اضافه کردن تحقیق Perplexity
    if (perplexityResearch) {
      prompt += `## اطلاعات تحقیق شده از منابع معتبر (Perplexity):\n`;
      if (perplexityResearch.company) {
        prompt += `### تحقیق درباره شرکت:\n${perplexityResearch.company.content}\n\n`;
        if (perplexityResearch.company.citations?.length > 0) {
          prompt += `منابع: ${perplexityResearch.company.citations.join(', ')}\n\n`;
        }
      }
      if (perplexityResearch.industry) {
        prompt += `### تحقیق درباره صنعت:\n${perplexityResearch.industry.content}\n\n`;
      }
    }

    // اضافه کردن محتوای اسناد و مدارک
    if (documents && documents.length > 0) {
      prompt += `## مدارک و اسناد ارائه شده (${documents.length} سند):\n`;
      console.log(`📄 شروع پردازش ${documents.length} سند برای گزارش...`);

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        prompt += `\n### سند ${i + 1}: ${doc.originalName}\n`;
        prompt += `- نوع: ${doc.mimeType || 'نامشخص'}\n`;
        prompt += `- دسته‌بندی: ${doc.category || 'عمومی'}\n`;
        if (doc.description) {
          prompt += `- توضیحات: ${doc.description}\n`;
        }

        // خواندن محتوای سند
        if (doc.filePath) {
          try {
            console.log(`   پردازش سند ${i + 1}: ${doc.originalName}`);

            // استفاده از همان متد extractFileContent از AIAnalysisService
            const { AIAnalysisService } = await import('./ai-analysis');
            const aiAnalysisService = new AIAnalysisService();
            const documentContent = await aiAnalysisService.extractFileContent(doc.filePath, doc.mimeType);

            if (documentContent && documentContent.content) {
              console.log(`   ✅ محتوای سند استخراج شد (${documentContent.content.length} کاراکتر)`);
              prompt += `\n**محتوای استخراج شده:**\n${documentContent.content}\n`;
            } else {
              console.log(`   ⚠️ محتوای سند قابل استخراج نیست`);
              prompt += `- محتوا: قابل استخراج نیست\n`;
            }
          } catch (error) {
            console.error(`   ❌ خطا در خواندن سند: ${error instanceof Error ? error.message : String(error)}`);
            prompt += `- خطا در خواندن محتوا: ${error instanceof Error ? error.message : 'خطای نامشخص'}\n`;
          }
        }
      }
      prompt += `\n`;
    }

    prompt += `\n\n---\n\n`;
    prompt += `لطفاً یک گزارش ${options.detailLevel === 'comprehensive' ? 'جامع و کامل' : options.detailLevel === 'detailed' ? 'تفصیلی' : 'خلاصه'} تهیه کنید.\n`;

    if (serviceContext) {
      prompt += `\n🎯 تمرکز ویژه بر خدمت "${serviceContext.title}":\n`;
      prompt += `گزارش باید شامل موارد زیر با تاکید بر این خدمت باشد:\n`;
      prompt += `1. معرفی شرکت و ارتباط آن با خدمت ${serviceContext.title}\n`;
      prompt += `2. تحلیل تیم مدیریتی و آمادگی آن‌ها برای استفاده از این خدمت\n`;
      prompt += `3. تحلیل محصول/خدمت در راستای ${serviceContext.title}\n`;
      prompt += `4. تحلیل بازار و رقابت با توجه به این خدمت\n`;
      prompt += `5. تحلیل مالی و قابلیت استفاده از خدمت\n`;
      prompt += `6. ارزیابی ریسک‌ها و چالش‌های استفاده از این خدمت\n`;
      prompt += `7. بررسی فرم‌های تکمیل شده مرتبط با این خدمت\n`;
      prompt += `8. نتیجه‌گیری و توصیه نهایی برای استفاده بهینه از خدمت ${serviceContext.title}\n`;
    } else {
      prompt += `گزارش باید شامل موارد زیر باشد:\n`;
      prompt += `1. معرفی شرکت\n`;
      prompt += `2. تحلیل تیم مدیریتی و کارشناسی\n`;
      prompt += `3. تحلیل محصول/خدمت\n`;
      prompt += `4. تحلیل بازار و رقابت\n`;
      prompt += `5. تحلیل مالی و ساختار سرمایه\n`;
      prompt += `6. ارزیابی ریسک‌ها\n`;
      prompt += `7. نتیجه‌گیری و توصیه نهایی\n`;
    }

    prompt += `\nخروجی را به صورت HTML با فرمت زیبا و حرفه‌ای ارائه دهید.`;

    // فراخوانی Claude API
    const modelName = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    const maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '8000', 10);

    const systemContext = `شما یک تحلیلگر حرفه‌ای سرمایه‌گذاری برای صندوق پژوهش و فناوری گیلان هستید.
      
وظایف شما:
- تحلیل جامع و دقیق شرکت‌ها برای تصمیم‌گیری سرمایه‌گذاری
- استفاده از تمام اطلاعات موجود و منابع معتبر
- ارائه نتیجه‌گیری منطقی و مستدل
- نوشتن گزارش به زبان فارسی رسمی و حرفه‌ای

قوانین مهم:
- فقط از اطلاعات واقعی و مستند استفاده کنید
- اگر اطلاعاتی کافی نیست، صراحتاً اعلام کنید
- منابع و استدلال خود را مشخص کنید
- خروجی باید HTML معتبر و زیبا باشد

فرمت HTML خروجی:
- استفاده از تگ‌های معنادار (h1, h2, h3, p, ul, li, table)
- استفاده از کلاس‌های Tailwind برای استایل
- جداول برای نمایش داده‌های عددی
- Badge ها برای امتیازات`;

    let htmlContent = '';
    
    try {
      htmlContent = await aiOrchestrator.execute(prompt, {
        model: modelName,
        maxTokens: maxTokens,
        temperature: 0.3,
        systemPrompt: systemContext,
        timeout: 90000 // 90 seconds for report generation
      });
    } catch (error) {
      console.error('❌ AI Analysis for report generation failed completely after fallback', error);
      throw error;
    }

    return {
      html: htmlContent,
      tokensUsed: 0 // Orchestrator handles token count internally if needed
    };
  }

  /**
   * Generate simple analysis text (for preview)
   */
  async generateSimpleAnalysis(
    companyId: number,
    customPrompt?: string
  ): Promise<string> {
    const company = await storage.getCompany(companyId);
    if (!company) {
      throw new Error('شرکت یافت نشد');
    }

    const prompt = customPrompt || `یک تحلیل مختصر درباره شرکت ${company.name} ارائه دهید.`;

    return await aiOrchestrator.execute(prompt, {
      model: 'claude-3-7-sonnet-latest',
      maxTokens: 2000,
      temperature: 0.3
    });
  }
}

export const aiReportGenerationService = new AIReportGenerationService();

