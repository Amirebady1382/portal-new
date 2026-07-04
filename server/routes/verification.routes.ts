import { Router } from "express";
import { verificationController } from "../controllers/verification.controller";
import { moderateRateLimit } from "../middleware/rate-limiter";

const router = Router();

/**
 * Public Verification Route
 * No authentication required, but rate limited
 */
router.get("/:hash", moderateRateLimit, verificationController.verifyReport);

export default router;
