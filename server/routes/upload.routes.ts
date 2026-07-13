import { Router, Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { uploadMiddleware } from "../middleware/upload";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /api/upload-document
 * Specialized endpoint for AI Chat file uploads
 */
router.post("/upload-document", authMiddleware, uploadMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "هیچ فایلی آپلود نشده است" 
      });
    }

    console.log(`📁 File uploaded via AI Chat: ${req.file.originalname} -> ${req.file.filename}`);

    return res.json({
      success: true,
      message: "فایل با موفقیت آپلود شد",
      filename: req.file.filename,
      originalname: req.file.originalname,
      filePath: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    logger.error("❌ Error in AI Chat file upload:", "upload", error);
    return res.status(500).json({
      success: false,
      message: "خطا در آپلود فایل",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
