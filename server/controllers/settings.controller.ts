import type { Response } from "express";
import { settingsService } from "../services/settings.service";
import type { AuthRequest } from "../middleware/auth";

export class SettingsController {
  /**
   * GET /api/settings - Get all settings grouped by category
   */
  async getAllSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const groupedSettings = await settingsService.getAllSettingsGrouped();
      res.json({ 
        success: true, 
        data: groupedSettings,
        categories: Object.keys(groupedSettings),
        totalSettings: Object.values(groupedSettings).reduce((sum, arr) => sum + arr.length, 0)
      });
    } catch (error) {
      console.error("Get all settings error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطا در دریافت تنظیمات" 
      });
    }
  }

  /**
   * GET /api/settings/category/:category - Get settings by category
   */
  async getSettingsByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const settings = await settingsService.getSettingsByCategory(category);
      
      res.json({ 
        success: true, 
        data: settings,
        category,
        count: Object.keys(settings).length
      });
    } catch (error) {
      console.error("Get settings by category error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطا در دریافت تنظیمات دسته‌بندی" 
      });
    }
  }

  /**
   * PUT /api/settings - Update multiple settings at once
   */
  async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        res.status(400).json({ 
          success: false, 
          message: "فرمت تنظیمات نامعتبر است" 
        });
        return;
      }

      const success = await settingsService.updateSettings(settings, req.user.userId);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `${Object.keys(settings).length} تنظیم با موفقیت به‌روزرسانی شد`,
          updatedCount: Object.keys(settings).length
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطا در به‌روزرسانی تنظیمات" 
        });
      }
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطا در به‌روزرسانی تنظیمات" 
      });
    }
  }

  /**
   * PUT /api/settings/:key - Update single setting
   */
  async updateSetting(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!key || value === undefined) {
        res.status(400).json({ 
          success: false, 
          message: "کلید و مقدار تنظیم الزامی است" 
        });
        return;
      }

      const success = await settingsService.updateSetting(key, value.toString(), req.user.userId);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `تنظیم ${key} با موفقیت به‌روزرسانی شد`,
          key,
          value: value.toString()
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "تنظیم مورد نظر یافت نشد" 
        });
      }
    } catch (error) {
      console.error("Update single setting error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطا در به‌روزرسانی تنظیم" 
      });
    }
  }

  /**
   * POST /api/settings - Create new setting
   */
  async createSetting(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { key, value, category, description, dataType = 'text', isEditable = true } = req.body;
      
      if (!key || !value || !category) {
        res.status(400).json({ 
          success: false, 
          message: "کلید، مقدار و دسته‌بندی الزامی است" 
        });
        return;
      }

      const setting = await settingsService.createSetting({
        key,
        value: value.toString(),
        category,
        description,
        dataType,
        isEditable,
        updatedBy: req.user.userId
      });
      
      if (setting) {
        res.status(201).json({ 
          success: true, 
          message: "تنظیم جدید با موفقیت ایجاد شد",
          data: setting
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطا در ایجاد تنظیم جدید" 
        });
      }
    } catch (error) {
      console.error("Create setting error:", error);
      
      // Handle unique constraint violation
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ 
          success: false, 
          message: "تنظیم با این کلید قبلاً وجود دارد" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطا در ایجاد تنظیم جدید" 
        });
      }
    }
  }
}

export const settingsController = new SettingsController(); 