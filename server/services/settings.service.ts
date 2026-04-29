import { storage } from "../storage";
import type { SystemSetting, InsertSystemSetting } from "../../shared/schema";
import { logger } from "../utils/logger";

export interface SettingsCache {
  [key: string]: string | number | boolean;
}

export class SettingsService {
  private cache: SettingsCache = {};
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a single setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      await this.refreshCacheIfNeeded();
      return this.cache[key]?.toString() || null;
    } catch (error) {
      logger.error(`Error getting setting ${key}`, 'settings', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Get multiple settings by category  
   */
  async getSettingsByCategory(category: string): Promise<Record<string, string>> {
    try {
      await this.refreshCacheIfNeeded();
      const result: Record<string, string> = {};
      
      const settings = await storage.getSystemSettingsByCategory(category);
      for (const setting of settings) {
        result[setting.key] = setting.value;
      }
      
      return result;
    } catch (error) {
      logger.error(`Error getting settings for category ${category}`, 'settings', error instanceof Error ? error : new Error(String(error)));
      return {};
    }
  }

  /**
   * Update a single setting
   */
  async updateSetting(key: string, value: string, userId?: number): Promise<boolean> {
    try {
      const success = await storage.updateSystemSetting(key, value, userId);
      if (success) {
        // Invalidate cache to force refresh
        this.cacheTimestamp = 0;
        logger.info(`Setting updated: ${key} = ${value}`, 'settings');
      }
      return success;
    } catch (error) {
      logger.error(`Error updating setting ${key}`, 'settings', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get all fund information settings
   */
  async getFundInfo(): Promise<Record<string, string>> {
    return await this.getSettingsByCategory('fund_info');
  }

  /**
   * Get all contract default settings
   */
  async getContractDefaults(): Promise<Record<string, string>> {
    return await this.getSettingsByCategory('contract_defaults');
  }

  /**
   * Force refresh cache
   */
  private async refreshCache(): Promise<void> {
    try {
      const allSettings = await storage.getAllSystemSettings();
      this.cache = {};
      
      for (const setting of allSettings) {
        // Store based on data type
        switch (setting.dataType) {
          case 'number':
            this.cache[setting.key] = parseFloat(setting.value);
            break;
          case 'boolean':
            this.cache[setting.key] = setting.value.toLowerCase() === 'true' || setting.value === '1';
            break;
          default:
            this.cache[setting.key] = setting.value;
        }
      }
      
      this.cacheTimestamp = Date.now();
      logger.debug(`Settings cache refreshed with ${allSettings.length} settings`, 'settings');
    } catch (error) {
      logger.error('Error refreshing settings cache', 'settings', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(settings: Record<string, string>, userId?: number): Promise<boolean> {
    try {
      let allSuccess = true;
      
      for (const [key, value] of Object.entries(settings)) {
        const success = await storage.updateSystemSetting(key, value, userId);
        if (!success) {
          allSuccess = false;
          logger.error(`Failed to update setting: ${key}`, 'settings');
        }
      }
      
      if (allSuccess) {
        // Invalidate cache to force refresh
        this.cacheTimestamp = 0;
        logger.info(`Updated ${Object.keys(settings).length} settings`, 'settings');
      }
      
      return allSuccess;
    } catch (error) {
      logger.error('Error updating multiple settings', 'settings', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Create a new setting
   */
  async createSetting(settingData: any): Promise<any> {
    try {
      const setting = await storage.createSystemSetting(settingData);
      if (setting) {
        // Invalidate cache to force refresh
        this.cacheTimestamp = 0;
        logger.info(`Setting created: ${settingData.key} = ${settingData.value}`, 'settings');
      }
      return setting;
    } catch (error) {
      logger.error('Error creating setting', 'settings', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Get all settings grouped by category
   */
  async getAllSettingsGrouped(): Promise<Record<string, any[]>> {
    try {
      const allSettings = await storage.getAllSystemSettings();
      const grouped: Record<string, any[]> = {};
      
      for (const setting of allSettings) {
        if (!grouped[setting.category]) {
          grouped[setting.category] = [];
        }
        grouped[setting.category].push(setting);
      }
      
      return grouped;
    } catch (error) {
      logger.error('Error getting all settings', 'settings', error instanceof Error ? error : new Error(String(error)));
      return {};
    }
  }

  /**
   * Refresh cache if needed (TTL expired)
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.cacheTimestamp > this.CACHE_TTL) {
      await this.refreshCache();
    }
  }
}

export const settingsService = new SettingsService();