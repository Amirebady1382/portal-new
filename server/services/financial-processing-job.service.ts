/**
 * Financial Processing Job Service
 * 
 * مدیریت پردازش خودکار اظهارنامه مالیاتی و تولید خلاصه مالی
 */

import { storage } from '../storage';
import { taxDeclarationExtractorService, FinancialSummary } from './tax-declaration-extractor.service';
import { logger } from '../utils/logger';

export class FinancialProcessingJobService {
  
  /**
   * پردازش اظهارنامه مالیاتی و ذخیره نتایج
   */
  async processTaxDeclaration(companyId: number, documentId: number, filePath: string): Promise<void> {
    logger.info(`🔄 شروع پردازش اظهارنامه مالیاتی برای شرکت ${companyId}`, 'financial-job');
    
    try {
      // بروزرسانی وضعیت به "در حال پردازش"
      await this.updateCompanyStatus(companyId, 'processing', null, documentId);
      
      // دریافت اطلاعات شرکت
      const company = await storage.getCompany(companyId);
      if (!company) {
        throw new Error(`شرکت با شناسه ${companyId} یافت نشد`);
      }
      
      // استخراج اطلاعات مالی
      const financialSummary = await taxDeclarationExtractorService.extractFinancialData(
        filePath,
        company.name,
        company.nationalId
      );
      
      // ذخیره نتایج
      await this.saveFinancialSummary(companyId, financialSummary, documentId);
      
      logger.info(`✅ پردازش اظهارنامه با موفقیت تکمیل شد: شرکت ${companyId}`, 'financial-job');
      
    } catch (error: any) {
      logger.error(`❌ خطا در پردازش اظهارنامه: ${error.message}`, 'financial-job');
      
      // ذخیره خطا
      await this.updateCompanyStatus(companyId, 'error', error.message);
      
      throw error;
    }
  }
  
  /**
   * پردازش مجدد اظهارنامه (برای اجرای دستی)
   */
  async reprocessTaxDeclaration(companyId: number): Promise<FinancialSummary> {
    logger.info(`🔄 پردازش مجدد اظهارنامه مالیاتی برای شرکت ${companyId}`, 'financial-job');
    
    const company = await storage.getCompany(companyId);
    if (!company) {
      throw new Error(`شرکت با شناسه ${companyId} یافت نشد`);
    }
    
    // یافتن آخرین اظهارنامه مالیاتی
    const documents = await storage.getDocumentsByCompany(companyId);
    const taxDeclaration = documents.find((doc: any) => doc.category === 'اظهارنامه مالیاتی');
    
    if (!taxDeclaration) {
      throw new Error('اظهارنامه مالیاتی برای این شرکت یافت نشد');
    }
    
    // پردازش
    await this.processTaxDeclaration(companyId, taxDeclaration.id, taxDeclaration.filePath);
    
    // دریافت نتیجه
    const updatedCompany = await storage.getCompany(companyId);
    if (!updatedCompany || !(updatedCompany as any).financialSummaryData) {
      throw new Error('خطا در دریافت نتایج پردازش');
    }
    
    return JSON.parse((updatedCompany as any).financialSummaryData);
  }
  
  /**
   * بروزرسانی وضعیت پردازش شرکت
   */
  private async updateCompanyStatus(
    companyId: number, 
    status: 'pending' | 'processing' | 'completed' | 'error',
    errorMessage: string | null = null,
    taxDeclarationDocId?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        financialSummaryStatus: status,
        financialSummaryLastUpdated: new Date().toISOString()
      };
      
      if (status === 'error' && errorMessage) {
        updateData.financialSummaryError = errorMessage;
      } else {
        updateData.financialSummaryError = null;
      }
      
      if (taxDeclarationDocId) {
        updateData.taxDeclarationDocumentId = taxDeclarationDocId;
      }
      
      await storage.updateCompany(companyId, updateData);
      
    } catch (error: any) {
      logger.error(`❌ خطا در بروزرسانی وضعیت شرکت ${companyId}: ${error.message}`, 'financial-job');
    }
  }
  
  /**
   * ذخیره خلاصه مالی در دیتابیس
   */
  private async saveFinancialSummary(
    companyId: number, 
    financialSummary: FinancialSummary,
    taxDeclarationDocId: number
  ): Promise<void> {
    await storage.updateCompany(companyId, {
      financialSummaryData: JSON.stringify(financialSummary),
      financialSummaryStatus: 'completed',
      financialSummaryLastUpdated: new Date().toISOString(),
      financialSummaryError: null,
      taxDeclarationDocumentId: taxDeclarationDocId
    });
    
    logger.info(`💾 خلاصه مالی ذخیره شد: شرکت ${companyId}`, 'financial-job');
  }
  
  /**
   * بررسی اینکه آیا شرکت نیاز به پردازش مجدد دارد
   */
  async needsReprocessing(companyId: number): Promise<boolean> {
    const company = await storage.getCompany(companyId);
    if (!company) return false;
    
    const status = (company as any).financialSummaryStatus;
    
    // اگر pending یا error باشد، نیاز به پردازش دارد
    return status === 'pending' || status === 'error' || !status;
  }
}

export const financialProcessingJobService = new FinancialProcessingJobService();

