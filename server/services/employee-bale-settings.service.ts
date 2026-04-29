import { storage } from '../storage';
import { EmployeeBaleSettings, InsertEmployeeBaleSettings } from '../../shared/schema';

export class EmployeeBaleSettingsService {
  /**
   * Get all employee bale settings
   */
  async getEmployeeBaleSettings(): Promise<EmployeeBaleSettings[]> {
    return await storage.getEmployeeBaleSettings();
  }

  /**
   * Get employee bale settings by employee ID
   */
  async getEmployeeBaleSettingsByEmployee(employeeId: number): Promise<EmployeeBaleSettings | null> {
    return await storage.getEmployeeBaleSettingsByEmployee(employeeId);
  }

  /**
   * Get employee bale settings by chat ID
   */
  async getEmployeeBaleSettingsByChatId(baleChatId: string): Promise<EmployeeBaleSettings | null> {
    return await storage.getEmployeeBaleSettingsByChatId(baleChatId);
  }

  /**
   * Create or update employee bale settings
   */
  async upsertEmployeeBaleSettings(
    employeeId: number, 
    data: {
      baleChatId?: string;
      baleUserId?: string;
      isActive?: boolean;
      notificationsEnabled?: boolean;
      departmentFilter?: string[];
    },
    userId: number
  ): Promise<EmployeeBaleSettings> {
    const existing = await this.getEmployeeBaleSettingsByEmployee(employeeId);
    
    if (existing) {
      // Update existing settings
      const updateData = {
        ...data,
        departmentFilter: data.departmentFilter ? JSON.stringify(data.departmentFilter) : existing.departmentFilter,
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return await storage.updateEmployeeBaleSettings(existing.id, updateData);
    } else {
      // Create new settings
      const insertData: Omit<InsertEmployeeBaleSettings, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId,
        baleChatId: data.baleChatId || null,
        baleUserId: data.baleUserId || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : true,
        departmentFilter: data.departmentFilter ? JSON.stringify(data.departmentFilter) : null,
        lastActivity: new Date().toISOString(),
        createdBy: userId
      };

      return await storage.createEmployeeBaleSettings(insertData);
    }
  }

  /**
   * Delete employee bale settings
   */
  async deleteEmployeeBaleSettings(employeeId: number): Promise<boolean> {
    const settings = await this.getEmployeeBaleSettingsByEmployee(employeeId);
    if (!settings) return false;
    
    return await storage.deleteEmployeeBaleSettings(settings.id);
  }

  /**
   * Get employees with bale settings
   */
  async getEmployeesWithBaleSettings(): Promise<Array<{
    employee: any;
    baleSettings: EmployeeBaleSettings;
  }>> {
    const settings = await this.getEmployeeBaleSettings();
    const result = [];

    for (const setting of settings) {
      const employee = await storage.getUser(setting.employeeId);
      if (employee) {
        result.push({
          employee: {
            id: employee.id,
            username: employee.username,
            fullName: employee.fullName,
            role: employee.role,
            department: employee.department
          },
          baleSettings: setting
        });
      }
    }

    return result;
  }

  /**
   * Get available employees (without bale settings)
   */
  async getAvailableEmployees(): Promise<Array<{
    id: number;
    username: string;
    fullName: string;
    department: string | null;
  }>> {
    const allEmployees = await storage.getEmployees();
    const employeesWithSettings = await this.getEmployeeBaleSettings();
    const employeeIdsWithSettings = new Set(employeesWithSettings.map(s => s.employeeId));

    return allEmployees
      .filter(emp => !employeeIdsWithSettings.has(emp.id))
      .map(emp => ({
        id: emp.id,
        username: emp.username,
        fullName: emp.fullName,
        department: emp.department
      }));
  }

  /**
   * Update last activity for employee
   */
  async updateLastActivity(employeeId: number): Promise<void> {
    const settings = await this.getEmployeeBaleSettingsByEmployee(employeeId);
    if (settings) {
      await storage.updateEmployeeBaleSettings(settings.id, {
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle employee bale status
   */
  async toggleEmployeeStatus(employeeId: number): Promise<EmployeeBaleSettings | null> {
    const settings = await this.getEmployeeBaleSettingsByEmployee(employeeId);
    if (!settings) return null;

    return await storage.updateEmployeeBaleSettings(settings.id, {
      isActive: !settings.isActive,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Toggle notifications for employee
   */
  async toggleNotifications(employeeId: number): Promise<EmployeeBaleSettings | null> {
    const settings = await this.getEmployeeBaleSettingsByEmployee(employeeId);
    if (!settings) return null;

    return await storage.updateEmployeeBaleSettings(settings.id, {
      notificationsEnabled: !settings.notificationsEnabled,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Get bale settings statistics
   */
  async getBaleSettingsStats(): Promise<{
    totalEmployees: number;
    employeesWithBale: number;
    activeConnections: number;
    byDepartment: Record<string, number>;
  }> {
    const allEmployees = await storage.getEmployees();
    const baleSettings = await this.getEmployeeBaleSettings();
    
    const stats = {
      totalEmployees: allEmployees.length,
      employeesWithBale: baleSettings.length,
      activeConnections: baleSettings.filter(s => s.isActive && s.baleChatId).length,
      byDepartment: {} as Record<string, number>
    };

    // Count by department
    for (const setting of baleSettings) {
      const employee = await storage.getUser(setting.employeeId);
      if (employee?.department) {
        const dept = employee.department;
        stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
      }
    }

    return stats;
  }
}

export const employeeBaleSettingsService = new EmployeeBaleSettingsService();
