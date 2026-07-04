import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { contractVariablesService } from '../services/contract-variables.service';
import { employeeBaleSettingsService } from '../services/employee-bale-settings.service';

export class AdminManagementController {
  
  // Contract Variables endpoints
  
  /**
   * GET /api/admin/contract-variables - Get all contract variables
   */
  async getContractVariables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const variables = await contractVariablesService.getContractVariables();
      res.json({ variables });
    } catch (error) {
      console.error('Get contract variables error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * GET /api/admin/contract-variables/stats - Get variables statistics
   */
  async getVariablesStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await contractVariablesService.getVariablesStats();
      res.json({ stats });
    } catch (error) {
      console.error('Get variables stats error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * GET /api/admin/contract-variables/:id - Get specific contract variable
   */
  async getContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const variable = await contractVariablesService.getContractVariable(id);
      
      if (!variable) {
        res.status(404).json({ message: 'متغیر یافت نشد' });
        return;
      }

      res.json({ variable });
    } catch (error) {
      console.error('Get contract variable error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * POST /api/admin/contract-variables - Create new contract variable
   */
  async createContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        label,
        description,
        type = 'text',
        defaultValue,
        isRequired = false,
        source = 'form',
        placeholder,
        validation,
        category = 'general',
        isActive = true
      } = req.body;

      // Validation
      if (!name || !label) {
        res.status(400).json({ message: 'نام و برچسب متغیر الزامی است' });
        return;
      }

      // Check if name already exists
      const existing = await contractVariablesService.getContractVariables();
      if (existing.some(v => v.name === name)) {
        res.status(400).json({ message: 'نام متغیر قبلاً وجود دارد' });
        return;
      }

      const variableData = {
        name,
        label,
        description: description || null,
        type,
        defaultValue: defaultValue || null,
        isRequired,
        source,
        placeholder: placeholder || null,
        validation: validation || null,
        category,
        isActive
      };

      const newVariable = await contractVariablesService.createContractVariable(
        variableData, 
        req.user.userId
      );

      res.status(201).json({ 
        message: 'متغیر با موفقیت ایجاد شد',
        variable: newVariable 
      });
    } catch (error) {
      console.error('Create contract variable error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * PUT /api/admin/contract-variables/:id - Update contract variable
   */
  async updateContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      // Check if variable exists
      const existing = await contractVariablesService.getContractVariable(id);
      if (!existing) {
        res.status(404).json({ message: 'متغیر یافت نشد' });
        return;
      }

      // If name is being changed, check for duplicates
      if (updateData.name && updateData.name !== existing.name) {
        const allVariables = await contractVariablesService.getContractVariables();
        if (allVariables.some(v => v.name === updateData.name && v.id !== id)) {
          res.status(400).json({ message: 'نام متغیر قبلاً وجود دارد' });
          return;
        }
      }

      const updatedVariable = await contractVariablesService.updateContractVariable(
        id, 
        updateData, 
        req.user.userId
      );

      res.json({ 
        message: 'متغیر با موفقیت به‌روزرسانی شد',
        variable: updatedVariable 
      });
    } catch (error) {
      console.error('Update contract variable error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * DELETE /api/admin/contract-variables/:id - Delete contract variable
   */
  async deleteContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      // Check if variable exists
      const existing = await contractVariablesService.getContractVariable(id);
      if (!existing) {
        res.status(404).json({ message: 'متغیر یافت نشد' });
        return;
      }

      const deleted = await contractVariablesService.deleteContractVariable(id);

      if (deleted) {
        res.json({ message: 'متغیر با موفقیت حذف شد' });
      } else {
        res.status(500).json({ message: 'خطا در حذف متغیر' });
      }
    } catch (error) {
      console.error('Delete contract variable error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * POST /api/admin/contract-variables/:id/toggle - Toggle variable status
   */
  async toggleVariableStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      const updatedVariable = await contractVariablesService.toggleVariableStatus(id);

      if (updatedVariable) {
        res.json({ 
          message: 'وضعیت متغیر با موفقیت تغییر کرد',
          variable: updatedVariable 
        });
      } else {
        res.status(404).json({ message: 'متغیر یافت نشد' });
      }
    } catch (error) {
      console.error('Toggle variable status error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * GET /api/admin/contract-variables/category/:category - Get variables by category
   */
  async getVariablesByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const category = req.params.category;
      const variables = await contractVariablesService.getVariablesByCategory(category);
      res.json({ variables });
    } catch (error) {
      console.error('Get variables by category error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  // Employee Bale Settings endpoints

  /**
   * GET /api/admin/employee-bale-settings - Get all employee bale settings
   */
  async getEmployeeBaleSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employeesWithSettings = await employeeBaleSettingsService.getEmployeesWithBaleSettings();
      const availableEmployees = await employeeBaleSettingsService.getAvailableEmployees();
      const stats = await employeeBaleSettingsService.getBaleSettingsStats();

      res.json({ 
        employeesWithSettings,
        availableEmployees,
        stats
      });
    } catch (error) {
      console.error('Get employee bale settings error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * POST /api/admin/employee-bale-settings - Create/update employee bale settings
   */
  async upsertEmployeeBaleSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        employeeId,
        baleChatId,
        baleUserId,
        isActive = true,
        notificationsEnabled = true,
        departmentFilter = []
      } = req.body;

      if (!employeeId) {
        res.status(400).json({ message: 'شناسه کارمند الزامی است' });
        return;
      }

      const settings = await employeeBaleSettingsService.upsertEmployeeBaleSettings(
        employeeId,
        {
          baleChatId,
          baleUserId,
          isActive,
          notificationsEnabled,
          departmentFilter
        },
        req.user.userId
      );

      res.json({ 
        message: 'تنظیمات بله کارمند با موفقیت ذخیره شد',
        settings 
      });
    } catch (error) {
      console.error('Upsert employee bale settings error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * DELETE /api/admin/employee-bale-settings/:employeeId - Delete employee bale settings
   */
  async deleteEmployeeBaleSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);

      const deleted = await employeeBaleSettingsService.deleteEmployeeBaleSettings(employeeId);

      if (deleted) {
        res.json({ message: 'تنظیمات بله کارمند حذف شد' });
      } else {
        res.status(404).json({ message: 'تنظیمات بله برای این کارمند یافت نشد' });
      }
    } catch (error) {
      console.error('Delete employee bale settings error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * POST /api/admin/employee-bale-settings/:employeeId/toggle-status - Toggle employee bale status
   */
  async toggleEmployeeStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);

      const updatedSettings = await employeeBaleSettingsService.toggleEmployeeStatus(employeeId);

      if (updatedSettings) {
        res.json({ 
          message: 'وضعیت بله کارمند تغییر کرد',
          settings: updatedSettings 
        });
      } else {
        res.status(404).json({ message: 'تنظیمات بله برای این کارمند یافت نشد' });
      }
    } catch (error) {
      console.error('Toggle employee status error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }

  /**
   * POST /api/admin/employee-bale-settings/:employeeId/toggle-notifications - Toggle notifications
   */
  async toggleNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);

      const updatedSettings = await employeeBaleSettingsService.toggleNotifications(employeeId);

      if (updatedSettings) {
        res.json({ 
          message: 'تنظیمات اعلان‌رسانی تغییر کرد',
          settings: updatedSettings 
        });
      } else {
        res.status(404).json({ message: 'تنظیمات بله برای این کارمند یافت نشد' });
      }
    } catch (error) {
      console.error('Toggle notifications error:', error);
      res.status(500).json({ message: 'خطای سیستم' });
    }
  }
}

export const adminManagementController = new AdminManagementController();
