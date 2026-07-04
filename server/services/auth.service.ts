import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { otpService } from "./otp.service";
import { smsService } from "./sms.service";
import { validateIranianMobile } from "../utils/validation";

// Helper function to get JWT secret
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export interface LoginResult {
  step: 1 | 2;
  token?: string;
  user?: {
    id: number;
    username: string;
    role: string;
    fullName: string;
    department?: string;
  };
  message: string;
  phone?: string;
  expiresIn?: number;
  userId?: number;
  fullName?: string;
  profileImage?: string | null;
  remainingSeconds?: number;
}

export interface User {
  id: number;
  username: string;
  password: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  isActive: boolean;
  profileImage: string | null;
}

export interface CreateUserData {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone: string;
  role: string;
  department?: string;
}

export class AuthService {
  /**
   * Login step 1: Validate credentials and send OTP
   */
  async loginStep1(username: string, password: string): Promise<LoginResult> {
    if (!username || !password) {
      throw new Error("نام کاربری و رمز عبور الزامی است");
    }

    const user = await storage.getUserByUsernameWithPassword(username);
    if (!user) {
      throw new Error("نام کاربری یا رمز عبور اشتباه است");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("نام کاربری یا رمز عبور اشتباه است");
    }

    if (!user.isActive) {
      throw new Error("حساب کاربری غیرفعال است");
    }

    // Check if user has phone number
    if (!user.phone) {
      throw new Error("شماره موبایل در حساب کاربری ثبت نشده است. لطفاً با مدیر سیستم تماس بگیرید");
    }

    // Send OTP
    const otpResult = await otpService.sendOTP(user.phone, 'login');
    
    if (otpResult.success) {
      return {
        step: 1,
        message: "اطلاعات تایید شد. کد تایید به شماره موبایل شما ارسال شد",
        phone: user.phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1***$3'), // مخفی کردن بخشی از شماره
        expiresIn: otpResult.expiresIn,
        userId: user.id,
        fullName: user.fullName,
        profileImage: user.profileImage
      };
    } else {
      return {
        step: 1,
        message: otpResult.message,
        remainingSeconds: otpResult.remainingSeconds
      };
    }
  }

  /**
   * Login step 2: Verify OTP and generate JWT
   */
  async loginStep2(userId: number, code: string): Promise<LoginResult> {
    if (!userId || !code) {
      throw new Error("کد تایید و شناسه کاربری الزامی است");
    }

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("کاربر یافت نشد");
    }

    if (!user.phone) {
      throw new Error("شماره موبایل کاربر موجود نیست");
    }

    // Verify OTP
    await otpService.verifyOTP(user.phone, code, 'login');

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        department: user.department
      },
      getJwtSecret(),
      { expiresIn: "24h" }
    );

    return {
      step: 2,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        department: user.department || undefined,
      },
      message: "ورود با موفقیت انجام شد"
    };
  }

  /**
   * Resend OTP for login
   */
  async resendLoginOTP(userId: number): Promise<LoginResult> {
    if (!userId) {
      throw new Error("شناسه کاربری الزامی است");
    }

    const user = await storage.getUser(userId);
    if (!user || !user.phone) {
      throw new Error("کاربر یا شماره موبایل یافت نشد");
    }

    const otpResult = await otpService.sendOTP(user.phone, 'login');
    
    if (otpResult.success) {
      return {
        step: 1,
        message: "کد تایید مجدداً ارسال شد",
        expiresIn: otpResult.expiresIn
      };
    } else {
      return {
        step: 1,
        message: otpResult.message,
        remainingSeconds: otpResult.remainingSeconds
      };
    }
  }

  /**
   * Register new user
   */
  async register(userData: CreateUserData): Promise<User> {
    const { username, password, fullName, email, phone, role = "customer", department } = userData;

    // Validate required fields
    if (!username || !password || !fullName || !phone) {
      throw new Error("نام کاربری، رمز عبور، نام کامل و شماره موبایل الزامی است");
    }

    // Validate phone number format
    if (!validateIranianMobile(phone)) {
      throw new Error("شماره موبایل باید به فرمت 09xxxxxxxxx باشد");
    }

    // Check if user exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new Error("نام کاربری قبلاً استفاده شده است");
    }

    // Check if phone number already exists
    const existingPhone = await storage.getUserByPhone(phone);
    if (existingPhone) {
      throw new Error("شماره موبایل قبلاً ثبت شده است");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUserData = {
      username,
      password: hashedPassword,
      fullName,
      email,
      phone,
      role: role as any,
      ...(department && department !== "" ? { department: department as any } : {}),
    };
    
    const user = await storage.createUser(newUserData);
    return user;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: number): Promise<any> {
    return await storage.getUser(userId);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: { fullName: string; email?: string }): Promise<any> {
    if (!data.fullName || data.fullName.trim() === "") {
      throw new Error("نام و نام خانوادگی الزامی است");
    }

    return await storage.updateUserProfile(userId, {
      fullName: data.fullName.trim(),
      email: data.email?.trim() || null,
    });
  }

  /**
   * Update user profile image
   */
  async updateProfileImage(userId: number, profileImagePath: string): Promise<any> {
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      throw new Error("کاربر یافت نشد");
    }

    return await storage.updateUserProfile(userId, {
      fullName: currentUser.fullName,
      email: currentUser.email,
      profileImage: profileImagePath,
    });
  }

  /**
   * Update user phone number with OTP verification
   */
  async updatePhone(userId: number, newPhone: string, otpCode: string): Promise<any> {
    if (!newPhone || !otpCode) {
      throw new Error("شماره موبایل جدید و کد تایید الزامی است");
    }

    // Validate phone format
    if (!smsService.validatePhoneNumber(newPhone)) {
      throw new Error("فرمت شماره موبایل نامعتبر است");
    }

    // Check if phone already exists for another user
    const existingUser = await storage.getUserByPhone(newPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است");
    }

    // Verify OTP
    await otpService.verifyOTP(newPhone, otpCode, 'register');

    // Update user phone
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      throw new Error("کاربر یافت نشد");
    }

    return await storage.updateUserProfile(userId, {
      fullName: currentUser.fullName,
      email: currentUser.email,
    } as any);
  }

  /**
   * Send OTP for phone verification
   */
  async sendPhoneOTP(phone: string): Promise<any> {
    if (!phone) {
      throw new Error("شماره موبایل الزامی است");
    }

    // Validate phone format
    if (!smsService.validatePhoneNumber(phone)) {
      throw new Error("فرمت شماره موبایل نامعتبر است");
    }

    return await otpService.sendOTP(phone, 'register');
  }
}

export const authService = new AuthService(); 