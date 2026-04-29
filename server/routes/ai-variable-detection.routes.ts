import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { aiVariableDetectionService } from '../services/ai-variable-detection.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/ai/analyze-contract-template
 * Analyze a Word document with AI to detect variables
 */
router.post(
  '/analyze-contract-template',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'فایل ارسال نشده است' 
        });
      }

      const { model, customPrompt, systemContext } = req.body;

      if (!model) {
        return res.status(400).json({ 
          success: false, 
          message: 'مدل AI انتخاب نشده است' 
        });
      }

      console.log(`🤖 Starting AI analysis with model: ${model}`);
      console.log(`📄 File: ${req.file.originalname} (${req.file.size} bytes)`);

      // Extract content from Word document
      const content = await aiVariableDetectionService.extractContentFromWord(req.file.path);
      console.log(`📝 Extracted ${content.length} characters from document`);

      // Default system context if not provided
      const defaultSystemContext = `
شما در حال تحلیل قالب قرارداد برای صندوق پژوهش و فناوری غیردولتی استان گیلان هستید.
این صندوق در زمینه‌های زیر فعالیت می‌کند:
- ارائه تسهیلات مالی به شرکت‌های دانش‌بنیان
- صدور ضمانت‌نامه برای شرکت‌ها
- سرمایه‌گذاری خطرپذیر
- حمایت از استارتاپ‌ها

سیستم CRM از API رسمیو برای دریافت اطلاعات شرکت‌ها استفاده می‌کند.
متغیرهایی که با company_ شروع می‌شوند از رسمیو دریافت می‌شوند.
متغیرهایی که با calc_ شروع می‌شوند یا _words دارند، محاسباتی هستند.
      `;

      const finalSystemContext = systemContext || defaultSystemContext;

      // Analyze with AI
      const analysisResult = await aiVariableDetectionService.analyzeWithAI(
        content,
        model,
        finalSystemContext,
        customPrompt
      );

      console.log(`✅ Analysis complete: ${analysisResult.detectedVariables.length} variables detected`);
      console.log(`⏱️ Processing time: ${analysisResult.processingTime}ms`);

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete temporary file:', error);
      }

      res.json({
        success: true,
        ...analysisResult
      });

    } catch (error) {
      console.error('❌ AI analysis error:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete temporary file:', unlinkError);
        }
      }

      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'خطا در تحلیل فایل با AI' 
      });
    }
  }
);

/**
 * POST /api/ai/apply-variables
 * Apply detected variables to a Word document
 */
router.post(
  '/apply-variables',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'فایل ارسال نشده است' 
        });
      }

      const variables = JSON.parse(req.body.variables || '[]');

      if (!Array.isArray(variables) || variables.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'متغیرها ارسال نشده‌اند' 
        });
      }

      console.log(`🔧 Applying ${variables.length} variables to document`);

      // Apply variables to document
      const processedBuffer = await aiVariableDetectionService.applyVariablesAdvanced(
        req.file.path,
        variables
      );

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete temporary file:', error);
      }

      // Generate filename
      const originalName = path.parse(req.file.originalname).name;
      const outputFilename = `${originalName}_variabled_${Date.now()}.docx`;

      console.log(`✅ Variables applied successfully: ${outputFilename}`);

      // Send the processed file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
      res.send(processedBuffer);

    } catch (error) {
      console.error('❌ Variable application error:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete temporary file:', unlinkError);
        }
      }

      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'خطا در اعمال متغیرها' 
      });
    }
  }
);

/**
 * POST /api/ai/extract-text
 * Extract plain text from Word document (for preview)
 */
router.post(
  '/extract-text',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'فایل ارسال نشده است' 
        });
      }

      const content = await aiVariableDetectionService.extractContentFromWord(req.file.path);

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete temporary file:', error);
      }

      res.json({
        success: true,
        content,
        length: content.length
      });

    } catch (error) {
      console.error('❌ Text extraction error:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete temporary file:', unlinkError);
        }
      }

      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'خطا در استخراج متن' 
      });
    }
  }
);

/**
 * GET /api/ai/models
 * Get available AI models (Claude only)
 */
router.get(
  '/models',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    const models = [];

    // Only check for Claude API key
    if (process.env.ANTHROPIC_API_KEY) {
      models.push(
        { value: 'claude-4-sonnet', label: '🚀 Claude 4 Sonnet (جدیدترین - فوق‌العاده قوی)', provider: 'anthropic', available: true },
        { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (بسیار قوی و سریع)', provider: 'anthropic', available: true },
        { value: 'claude-3-opus', label: 'Claude 3 Opus (قوی‌ترین Claude 3)', provider: 'anthropic', available: true }
      );
    } else {
      models.push({
        value: 'none',
        label: 'کلید API کلاد پیکربندی نشده',
        provider: 'none',
        available: false
      });
    }

    res.json({
      success: true,
      models,
      configured: {
        anthropic: !!process.env.ANTHROPIC_API_KEY
      }
    });
  }
);

/**
 * POST /api/ai/test-connection
 * Test Claude API connection
 */
router.post(
  '/test-connection',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const isConfigured = !!process.env.ANTHROPIC_API_KEY;
      
      if (isConfigured) {
        res.json({ 
          success: true, 
          message: 'کلید API کلاد با موفقیت پیکربندی شده است' 
        });
      } else {
        res.json({ 
          success: false, 
          message: 'کلید API کلاد پیکربندی نشده است. لطفاً ANTHROPIC_API_KEY را در فایل .env تنظیم کنید' 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'خطا در تست اتصال' 
      });
    }
  }
);

export default router;
