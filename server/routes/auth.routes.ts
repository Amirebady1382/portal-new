import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth";
import { imageUploadMiddleware } from "../middleware/upload";

export const authRoutes = Router();

// Authentication routes
authRoutes.post("/login", (req, res) => authController.login(req, res));
authRoutes.post("/login/verify", (req, res) => authController.loginVerify(req, res));
authRoutes.post("/login/resend", (req, res) => authController.loginResend(req, res));
authRoutes.post("/register", (req, res) => authController.register(req, res));
authRoutes.get("/me", authMiddleware, (req, res) => authController.me(req as any, res));

// User profile routes (keeping /user prefix for compatibility)
authRoutes.put("/user/profile", authMiddleware, (req, res) => authController.updateProfile(req as any, res));
authRoutes.post("/user/profile-image", authMiddleware, imageUploadMiddleware, (req, res) => authController.updateProfileImage(req as any, res));
authRoutes.post("/user/update-phone", authMiddleware, (req, res) => authController.updatePhone(req as any, res));
authRoutes.post("/user/send-phone-otp", authMiddleware, (req, res) => authController.sendPhoneOTP(req as any, res)); 