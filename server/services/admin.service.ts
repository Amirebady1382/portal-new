import { storage } from "../storage";
import { db } from "../db";
import { monitoring } from "../utils/monitoring";
import bcrypt from "bcrypt";
import { validateIranianMobile } from "../utils/validation";

export interface SystemHealth {
  health: any;
  metrics: any;
  timestamp: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  department: string | null;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  name: string;
  nationalId: string;
  // Add other company properties as needed
}

export interface PhoneUpdateResult {
  success: boolean;
  message: string;
  users: Array<{
    username: string;
    role: string;
    phone: string;
  }>;
}

export class AdminService {
  /**
   * Get system health and monitoring data
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const systemHealth = monitoring.getSystemHealth();
    const allMetrics = monitoring.getAllMetrics();
    
    return {
      health: systemHealth,
      metrics: allMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get all users in the system
   */
  async getAllUsers(): Promise<any[]> {
    return await storage.getAllUsers();
  }

  /**
   * Get single user by ID
   */
  async getUser(userId: number): Promise<any> {
    return await storage.getUser(userId);
  }

  /**
   * Delete user from system (with validation)
   */
  async deleteUser(userId: number, adminUserId: number): Promise<{ success: boolean; message: string; userData?: any }> {
    // Check if admin is trying to delete themselves
    if (userId === adminUserId) {
      throw new Error("نمی‌توانید خودتان را حذف کنید");
    }

    // Check if user exists
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("کاربر یافت نشد");
    }

    // Delete user
    const deleted = await storage.deleteUser(userId);
    
    if (!deleted) {
      throw new Error("خطا در حذف کاربر");
    }

