import { Request, Response } from "express";
import { investmentReportsService } from "../services/investment-reports.service";
import { logger } from "../utils/logger";

export const verificationController = {
  /**
   * Verify report by hash
   */
  async verifyReport(req: Request, res: Response) {
    try {
      const { hash } = req.params;

      if (!hash) {
        return res.status(400).json({ success: false, message: "Hash is required" });
      }

      const report = await investmentReportsService.getPublicReportByHash(hash);

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found or not valid" });
      }

      // Return limited public data
      res.json({
        success: true,
        data: {
          reportNumber: report.report_number,
          reportType: report.report_type,
          generatedAt: report.generated_at,
          status: report.status,
          companyName: report.company_name,
          companyNationalId: report.company_national_id,
          templateName: report.template_name,
          isValid: true,
          verifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error("Error verifying report", "verification", error as Error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};
