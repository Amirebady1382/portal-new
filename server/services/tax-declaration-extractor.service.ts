/**
 * Tax Declaration Extractor Service
 * 
 * استخراج خودکار داده‌های مالی از اظهارنامه مالیاتی PDF
 * با استفاده از Claude Document API
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { gapGPTService } from './gap-gpt.service';
import PDFParser from 'pdf2json';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// Helper to get Anthropic client
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Type definitions
export interface YearlyValue {
  year1: number;
  year2: number;
}

export interface DirectItems {
  revenue: YearlyValue;
  grossProfit: YearlyValue;
  ebit: YearlyValue;
  netProfit: YearlyValue;
  totalAssets: YearlyValue;
  totalLiabilities: YearlyValue;
  equity: YearlyValue;
  financialExpenses: YearlyValue;
}

export interface KeyRatios {
  currentRatio: YearlyValue;
  debtToEquity: YearlyValue;
  equityRatio: YearlyValue;
  netProfitMargin: YearlyValue;
  roe: YearlyValue;
  interestCoverage: YearlyValue;
  revenueGrowth: number;
  netProfitGrowth: number;
}

export interface RiskIndicators {
  altmanZScore: YearlyValue;
  dfl: YearlyValue;
  cashConversionCycle: YearlyValue;
  netDebtToEbitda: YearlyValue;
}

export interface SupplementaryMetrics {
  cash: YearlyValue;
  currentAssets: YearlyValue;
  currentLiabilities: YearlyValue;
  cogs: YearlyValue;
  depreciation: YearlyValue;
  retainedEarnings: YearlyValue;
  grossMargin: YearlyValue;
  roa: YearlyValue;
  inventoryTurnover: YearlyValue;
  exportRatio: YearlyValue;
  // موارد جدید
  quickRatio: YearlyValue; // نسبت آنی
  assetTurnover: YearlyValue; // گردش دارایی
  workingCapital: YearlyValue; // سرمایه در گردش
}

export interface FinancialSummaryMetadata {
  extractionDate: string;
  companyName: string;
  nationalId: string;
  fiscalYears: [string, string];
  confidence: number;
  warnings: string[];
  sourceFile: string;
}

export interface FinancialSummary {
  directItems: DirectItems;
  keyRatios: KeyRatios;
  riskIndicators: RiskIndicators;
  supplementary: SupplementaryMetrics;
  metadata: FinancialSummaryMetadata;
}

export class TaxDeclarationExtractorService {
  
  /**
   * استخراج اطلاعات مالی کامل از فایل اظهارنامه مالیاتی
   */
  async extractFinancialData(filePath: string, companyName?: string, nationalId?: string): Promise<FinancialSummary> {
    logger.info(`📄 شروع استخراج اطلاعات مالی از: ${path.basename(filePath)}`, 'tax-extractor');
    
    try {
      // خواندن فایل PDF
      const buffer = await fs.readFile(filePath);
      const fileSize = Math.round(buffer.length / 1024);
      
      logger.info(`📊 حجم فایل: ${fileSize}KB`, 'tax-extractor');
      
      // بررسی محدودیت‌ها
      if (fileSize > 32 * 1024) {
        throw new Error(`فایل بیش از حد بزرگ است: ${fileSize}KB (حداکثر: 32MB)`);
      }
      
      let extractedData: any;
      
      try {
        // اول تلاش با Claude (اصلی)
        extractedData = await this.extractWithClaude(buffer, filePath);
      } catch (claudeError: any) {
        logger.warn(`⚠️ خطا در استخراج با Claude: ${claudeError.message}. تلاش با GapGPT...`, 'tax-extractor');
        
        // در صورت خطا، تلاش با GapGPT (پشتیبان)
        try {
          extractedData = await this.extractWithGapGPT(filePath);
        } catch (gapError: any) {
          logger.error(`❌ خطا در استخراج با GapGPT: ${gapError.message}`, 'tax-extractor');
          throw new Error(`استخراج اطلاعات با هر دو هوش مصنوعی شکست خورد: ${claudeError.message} | ${gapError.message}`);
        }
      }
      
      // محاسبه نسبت‌ها و شاخص‌ها
      const financialSummary = this.calculateMetrics(extractedData, companyName, nationalId, filePath);
      
      logger.info(`✅ استخراج موفقیت‌آمیز: ${extractedData.metadata.companyName}`, 'tax-extractor');
      
      return financialSummary;
      
    } catch (error: any) {
      logger.error(`❌ خطا در استخراج: ${error.message}`, 'tax-extractor');
      throw new Error(`خطا در استخراج اطلاعات مالی: ${error.message}`);
    }
  }
  
  /**
   * استخراج داده‌های خام با Claude Document API
   */
  private async extractWithClaude(buffer: Buffer, filePath: string): Promise<any> {
    const base64Data = buffer.toString('base64');
    
    logger.info('🤖 ارسال به Claude Document API...', 'tax-extractor');
    
    const anthropic = getAnthropicClient();
    
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 16000,
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
              text: this.getExtractionPrompt()
            }
          ]
        }
      ]
    });
    
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    if (!content || content.length < 100) {
      throw new Error('پاسخ Claude خیلی کوتاه است یا خالی است');
    }
    
    // استخراج JSON از پاسخ
    return this.parseAIResponse(content);
  }

  /**
   * استخراج داده‌های خام با GapGPT (پشتیبان)
   */
  private async extractWithGapGPT(filePath: string): Promise<any> {
    logger.info('🤖 استخراج متن از PDF برای GapGPT...', 'tax-extractor');
    
    const text = await this.extractTextFromPDF(filePath);
    
    if (!text || text.length < 500) {
      throw new Error('متن استخراج شده از PDF برای تحلیل کافی نیست');
    }
    
    logger.info(`📊 متن استخراج شد (${text.length} کاراکتر). ارسال به GapGPT...`, 'tax-extractor');
    
    const prompt = `${this.getExtractionPrompt()}\n\nمتن استخراج شده از سند:\n\n${text.substring(0, 30000)}`;
    
    const content = await gapGPTService.generateResponse(prompt, "تو یک متخصص مالی هستی که داده‌ها را از اظهارنامه‌های مالیاتی استخراج می‌کنی.");
    
    return this.parseAIResponse(content);
  }

  /**
   * استخراج متن از PDF با استفاده از pdf2json
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
      pdfParser.on("pdfParser_dataReady", () => {
        resolve(pdfParser.getRawTextContent());
      });
      
      pdfParser.loadPDF(filePath);
    });
  }

  /**
   * پارس کردن پاسخ AI و استخراج JSON
   */
  private parseAIResponse(content: string): any {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('فرمت JSON در پاسخ هوش مصنوعی یافت نشد');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('خطا در پارس کردن JSON پاسخ هوش مصنوعی');
    }
  }
  
  /**
   * Prompt تخصصی برای استخراج داده‌های مالی
   */
  private getExtractionPrompt(): string {
    return `این یک اظهارنامه مالیاتی ایرانی است. لطفاً با دقت کامل این سند را تحلیل کن و اطلاعات زیر را استخراج کن:

🎯 **هدف اصلی**: استخراج داده‌های مالی از جدول 11 (ترازنامه) و جدول 12 (صورت سود و زیان)

📋 **اطلاعات مورد نیاز**:

**از جدول 11 (ترازنامه)**:
- جمع کل دارایی‌ها (برای هر دو سال)
- جمع کل بدهی‌ها (برای هر دو سال)
- حقوق صاحبان سهام / حقوق مالکانه (برای هر دو سال)
- دارایی‌های جاری (برای هر دو سال)
- بدهی‌های جاری (برای هر دو سال)
- موجودی نقد (برای هر دو سال)
- موجودی کالا (برای هر دو سال)
- سود انباشته (برای هر دو سال)

**از جدول 12 (صورت سود و زیان)**:
- ردیف 1: فروش / درآمد عملیاتی
- ردیف 2: بهای تمام شده کالای فروش رفته
- ردیف 3: سود ناخالص
- ردیف 8: هزینه استهلاک
- ردیف 11: سود (زیان) عملیاتی (EBIT)
- ردیف 18-20: هزینه‌های مالی (بهره و سود سپرده‌ها)
- ردیف 32: سود (زیان) خالص

**فرمت خروجی**: لطفاً یک JSON کامل و ساختاریافته با این فرمت دقیق بده:

\`\`\`json
{
  "metadata": {
    "companyName": "نام شرکت",
    "nationalId": "شناسه ملی",
    "fiscalYear1": "1401",
    "fiscalYear2": "1402",
    "documentType": "اظهارنامه مالیاتی"
  },
  "table11_balanceSheet": {
    "totalAssets": {
      "year1": عدد,
      "year2": عدد
    },
    "totalLiabilities": {
      "year1": عدد,
      "year2": عدد
    },
    "equity": {
      "year1": عدد,
      "year2": عدد
    },
    "currentAssets": {
      "year1": عدد,
      "year2": عدد
    },
    "currentLiabilities": {
      "year1": عدد,
      "year2": عدد
    },
    "cash": {
      "year1": عدد,
      "year2": عدد
    },
    "inventory": {
      "year1": عدد,
      "year2": عدد
    },
    "retainedEarnings": {
      "year1": عدد,
      "year2": عدد
    }
  },
  "table12_incomeStatement": {
    "revenue": {
      "year1": عدد,
      "year2": عدد
    },
    "cogs": {
      "year1": عدد,
      "year2": عدد
    },
    "grossProfit": {
      "year1": عدد,
      "year2": عدد
    },
    "depreciation": {
      "year1": عدد,
      "year2": عدد
    },
    "ebit": {
      "year1": عدد,
      "year2": عدد
    },
    "financialExpenses": {
      "year1": عدد,
      "year2": عدد
    },
    "netProfit": {
      "year1": عدد,
      "year2": عدد
    }
  },
  "extractionNotes": [
    "توضیحات درباره کیفیت استخراج",
    "هر گونه مشکل یا ابهام در داده‌ها"
  ]
}
\`\`\`

⚠️ **نکات مهم**:
1. اعداد را دقیقاً همانطور که در سند هستند استخراج کن (بدون تغییر)
2. اگر عددی منفی است، حتماً علامت منفی را حفظ کن
3. اگر ردیفی خالی یا صفر است، عدد 0 بگذار
4. year1 = سال قبل، year2 = سال جاری
5. فقط JSON را برگردان، بدون توضیحات اضافه
6. اگر جداول با شماره دیگری هستند (مثل جدول 14 و 16)، همان را استخراج کن

بیا شروع کنیم!`;
  }
  
  /**
   * محاسبه نسبت‌ها و شاخص‌های مالی
   */
  private calculateMetrics(extractedData: any, companyName?: string, nationalId?: string, sourceFile?: string): FinancialSummary {
    const balance = extractedData.table11_balanceSheet;
    const income = extractedData.table12_incomeStatement;
    const metadata = extractedData.metadata;
    
    const warnings: string[] = [];
    
    // محاسبه نسبت جاری
    const currentRatio = {
      year1: this.safeDiv(balance.currentAssets.year1, balance.currentLiabilities.year1),
      year2: this.safeDiv(balance.currentAssets.year2, balance.currentLiabilities.year2)
    };
    
    // محاسبه D/E Ratio
    const debtToEquity = {
      year1: this.safeDiv(balance.totalLiabilities.year1, balance.equity.year1),
      year2: this.safeDiv(balance.totalLiabilities.year2, balance.equity.year2)
    };
    
    // نسبت مالکانه
    const equityRatio = {
      year1: this.safeDiv(balance.equity.year1, balance.totalAssets.year1) * 100,
      year2: this.safeDiv(balance.equity.year2, balance.totalAssets.year2) * 100
    };
    
    // حاشیه سود خالص
    const netProfitMargin = {
      year1: this.safeDiv(income.netProfit.year1, income.revenue.year1) * 100,
      year2: this.safeDiv(income.netProfit.year2, income.revenue.year2) * 100
    };
    
    // ROE
    const roe = {
      year1: this.safeDiv(income.netProfit.year1, balance.equity.year1) * 100,
      year2: this.safeDiv(income.netProfit.year2, balance.equity.year2) * 100
    };
    
    // نسبت پوشش بهره
    const interestCoverage = {
      year1: this.safeDiv(income.ebit.year1, income.financialExpenses.year1),
      year2: this.safeDiv(income.ebit.year2, income.financialExpenses.year2)
    };
    
    // رشد فروش
    const revenueGrowth = this.safeGrowth(income.revenue.year1, income.revenue.year2);
    
    // رشد سود خالص
    const netProfitGrowth = this.safeGrowth(income.netProfit.year1, income.netProfit.year2);
    
    // ROA
    const roa = {
      year1: this.safeDiv(income.netProfit.year1, balance.totalAssets.year1) * 100,
      year2: this.safeDiv(income.netProfit.year2, balance.totalAssets.year2) * 100
    };
    
    // حاشیه سود ناخالص
    const grossMargin = {
      year1: this.safeDiv(income.grossProfit.year1, income.revenue.year1) * 100,
      year2: this.safeDiv(income.grossProfit.year2, income.revenue.year2) * 100
    };
    
    // گردش موجودی کالا
    const inventoryTurnover = {
      year1: this.safeDiv(income.cogs.year1, balance.inventory?.year1 || 0),
      year2: this.safeDiv(income.cogs.year2, balance.inventory?.year2 || 0)
    };
    
    // نسبت آنی (Quick Ratio) = (دارایی جاری - موجودی کالا) ÷ بدهی جاری
    const quickRatio = {
      year1: this.safeDiv(
        balance.currentAssets.year1 - (balance.inventory?.year1 || 0),
        balance.currentLiabilities.year1
      ),
      year2: this.safeDiv(
        balance.currentAssets.year2 - (balance.inventory?.year2 || 0),
        balance.currentLiabilities.year2
      )
    };
    
    // گردش دارایی (Asset Turnover) = فروش ÷ کل دارایی
    const assetTurnover = {
      year1: this.safeDiv(income.revenue.year1, balance.totalAssets.year1),
      year2: this.safeDiv(income.revenue.year2, balance.totalAssets.year2)
    };
    
    // سرمایه در گردش (Working Capital) = دارایی جاری - بدهی جاری
    const workingCapital = {
      year1: balance.currentAssets.year1 - balance.currentLiabilities.year1,
      year2: balance.currentAssets.year2 - balance.currentLiabilities.year2
    };
    
    // امتیاز آلتمن (Z-Score) - فرمول ساده شده
    const altmanZScore = {
      year1: this.calculateAltmanZScore(balance, income, 'year1'),
      year2: this.calculateAltmanZScore(balance, income, 'year2')
    };
    
    // درجه اهرم مالی (DFL)
    const dfl = {
      year1: this.safeDiv(income.ebit.year1, income.ebit.year1 - income.financialExpenses.year1),
      year2: this.safeDiv(income.ebit.year2, income.ebit.year2 - income.financialExpenses.year2)
    };
    
    // چرخه تبدیل نقدی (simplified - needs more data for full calculation)
    const cashConversionCycle = {
      year1: 0, // نیاز به اطلاعات بیشتر
      year2: 0
    };
    
    // نسبت بدهی خالص به EBITDA
    const ebitda1 = income.ebit.year1 + (income.depreciation?.year1 || 0);
    const ebitda2 = income.ebit.year2 + (income.depreciation?.year2 || 0);
    const netDebt1 = balance.totalLiabilities.year1 - (balance.cash?.year1 || 0);
    const netDebt2 = balance.totalLiabilities.year2 - (balance.cash?.year2 || 0);
    
    const netDebtToEbitda = {
      year1: this.safeDiv(netDebt1, ebitda1),
      year2: this.safeDiv(netDebt2, ebitda2)
    };
    
    // بررسی تعادل ترازنامه
    const balanceCheck1 = Math.abs(balance.totalAssets.year1 - (balance.totalLiabilities.year1 + balance.equity.year1));
    const balanceCheck2 = Math.abs(balance.totalAssets.year2 - (balance.totalLiabilities.year2 + balance.equity.year2));
    
    if (balanceCheck1 > 1000) {
      warnings.push(`ترازنامه سال ${metadata.fiscalYear1} متوازن نیست (اختلاف: ${balanceCheck1.toLocaleString()})`);
    }
    if (balanceCheck2 > 1000) {
      warnings.push(`ترازنامه سال ${metadata.fiscalYear2} متوازن نیست (اختلاف: ${balanceCheck2.toLocaleString()})`);
    }
    
    // ساخت نتیجه نهایی
    const result: FinancialSummary = {
      directItems: {
        revenue: income.revenue,
        grossProfit: income.grossProfit,
        ebit: income.ebit,
        netProfit: income.netProfit,
        totalAssets: balance.totalAssets,
        totalLiabilities: balance.totalLiabilities,
        equity: balance.equity,
        financialExpenses: income.financialExpenses
      },
      keyRatios: {
        currentRatio,
        debtToEquity,
        equityRatio,
        netProfitMargin,
        roe,
        interestCoverage,
        revenueGrowth,
        netProfitGrowth
      },
      riskIndicators: {
        altmanZScore,
        dfl,
        cashConversionCycle,
        netDebtToEbitda
      },
      supplementary: {
        cash: balance.cash || { year1: 0, year2: 0 },
        currentAssets: balance.currentAssets,
        currentLiabilities: balance.currentLiabilities,
        cogs: income.cogs,
        depreciation: income.depreciation || { year1: 0, year2: 0 },
        retainedEarnings: balance.retainedEarnings || { year1: 0, year2: 0 },
        grossMargin,
        roa,
        inventoryTurnover,
        exportRatio: { year1: 0, year2: 0 }, // نیاز به داده اضافی
        quickRatio,
        assetTurnover,
        workingCapital
      },
      metadata: {
        extractionDate: new Date().toISOString(),
        companyName: companyName || metadata.companyName || 'نامشخص',
        nationalId: nationalId || metadata.nationalId || '',
        fiscalYears: [metadata.fiscalYear1 || '1401', metadata.fiscalYear2 || '1402'],
        confidence: this.calculateConfidence(extractedData, warnings),
        warnings: [...warnings, ...(extractedData.extractionNotes || [])],
        sourceFile: sourceFile ? path.basename(sourceFile) : ''
      }
    };
    
    return result;
  }
  
  /**
   * محاسبه امتیاز آلتمن (Altman Z-Score)
   * فرمول: Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
   */
  private calculateAltmanZScore(balance: any, income: any, year: 'year1' | 'year2'): number {
    const workingCapital = balance.currentAssets[year] - balance.currentLiabilities[year];
    const totalAssets = balance.totalAssets[year];
    const retainedEarnings = balance.retainedEarnings?.[year] || 0;
    const ebit = income.ebit[year];
    const equity = balance.equity[year];
    const totalLiabilities = balance.totalLiabilities[year];
    const revenue = income.revenue[year];
    
    if (totalAssets === 0) return 0;
    
    const x1 = workingCapital / totalAssets;
    const x2 = retainedEarnings / totalAssets;
    const x3 = ebit / totalAssets;
    const x4 = equity / totalLiabilities || 0;
    const x5 = revenue / totalAssets;
    
    const zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
    
    return Number(zScore.toFixed(2));
  }
  
  /**
   * محاسبه درصد رشد
   */
  private safeGrowth(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return Number((((newValue - oldValue) / Math.abs(oldValue)) * 100).toFixed(2));
  }
  
  /**
   * تقسیم ایمن (جلوگیری از تقسیم بر صفر)
   */
  private safeDiv(numerator: number, denominator: number): number {
    if (denominator === 0 || !isFinite(denominator)) return 0;
    const result = numerator / denominator;
    if (!isFinite(result)) return 0;
    return Number(result.toFixed(4));
  }
  
  /**
   * محاسبه اعتماد به استخراج
   */
  private calculateConfidence(data: any, warnings: string[]): number {
    let confidence = 100;
    
    // کاهش اعتماد برای هر هشدار
    confidence -= warnings.length * 5;
    
    // بررسی صفر بودن داده‌های کلیدی
    if (data.table12_incomeStatement.revenue.year2 === 0) confidence -= 20;
    if (data.table11_balanceSheet.totalAssets.year2 === 0) confidence -= 20;
    
    return Math.max(0, Math.min(100, confidence));
  }
}

export const taxDeclarationExtractorService = new TaxDeclarationExtractorService();