    return {
      success: true,
      message: "کاربر با موفقیت حذف شد",
      userData: {
        deletedUsername: user.username,
        deletedRole: user.role
      }
    };
  }

  /**
   * Delete company from system (admin only)
   */
  async deleteCompany(companyId: number): Promise<{ success: boolean; message: string; companyData?: any }> {
    // Check if company exists
    const company = await storage.getCompany(companyId);
    if (!company) {
      throw new Error("شرکت یافت نشد");
    }

    // Delete company and all related data
    const deleted = await storage.deleteCompany(companyId);
    
    if (!deleted) {
      throw new Error("خطا در حذف شرکت");
    }

    return {
      success: true,
      message: "شرکت با موفقیت حذف شد",
      companyData: {
        deletedCompanyName: company.name,
        deletedNationalId: company.nationalId
      }
    };
  }

  /**
   * Update phone numbers for all users (emergency function)
   */
  async updateAllPhoneNumbers(): Promise<PhoneUpdateResult> {
    try {
      console.log('📞 تنظیم شماره موبایل کاربران...');
      
      // Update employees to 09919252110
      const employeeUsers = await db.execute("SELECT id, username, role FROM users WHERE role = 'employee'");
      for (const user of employeeUsers.rows) {
        await db.execute("UPDATE users SET phone = ? WHERE id = ?", ['09919252110', (user as any).id]);
      }
      
      // Update customers to 09919252110  
      const customerUsers = await db.execute("SELECT id, username, role FROM users WHERE role = 'customer'");
      for (const user of customerUsers.rows) {
        await db.execute("UPDATE users SET phone = ? WHERE id = ?", ['09919252110', (user as any).id]);
      }
      
      // Ensure admin stays 09331201766
      await db.execute("UPDATE users SET phone = ? WHERE role = 'admin'", ['09331201766']);
      
      // Get final result
      const allUsers = await db.execute("SELECT username, role, phone FROM users ORDER BY id");
      
      return {
        success: true,
        message: 'شماره موبایل کاربران تنظیم شد',
        users: allUsers.rows.map((user: any) => ({
          username: user.username,
          role: user.role,
          phone: user.phone
        }))
      };
      
    } catch (error) {
      console.error("خطا در تنظیم شماره موبایل:", error);
      throw new Error("خطا در تنظیم شماره‌های تماس");
    }
  }

  /**
   * Create audit log for admin actions
   */
  async createAuditLog(
    userId: number,
    action: string,
    resource: string,
    resourceId: number,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        action,
        resource,
        resourceId,
        details: JSON.stringify(details),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });
    } catch (auditError) {
      console.log('⚠️ Audit log failed (non-critical):', auditError);
      // Don't throw error for audit log failures - they shouldn't break the main operation
    }
  }

  /**
   * Get system statistics (for dashboard)
   */
  async getSystemStatistics(): Promise<any> {
    const stats = await storage.getSystemStats();
    return stats;
  }

  /**
   * Create new user (Admin only - bypasses OTP requirement)
   */
  async createUser(userData: any, adminUserId: number): Promise<User> {
    const { username, password, fullName, email, phone, role = "customer", department } = userData;

    // Validate required fields
    if (!username || !password || !fullName) {
      throw new Error("نام کاربری، رمز عبور و نام کامل الزامی است");
    }

    // Validate and normalize phone number format if provided
    let normalizedPhone = phone;
    if (phone) {
      // Remove all non-digit characters
      normalizedPhone = phone.replace(/\D/g, '');
      
      // Check if it's a valid Iranian mobile number
      if (!validateIranianMobile(normalizedPhone)) {
        throw new Error("شماره موبایل باید 11 رقم و با 09 شروع شود (مثال: 09123456789)");
      }
    }

    // Check if user exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new Error("نام کاربری قبلاً استفاده شده است");
    }

    // Check if phone number already exists (if provided)
    if (normalizedPhone) {
      const existingPhone = await storage.getUserByPhone(normalizedPhone);
      if (existingPhone) {
        throw new Error("شماره موبایل قبلاً ثبت شده است");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user data
    const newUserData = {
      username,
      password: hashedPassword,
      fullName,
      email: email || null,
      phone: normalizedPhone || null,
      role: role as any,
      ...(role === "employee" && department && department !== "" ? { department: department as any } : {}),
      isActive: true
    };
    
    const user = await storage.createUser(newUserData);
    if (!user) {
      throw new Error("خطا در ایجاد کاربر در دیتابیس");
    }
    return user;
  }

  /**
   * Update user (Admin only)
   */
  async updateUser(userId: number, updateData: any, adminUserId: number): Promise<User> {
    const { username, password, fullName, email, phone, role, department, isActive } = updateData;

    // Get current user data
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      throw new Error("کاربر یافت نشد");
    }

    // Prevent admin from deactivating themselves
    if (userId === adminUserId && isActive === false) {
      throw new Error("نمی‌توانید خودتان را غیرفعال کنید");
    }

    // Validate phone number format if provided and changed
    if (phone && phone !== currentUser.phone && !validateIranianMobile(phone)) {
      throw new Error("شماره موبایل باید به فرمت 09xxxxxxxxx باشد");
    }

    // Check if username already exists (if changed)
    if (username && username !== currentUser.username) {
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        throw new Error("نام کاربری قبلاً استفاده شده است");
      }
    }

    // Check if phone number already exists (if changed)
    if (phone && phone !== currentUser.phone) {
      const existingPhone = await storage.getUserByPhone(phone);
      if (existingPhone && existingPhone.id !== userId) {
        throw new Error("شماره موبایل قبلاً ثبت شده است");
      }
    }

    // Prepare update data
    const updateFields: any = {};
    
    if (username && username !== currentUser.username) updateFields.username = username;
    if (fullName && fullName !== currentUser.fullName) updateFields.fullName = fullName;
    if (email !== undefined) updateFields.email = email || null;
    if (phone !== undefined) updateFields.phone = phone || null;
    if (role && role !== currentUser.role) updateFields.role = role;
    if (role === "employee" && department) updateFields.department = department;
    if (role !== "employee") updateFields.department = null;
    if (isActive !== undefined) updateFields.isActive = isActive;
    
    // Hash password if provided
    if (password && password.trim() !== "") {
      updateFields.password = await bcrypt.hash(password, 10);
    }

    const user = await storage.updateUser(userId, updateFields);
    if (!user) {
      throw new Error("خطا در به‌روزرسانی کاربر در دیتابیس");
    }
    return user;
  }

  /**
   * Validate admin permissions for sensitive operations
   */
  validateAdminOperation(userRole: string, operation: string): boolean {
    if (userRole !== "admin") {
      throw new Error(`عملیات ${operation} فقط برای مدیران سیستم مجاز است`);
    }
    return true;
  }

  /**
   * Get audit logs (for admin monitoring)
   */
  async getAuditLogs(limit: number = 100, offset: number = 0): Promise<any[]> {
    return await storage.getAuditLogs(limit, offset);
  }

  /**
   * Get system health summary
   */
  async getSystemSummary(): Promise<any> {
    try {
      const [users, companies, documents] = await Promise.all([
        this.getAllUsers(),
        storage.getCompanies({ limit: 1000 }),
        storage.getDocuments()
      ]);

      const activeUsers = users.filter((u: any) => u.isActive);
      const adminUsers = users.filter((u: any) => u.role === "admin");
      const employeeUsers = users.filter((u: any) => u.role === "employee");
      const customerUsers = users.filter((u: any) => u.role === "customer");

      return {
        users: {
          total: users.length,
          active: activeUsers.length,
          admins: adminUsers.length,
          employees: employeeUsers.length,
          customers: customerUsers.length
        },
        companies: {
          total: companies.length,
          active: companies.filter((c: any) => c.status === "active").length
        },
        documents: {
          total: documents.length,
          pending: documents.filter((d: any) => d.status === "pending").length,
          approved: documents.filter((d: any) => d.status === "approved").length
        },
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting system summary:", error);
      throw new Error("خطا در دریافت خلاصه سیستم");
    }
  }
}

export const adminService = new AdminService(); 