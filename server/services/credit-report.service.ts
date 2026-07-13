import { aiOrchestrator } from './ai-orchestrator.service';
import { logger } from '../utils/logger';
import { CompanyCreditReport } from '../../shared/report-model';

export class CreditReportService {
  /**
   * تولید گزارش اعتباری با استفاده از هوش مصنوعی
   */
  async generateCreditReport(companyData: any, financialData: any): Promise<CompanyCreditReport> {
    const prompt = `
      لطفاً بر اساس اطلاعات زیر، یک گزارش اعتباری کامل در قالب JSON تولید کنید.
      
      اطلاعات شرکت:
      ${JSON.stringify(companyData, null, 2)}
      
      اطلاعات مالی و درخواست:
      ${JSON.stringify(financialData, null, 2)}
      
      خروجی باید دقیقاً با ساختار interface زیر مطابقت داشته باشد:

      interface FinancialRatios {
        cashRatio: number;
        quickRatio: number;
        roe: number;
        debtRatio: number;
        assetTurnover: number;
        netProfitMargin: number;
        currentRatio: number;
        proprietaryRatio: number;
        debtToEquityRatio: number;
        salesGrowth: number;
      }

      interface CreditScoringCoefficients {
        behavioral: number;
        operational: number;
        market: number;
        profitability: number;
        repaymentCapacity: number;
        collateralCheck: number;
        collateralProperty: number;
        legalGuarantor: number;
        nonDefaultProbability: number;
      }

      interface CreditLimits {
        checkAndNote: number;
        propertyCollateral: number;
        legalGuarantor: number;
      }

      interface CompanyCreditReport {
        companyInfo: {
          name: string;
          nationalId: string;
          type: string;
          legalStatus: string;
          registrationPlace: string;
          establishedDate: string;
          knowledgeBasedDate?: string;
          currentCapital: number;
        };
        requestInfo: {
          productName: string;
          requestType: string;
          requestedAmount: number;
          planTitle: string;
        };
        personnelInfo: {
          currentCount: number;
          employmentCreation: number;
        };
        financialRatios: FinancialRatios;
        scoringCoefficients: CreditScoringCoefficients;
        creditLimits: CreditLimits;
        previousServices: {
          proposedAmount: number;
          totalReceived: number;
          arrears: number;
          bankFacilities: number;
          currentGuarantees: number;
          currentFacilities: number;
        };
        article141Compliance: boolean;
        expertOpinion?: string;
      }

      توجه: مقادیری که در ورودی موجود نیستند را بر اساس منطق تحلیلگری خود تخمین بزنید یا مقادیر منطقی قرار دهید.
      تمامی فیلدها باید پر شوند.
    `;

    const systemPrompt = "You are a senior credit analyst. Your response must be ONLY a valid JSON object strictly matching the provided CompanyCreditReport interface definition. Do not include any markdown or text outside the JSON.";

    try {
      const responseText = await aiOrchestrator.execute(prompt, {
        systemPrompt,
        temperature: 0.1,
        timeout: 60000
      });

      // استخراج JSON از پاسخ
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON structure not found in AI response');
      }

      return JSON.parse(jsonMatch[0]) as CompanyCreditReport;
    } catch (error) {
      logger.error('Error generating credit report via AI', 'credit-report-service', error as Error);
      throw error;
    }
  }
}

export const creditReportService = new CreditReportService();
