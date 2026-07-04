import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { storage } from "../storage";
import type { AuthRequest } from "../middleware/auth";

export class AuthController {
  /**
   * POST /api/auth/login - Step 1: Validate credentials and send OTP
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const result = await authService.loginStep1(username, password);
      
      if (result.remainingSeconds) {
        res.status(429).json(result);
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * POST /api/auth/login/verify - Step 2: Verify OTP and generate JWT
   */
  async loginVerify(req: Request, res: Response): Promise<void> {
    try {
      const { userId, code } = req.body;
      const result = await authService.loginStep2(userId, code);

      // Log successful login
      await storage.createAuditLog({
        userId: result.user!.id,
        action: "login",
        resource: "user",
        resourceId: result.user!.id,
        details: JSON.stringify({ loginTime: new Date(), method: '2FA' }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json(result);
    } catch (error) {
      console.error("Login verification error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * POST /api/auth/login/resend - Resend OTP for login
   */
  async loginResend(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      const result = await authService.resendLoginOTP(userId);
      
      if (result.remainingSeconds) {
        res.status(429).json(result);
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * POST /api/auth/register - Register new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body;
      const user = await authService.register(userData);

      res.status(201).json({
        message: "کاربر با موفقیت ایجاد شد",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * GET /api/auth/me - Get current user info
   */
  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user.userId);
      if (!user) {
        res.status(404).json({ message: "کاربر یافت نشد" });
        return;
      }

      // برای کاربران customer، دریافت companyId
      let companyId = null;
      if (user.role === 'customer') {
        const userCompanies = await storage.getUserCompanies(user.id);
        if (userCompanies.length > 0) {
          companyId = userCompanies[0].companyId;
        }
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        department: user.department,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        companyId: companyId,  // ← اضافه شد
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "خطای سیستم" });
    }
  }

  /**
   * PUT /api/user/profile - Update user profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fullName, email } = req.body;
      const updatedUser = await authService.updateProfile(req.user.userId, { fullName, email });

      if (!updatedUser) {
        res.status(404).json({ message: "کاربر یافت نشد" });
        return;
      }

      // Log audit
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "update_profile",
        resource: "user",
        resourceId: req.user.userId,
        details: JSON.stringify({ fullName, email }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({
        message: "پروفایل با موفقیت به‌روزرسانی شد",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          fullName: updatedUser.fullName,
          department: updatedUser.department,
          email: updatedUser.email,
          phone: updatedUser.phone,
          profileImage: updatedUser.profileImage,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * POST /api/user/profile-image - Update user profile image
   */
  async updateProfileImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const file = req.file;
      
      if (!file) {
        res.status(400).json({ message: "فایل تصویر الزامی است" });
        return;
      }

      // Check file type
      if (!file.mimetype.startsWith("image/")) {
        res.status(400).json({ message: "فقط فایل‌های تصویری مجاز هستند" });
        return;
      }

      // Check file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        res.status(400).json({ message: "حجم فایل نباید بیشتر از ۲ مگابایت باشد" });
        return;
      }

      const profileImagePath = `/uploads/${file.filename}`;
      const updatedUser = await authService.updateProfileImage(req.user.userId, profileImagePath);

      if (!updatedUser) {
        res.status(404).json({ message: "کاربر یافت نشد" });
        return;
      }

      // Log audit
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "update_profile_image",
        resource: "user",
        resourceId: req.user.userId,
        details: JSON.stringify({ profileImage: profileImagePath }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({
        message: "تصویر پروفایل با موفقیت به‌روزرسانی شد",
        profileImage: profileImagePath,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          fullName: updatedUser.fullName,
          department: updatedUser.department,
          email: updatedUser.email,
          phone: updatedUser.phone,
          profileImage: updatedUser.profileImage,
        },
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * POST /api/user/update-phone - Update phone number with OTP verification
   */
  async updatePhone(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { newPhone, otpCode } = req.body;
      const currentUser = await authService.getCurrentUser(req.user.userId);
      
      if (!currentUser) {
        res.status(404).json({ message: "کاربر یافت نشد" });
        return;
      }

      const updatedUser = await authService.updatePhone(req.user.userId, newPhone, otpCode);

      if (!updatedUser) {
        res.status(500).json({ message: "خطا در به‌روزرسانی شماره موبایل" });
        return;
      }

      // Log audit
      await storage.createAuditLog({
        userId: req.user.userId,
        action: "update_phone",
        resource: "user",
        resourceId: req.user.userId,
        details: JSON.stringify({ oldPhone: currentUser.phone, newPhone }),
        ipAddress: req.ip || null,
        userAgent: req.get("User-Agent") || null,
      });

      res.json({
        success: true,
        message: "شماره موبایل با موفقیت تغییر کرد",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          fullName: updatedUser.fullName,
          department: updatedUser.department,
          email: updatedUser.email,
          phone: updatedUser.phone,
          profileImage: updatedUser.profileImage,
        },
      });
    } catch (error) {
      console.error("Update phone error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "خطای سیستم" 
      });
    }
  }

  /**
   * POST /api/user/send-phone-otp - Send OTP for phone number verification
   */
  async sendPhoneOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await authService.sendPhoneOTP(phone);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          expiresIn: result.expiresIn
        });
      } else {
        res.status(429).json({
          success: false,
          message: result.message,
          remainingSeconds: result.remainingSeconds
        });
      }
    } catch (error: any) {
      console.error("Send phone OTP error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "خطا در ارسال کد تایید" 
      });
    }
  }
}

export const authController = new AuthController(); 