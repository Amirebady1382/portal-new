import { Router } from "express";
import { investmentReportsController } from "../controllers/investment-reports.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { uploadMiddleware } from "../middleware/upload";
import { moderateRateLimit } from "../middleware/rate-limiter";

const router = Router();

/**
 * Routes برای سیستم تولید گزارش ارزیابی هوشمند
 * همه routes نیاز به authentication دارند
 */

// ============================================
// قالب‌های گزارش (Templates)
// ============================================

/**
 * GET /api/investment-reports/templates
 * دریافت لیست قالب‌های گزارش
 * Query params: category, isActive
 */
router.get(
  "/templates",
  authMiddleware,
  investmentReportsController.getReportTemplates.bind(investmentReportsController) as any
);

/**
 * GET /api/investment-reports/templates/:id
 * دریافت یک قالب گزارش خاص
 */
router.get(
  "/templates/:id",
  authMiddleware,
  investmentReportsController.getReportTemplate.bind(investmentReportsController) as any
);

/**
 * POST /api/investment-reports/templates
 * ایجاد قالب گزارش جدید
 * فقط admin و ceo
 */
router.post(
  "/templates",
  authMiddleware,
  requireRole(["admin", "ceo"]),
  uploadMiddleware,
  investmentReportsController.createReportTemplate.bind(investmentReportsController) as any
);

// ============================================
// تولید و مدیریت گزارش‌ها
// ============================================

/**
 * POST /api/investment-reports/generate
 * تولید گزارش ارزیابی جدید
 * Body: { templateId, companyId, reportType, customFields, variables }
 */
router.post(
  "/generate",
  authMiddleware,
  investmentReportsController.generateReport.bind(investmentReportsController) as any
);

/**
 * POST /api/investment-reports/generate-ai
 * تولید گزارش با AI (بدون قالب - با متن آزاد)
 * Body: { companyId, customText, usePerplexity, detailLevel }
 */
router.post(
  "/generate-ai",
  authMiddleware,
  requireRole(["admin", "employee", "ceo"]),
  investmentReportsController.generateAIReport.bind(investmentReportsController) as any
);

/**
 * GET /api/investment-reports/download/:fileName
 * دانلود فایل گزارش
 * با rate limiting برای جلوگیری از سوء استفاده
 */
router.get(
  "/download/:fileName",
  authMiddleware,
  moderateRateLimit,
  investmentReportsController.downloadReport.bind(investmentReportsController) as any
);

/**
 * GET /api/investment-reports/company/:companyId
 * دریافت تمام گزارش‌های یک شرکت
 */
router.get(
  "/company/:companyId",
  authMiddleware,
  investmentReportsController.getCompanyReports.bind(investmentReportsController) as any
);

/**
 * PUT /api/investment-reports/:id/status
 * به‌روزرسانی وضعیت گزارش (draft, finalized, approved, rejected)
 * فقط admin و ceo
 */
router.put(
  "/:id/status",
  authMiddleware,
  requireRole(["admin", "ceo"]),
  investmentReportsController.updateReportStatus.bind(investmentReportsController) as any
);

// ============================================
// داده‌های فرم (Form Data)
// ============================================

/**
 * GET /api/investment-reports/form-data/:companyId/:templateId
 * دریافت داده‌های فرم ذخیره شده
 */
router.get(
  "/form-data/:companyId/:templateId",
  authMiddleware,
  investmentReportsController.getReportFormData.bind(investmentReportsController) as any
);

/**
 * POST /api/investment-reports/form-data
 * ذخیره/به‌روزرسانی داده‌های فرم
 * Body: { companyId, templateId, formData }
 */
router.post(
  "/form-data",
  authMiddleware,
  investmentReportsController.saveReportFormData.bind(investmentReportsController) as any
);

// ============================================
// متغیرها و فرمول‌ها (Variables & Formulas)
// ============================================

/**
 * GET /api/investment-reports/variables
 * دریافت لیست متغیرهای گزارش
 * Query params: category, source
 */
router.get(
  "/variables",
  authMiddleware,
  investmentReportsController.getReportVariables.bind(investmentReportsController) as any
);

/**
 * GET /api/investment-reports/formulas
 * دریافت لیست فرمول‌های محاسباتی
 */
router.get(
  "/formulas",
  authMiddleware,
  investmentReportsController.getFormulas.bind(investmentReportsController) as any
);

/**
 * POST /api/investment-reports/calculate
 * محاسبه متغیرهای مالی
 * Body: { revenue, cost_of_goods_sold, ... }
 */
router.post(
  "/calculate",
  authMiddleware,
  investmentReportsController.calculateMetrics.bind(investmentReportsController) as any
);

export default router;

