import { Router } from "express";
import { logger } from "../utils/logger";
import { z } from "zod";

const router = Router();

const clientLogSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  stack: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  meta: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
});

router.post("/", (req, res) => {
  const result = clientLogSchema.safeParse(req.body);

  if (!result.success) {
    logger.warn("Invalid client log format", "client-logger", { errors: result.error.errors });
    return res.status(400).json({ success: false, message: "Invalid log format" });
  }

  const { level, message, stack, url, userAgent, meta } = result.data;
  const source = "client";

  const logData = {
    url,
    userAgent,
    ...meta,
    clientStack: stack
  };

  if (level === "error") {
      logger.error(message, source, stack ? new Error(stack) : undefined, undefined, logData);
  } else if (level === "warn") {
      logger.warn(message, source, logData);
  } else if (level === "info") {
      logger.info(message, source, logData);
  } else {
      logger.debug(message, source, logData);
  }

  res.json({ success: true });
});

export default router;
