import { db } from "./db";
import { z } from "zod";
import { logger, PerformanceTimer, ErrorCategory } from './utils/logger';
import { cacheService } from "./services/cache.service";
import { executeBatch, executeWithRetry } from "./utils/transaction";
import {
  type User,
  type SafeUser,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Document,
  type InsertDocument,
  type SystemSetting,
  type InsertSystemSetting,
  type DocumentRequirement,
  type FormSubmission,
  type InsertFormSubmission,
  type ContractTemplate,
  type InsertContractTemplate,
  type AuditLog,
  type UserCompany,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ContractFormData,
  type InsertContractFormData,
  type Department,
  type AuthorizedPhone,
  type BaleUser,
  type BaleConversation,
  type BaleMessage,
  type ContractVariable,
  type EmployeeBaleSettings,
  type InsertContractVariable,
  type InsertEmployeeBaleSettings,
  insertDepartmentSchema,
  insertAuthorizedPhoneSchema,
  insertBaleUserSchema,
  insertBaleConversationSchema,
  insertBaleMessageSchema,
} from "../shared/schema";

// Type definitions for missing Insert types
type InsertDocumentRequirement = Omit<DocumentRequirement, 'id' | 'createdAt' | 'updatedAt'>;
type InsertAuditLog = Omit<AuditLog, 'id' | 'createdAt'>;
type InsertUserCompany = Omit<UserCompany, 'id' | 'createdAt'>;
type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
type InsertAuthorizedPhone = z.infer<typeof insertAuthorizedPhoneSchema>;
type InsertBaleUser = z.infer<typeof insertBaleUserSchema>;
type InsertBaleConversation = z.infer<typeof insertBaleConversationSchema>;
type InsertBaleMessage = z.infer<typeof insertBaleMessageSchema>;

export interface IStorage {
  // User management
  getUser(id: number): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<SafeUser | undefined>;
  getUserByUsernameWithPassword(username: string): Promise<User | undefined>;
  getUserByNationalId(nationalId: string): Promise<SafeUser | undefined>;
  createUser(user: InsertUser): Promise<SafeUser>;
  getAllUsers(): Promise<SafeUser[]>;
  updateUser(id: number, user: Partial<User>): Promise<SafeUser | undefined>;
  updateUserProfile(id: number, profile: { fullName: string; email: string | null; profileImage?: string | null }): Promise<SafeUser | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getEmployeesForDropdown(): Promise<{ id: number; username: string; fullName: string; department: string; role: string; }[]>;
  
  // Company management
  getCompanies(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    department?: string;
    userId?: number;
  }): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByNationalId(nationalId: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined>;
  updateCompanyInfo(id: number, infoType: 'teamInfo' | 'productInfo' | 'marketInfo' | 'financialInfo' | 'signatories', data: any): Promise<Company | undefined>;
  associateUserWithCompany(userId: number, companyId: number, isOwner?: boolean): Promise<UserCompany>;
  userHasAccessToCompany(userId: number, companyId: number): Promise<boolean>;
  deleteCompany(id: number): Promise<boolean>;
  
  // Document management
  getDocumentsByCompany(companyId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByIds(ids: number[]): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Conversation and message management
  getConversations(userId: number, userRole: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByCompanyId(companyId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateConversation(id: number, updateData: Partial<Conversation>): Promise<Conversation | undefined>;
  
  // Document requirements
  getDocumentRequirements(department?: string): Promise<DocumentRequirement[]>;
  getDocumentRequirement(id: number): Promise<DocumentRequirement | undefined>;
  getDocumentRequirementsByIds(ids: number[]): Promise<DocumentRequirement[]>;
  createDocumentRequirement(requirement: Omit<DocumentRequirement, 'id' | 'createdAt'>): Promise<DocumentRequirement>;
  updateDocumentRequirement(id: number, requirement: Partial<Omit<DocumentRequirement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DocumentRequirement | undefined>;
  deleteDocumentRequirement(id: number): Promise<boolean>;
  
  // Audit logs
  createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  
  // Form submissions
  getFormSubmissions(filters: {
    companyId?: number;
    requirementId?: number;
    userId?: number;
    status?: string;
  }): Promise<FormSubmission[]>;
  getFormSubmission(id: number): Promise<FormSubmission | undefined>;
  createFormSubmission(submission: Omit<FormSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormSubmission>;
  updateFormSubmission(id: number, updates: Partial<FormSubmission>): Promise<FormSubmission | undefined>;
  deleteFormSubmission(id: number): Promise<boolean>;
  
  // Contract templates
  getContractTemplates(): Promise<ContractTemplate[]>;
  getContractTemplate(id: number): Promise<ContractTemplate | undefined>;
  createContractTemplate(template: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractTemplate>;
  updateContractTemplate(id: number, updates: Partial<ContractTemplate>): Promise<ContractTemplate | undefined>;
  deleteContractTemplate(id: number): Promise<boolean>;
  
  // Contract Form Data methods
  getContractFormData(companyId: number, templateId: number): Promise<ContractFormData | undefined>;
  getContractFormDataByCompany(companyId: number): Promise<ContractFormData[]>;
  createContractFormData(data: Omit<ContractFormData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractFormData>;
  updateContractFormData(id: number, updates: Partial<ContractFormData>): Promise<ContractFormData | undefined>;
  deleteContractFormData(id: number): Promise<boolean>;
  
  // System stats
  getSystemStats(): Promise<{
    totalUsers: number;
    totalCompanies: number;
    totalDocuments: number;
    newDocuments: number;
    pendingCompanies: number;
    activeConversations: number;
  }>;

  // Bale Chat System Methods
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(name: string, slug: string): Promise<Department>;
  getDepartmentBySlug(slug: string): Promise<Department | undefined>;
  getAllDepartments(): Promise<Department[]>;
  
  getAuthorizedPhones(): Promise<AuthorizedPhone[]>;
  getAllAuthorizedPhones(): Promise<AuthorizedPhone[]>;
  getAuthorizedPhoneByNumber(phoneNumber: string): Promise<AuthorizedPhone[]>;
  getAuthorizedPhonesByDepartment(departmentId: number): Promise<AuthorizedPhone[]>;
  addAuthorizedPhone(phoneNumber: string, employeeName: string, departmentId: number): Promise<AuthorizedPhone>;
  
  createBaleUser(user: InsertBaleUser): Promise<BaleUser>;
  getBaleUserByChatId(chatId: string): Promise<BaleUser | undefined>;
  getBaleUserByPhoneNumber(phoneNumber: string): Promise<BaleUser | undefined>;
  updateBaleUser(id: number, updates: Partial<BaleUser>): Promise<BaleUser | undefined>;
  
  createBaleConversation(conversation: InsertBaleConversation): Promise<BaleConversation>;
  getBaleConversation(id: number): Promise<BaleConversation | undefined>;
  getBaleConversationsByDepartment(departmentId: number): Promise<BaleConversation[]>;
  updateBaleConversation(id: number, updates: Partial<BaleConversation>): Promise<BaleConversation | undefined>;
  
  createBaleMessage(message: InsertBaleMessage): Promise<BaleMessage>;
  getBaleMessagesByConversation(conversationId: number): Promise<BaleMessage[]>;
  updateBaleMessageDelivery(id: number, isDelivered: boolean): Promise<void>;
  
  // System Settings Methods
  getAllSystemSettings(): Promise<SystemSetting[]>;
  getSystemSettingsByCategory(category: string): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: string, updatedBy?: number): Promise<boolean>;
  deleteSystemSetting(key: string): Promise<boolean>;

  // Financial Formulas Methods
  getFinancialFormulas(): Promise<any[]>;
  getFinancialFormula(id: number): Promise<any | undefined>;
  getFormulaDependencies(formulaId: number): Promise<number[]>;
  getInvestmentReportVariables(filters?: { category?: string; source?: string }): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<SafeUser | undefined> {
    const cacheKey = `user:${id}`;
    
    return cacheService.getOrSet(
      cacheKey, 
      async () => {
        const result = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
        const row = result.rows[0] as any;
        if (!row) return undefined;
        
        return {
          id: row.id,
          username: row.username,
          role: row.role,
          department: row.department,
          fullName: row.full_name,
          nationalId: row.national_id,
          email: row.email,
          phone: row.phone,
          profileImage: row.profile_image,
          isActive: Boolean(row.is_active),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as SafeUser;
      },
      300, // Cache for 5 minutes
      [`user:${id}`, 'users'] // Tags for invalidation
    );
  }

  async getUserByUsernameWithPassword(username: string): Promise<User | undefined> {
    const result = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      department: row.department,
      fullName: row.full_name,
      nationalId: row.national_id,
      email: row.email,
      phone: row.phone,
      profileImage: row.profile_image,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as User;
  }

  async getUserByUsername(username: string): Promise<SafeUser | undefined> {
    const result = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
    const row = result.rows[0] as any;
    if (!row) return undefined;

    return {
      id: row.id,
      username: row.username,
      role: row.role,
      department: row.department,
      fullName: row.full_name,
      nationalId: row.national_id,
      email: row.email,
      phone: row.phone,
      profileImage: row.profile_image,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as SafeUser;
  }

  async getUserByPhone(phone: string): Promise<SafeUser | undefined> {
    const result = await db.execute("SELECT * FROM users WHERE phone = ?", [phone]);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      username: row.username,
      role: row.role,
      department: row.department,
      fullName: row.full_name,
      nationalId: row.national_id,
      email: row.email,
      phone: row.phone,
      profileImage: row.profile_image,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as SafeUser;
  }

  async getUserByNationalId(nationalId: string): Promise<SafeUser | undefined> {
    const result = await db.execute("SELECT * FROM users WHERE national_id = ?", [nationalId]);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      username: row.username,
      role: row.role,
      department: row.department,
      fullName: row.full_name,
      nationalId: row.national_id,
      email: row.email,
      phone: row.phone,
      profileImage: row.profile_image,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as SafeUser;
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO users (username, password, role, full_name, national_id, email, phone, department, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        insertUser.username, 
        insertUser.password, 
        insertUser.role, 
        insertUser.fullName || '', 
        insertUser.nationalId ?? null, 
        insertUser.email ?? null, 
        insertUser.phone ?? null, 
        (insertUser.department ?? null) as any,  // type assertion برای رفع خطا
        insertUser.isActive !== false ? true : false,
        now, 
        now
      ]
    );
    return result.rows[0] as unknown as SafeUser;
  }

  async updateUserProfile(id: number, profile: { fullName: string; email: string | null; profileImage?: string | null }): Promise<SafeUser | undefined> {
    const now = new Date().toISOString();
    
    const updateQuery = profile.profileImage !== undefined
      ? `UPDATE users SET full_name = ?, email = ?, profile_image = ?, updated_at = ? WHERE id = ? RETURNING *`
      : `UPDATE users SET full_name = ?, email = ?, updated_at = ? WHERE id = ? RETURNING *`;
    
    const params = profile.profileImage !== undefined
      ? [profile.fullName, profile.email, profile.profileImage, now, id]
      : [profile.fullName, profile.email, now, id];
    
    const result = await db.execute(updateQuery, params);
    
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    // Invalidate cache for this user
    cacheService.delete(`user:${id}`);
    
    return {
      id: row.id,
      username: row.username,
      role: row.role,
      department: row.department,
      fullName: row.full_name,
      nationalId: row.national_id,
      email: row.email,
      phone: row.phone,
      profileImage: row.profile_image,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as SafeUser;
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const result = await db.execute("SELECT * FROM users ORDER BY created_at DESC");
    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      department: row.department,
      fullName: row.full_name,
      nationalId: row.national_id,
      email: row.email,
      phone: row.phone,
      profileImage: row.profile_image,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as User));
  }

  async getEmployeesForDropdown(): Promise<{ id: number; username: string; fullName: string; department: string; role: string; }[]> {
    const result = await db.execute(
      "SELECT id, username, full_name, department, role FROM users WHERE role IN ('admin', 'employee', 'ceo') AND is_active = true ORDER BY full_name ASC"
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      department: row.department || 'سایر',
      role: row.role,
    }));
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<SafeUser | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    if (updateData.username) { fields.push('username = ?'); values.push(updateData.username); }
    if (updateData.password) { fields.push('password = ?'); values.push(updateData.password); }
    if (updateData.role) { fields.push('role = ?'); values.push(updateData.role); }
    if (updateData.fullName) { fields.push('full_name = ?'); values.push(updateData.fullName); }
    if (updateData.email !== undefined) { fields.push('email = ?'); values.push(updateData.email); }
    if (updateData.phone !== undefined) { fields.push('phone = ?'); values.push(updateData.phone); }
    if (updateData.department !== undefined) { fields.push('department = ?'); values.push(updateData.department); }
    if (updateData.isActive !== undefined) { fields.push('is_active = ?'); values.push(updateData.isActive ? true : false); }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    
    // Invalidate user cache
    cacheService.delete(`user:${id}`);
    cacheService.invalidateByTag(`user:${id}`);
    cacheService.invalidateByTag('users'); // Invalidate users list cache
    
    return result.rows[0] as unknown as SafeUser | undefined;
  }

  /**
   * Get companies with related statistics (optimized)
   * Uses single query with aggregations instead of N+1
   */
  async getCompaniesWithStats(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    department?: string;
    userId?: number;
  }): Promise<{companies: any[], total: number}> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          c.*,
          COUNT(DISTINCT d.id) as document_count,
          COUNT(DISTINCT sr.id) as service_request_count,
          MAX(d.created_at) as last_document_upload
        FROM companies c
        LEFT JOIN documents d ON c.id = d.company_id
        LEFT JOIN service_requests sr ON c.id = sr.company_id
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (filters.userId) {
        conditions.push(`c.id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`);
        params.push(filters.userId);
      }

      if (filters.status) {
        conditions.push(`c.status = ?`);
        params.push(filters.status);
      }

      if (filters.search) {
        conditions.push(`(c.name LIKE ? OR c.national_id LIKE ?)`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.department) {
        conditions.push(`c.primary_unit = ?`);
        params.push(filters.department);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

      // Get total count
      const countResult = await db.execute(
        query.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT c.id) as total FROM'),
        params
      );
      const total = (countResult.rows[0] as any).total || 0;

      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await db.execute(query, params);

      const companies = result.rows.map((row: any) => ({
        id: row.id,
        nationalId: row.national_id,
        name: row.name,
        type: row.type,
        status: row.status,
        primaryUnit: row.primary_unit,
        registrationNumber: row.registration_number,
        registrationDate: row.registration_date,
        capital: row.capital,
        address: row.address,
        city: row.city,
        phone: row.phone,
        email: row.email,
        website: row.website,
        description: row.description,
        establishedYear: row.established_year,
        employeeCount: row.employee_count,
        teamInfo: row.team_info,
        productInfo: row.product_info,
        marketInfo: row.market_info,
        financialInfo: row.financial_info,
        rasmioData: row.rasmio_data,
        aiAnalysisData: row.ai_analysis_data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Statistics from aggregation
        documentCount: row.document_count || 0,
        serviceRequestCount: row.service_request_count || 0,
        lastDocumentUpload: row.last_document_upload,
      }));

      return { companies, total };
    } catch (error) {
      logger.error("Failed to get companies with stats", "storage", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getCompanies(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    department?: string;
    userId?: number;
  }): Promise<Company[]> {
    let query = "SELECT * FROM companies";
    const conditions = [];
    const values = [];
    
    if (filters.status && filters.status !== 'all') {
      conditions.push("status = ?");
      values.push(filters.status);
    }
    
    if (filters.search && filters.search.trim() !== '') {
      conditions.push("(name LIKE ? OR national_id LIKE ?)");
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    if (filters.department && filters.department !== 'all') {
      conditions.push("primary_unit = ?");
      values.push(filters.department as any);
    }
    
    if (filters.userId) {
      const userCompaniesResult = await db.execute(
        "SELECT company_id FROM user_companies WHERE user_id = ?", 
        [filters.userId]
      );
      
      if (userCompaniesResult.rows.length > 0) {
        const companyIds = userCompaniesResult.rows.map((row: any) => row.company_id);
        conditions.push(`id IN (${companyIds.map(() => '?').join(', ')})`);
        values.push(...companyIds);
      } else {
        return [];
      }
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY created_at DESC";
    
    if (filters.limit) {
      query += " LIMIT ?";
      values.push(filters.limit);
      if (filters.page) {
        query += " OFFSET ?";
        values.push((filters.page - 1) * filters.limit);
      }
    }
    
    const result = await db.execute(query, values);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      nationalId: row.national_id,
      name: row.name,
      type: row.type,
      status: row.status,
      primaryUnit: row.primary_unit,
      registrationNumber: row.registration_number,
      registrationDate: row.registration_date,
      capital: row.capital,
      address: row.address,
      city: row.city,
      phone: row.phone,
      email: row.email,
      website: row.website,
      description: row.description,
      establishedYear: row.established_year,
      employeeCount: row.employee_count,
      teamInfo: row.team_info,
      productInfo: row.product_info,
      marketInfo: row.market_info,
      financialInfo: row.financial_info,
      rasmioData: row.rasmio_data,
      aiAnalysisData: row.ai_analysis_data,
      financialSummaryData: row.financial_summary_data,
      taxDeclarationDocumentId: row.tax_declaration_document_id,
      financialSummaryStatus: row.financial_summary_status,
      financialSummaryLastUpdated: row.financial_summary_last_updated,
      financialSummaryError: row.financial_summary_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as Company[];
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const result = await db.execute("SELECT * FROM companies WHERE id = ?", [id]);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    // Convert snake_case to camelCase
    return {
      id: row.id,
      nationalId: row.national_id,
      name: row.name,
      type: row.type,
      status: row.status,
      primaryUnit: row.primary_unit,
      registrationNumber: row.registration_number,
      registrationDate: row.registration_date,
      capital: row.capital,
      address: row.address,
      city: row.city,
      phone: row.phone,
      email: row.email,
      website: row.website,
      description: row.description,
      establishedYear: row.established_year,
      employeeCount: row.employee_count,
      teamInfo: row.team_info,
      productInfo: row.product_info,
      marketInfo: row.market_info,
      financialInfo: row.financial_info,
      rasmioData: row.rasmio_data,
      aiAnalysisData: row.ai_analysis_data,
      financialSummaryData: row.financial_summary_data,
      taxDeclarationDocumentId: row.tax_declaration_document_id,
      financialSummaryStatus: row.financial_summary_status,
      financialSummaryLastUpdated: row.financial_summary_last_updated,
      financialSummaryError: row.financial_summary_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Company;
  }

  async getCompanyByNationalId(nationalId: string): Promise<Company | undefined> {
    const result = await db.execute("SELECT * FROM companies WHERE national_id = ?", [nationalId]);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    // Convert snake_case to camelCase
    return {
      id: row.id,
      nationalId: row.national_id,
      name: row.name,
      type: row.type,
      status: row.status,
      primaryUnit: row.primary_unit,
      registrationNumber: row.registration_number,
      registrationDate: row.registration_date,
      capital: row.capital,
      address: row.address,
      city: row.city,
      phone: row.phone,
      email: row.email,
      website: row.website,
      description: row.description,
      establishedYear: row.established_year,
      employeeCount: row.employee_count,
      teamInfo: row.team_info,
      productInfo: row.product_info,
      marketInfo: row.market_info,
      financialInfo: row.financial_info,
      rasmioData: row.rasmio_data,
      aiAnalysisData: row.ai_analysis_data,
      financialSummaryData: row.financial_summary_data,
      taxDeclarationDocumentId: row.tax_declaration_document_id,
      financialSummaryStatus: row.financial_summary_status,
      financialSummaryLastUpdated: row.financial_summary_last_updated,
      financialSummaryError: row.financial_summary_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Company;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const now = new Date().toISOString();
    
    // Helper function to safely stringify JSON fields or return null
    const safeStringify = (value: any): string | null => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    };
    
    // Helper function to return null for undefined values  
    const safeValue = (value: any): string | number | null => value === undefined || value === null ? null : value;
    
    const result = await db.execute(
      `INSERT INTO companies (national_id, name, type, status, primary_unit, registration_number, registration_date, 
       capital, address, city, phone, email, website, description, established_year, employee_count, 
       team_info, product_info, market_info, financial_info, rasmio_data, ai_analysis_data, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        insertCompany.nationalId, 
        insertCompany.name, 
        insertCompany.type, 
        insertCompany.status || 'pending',
        safeValue(insertCompany.primaryUnit) as any, 
        safeValue(insertCompany.registrationNumber) as any, 
        safeValue(insertCompany.registrationDate) as any,
        safeValue(insertCompany.capital) as any, 
        safeValue(insertCompany.address) as any, 
        safeValue(insertCompany.city) as any, 
        safeValue(insertCompany.phone) as any,
        safeValue(insertCompany.email) as any, 
        safeValue(insertCompany.website) as any, 
        safeValue(insertCompany.description) as any, 
        safeValue(insertCompany.establishedYear) as any,
        safeValue(insertCompany.employeeCount) as any, 
        safeStringify(insertCompany.teamInfo) as any, 
        safeStringify(insertCompany.productInfo) as any, 
        safeStringify(insertCompany.marketInfo) as any,
        safeStringify(insertCompany.financialInfo) as any, 
        safeStringify(insertCompany.rasmioData) as any, 
        safeStringify(insertCompany.aiAnalysisData) as any, 
        now, 
        now
      ]
    );
    return result.rows[0] as unknown as Company;
  }

  async updateCompany(id: number, updateData: Partial<Company>): Promise<Company | undefined> {
    try {
      const now = new Date().toISOString();
      const fields = [];
      const values = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
        
        // Handle camelCase to snake_case conversion
        switch (key) {
          case 'nationalId':
            fields.push('national_id = ?');
            values.push(value || null);
            break;
          case 'primaryUnit':
            fields.push('primary_unit = ?');
            values.push(value || null);
            break;
          case 'registrationNumber':
            fields.push('registration_number = ?');
            values.push(value || null);
            break;
          case 'registrationDate':
            fields.push('registration_date = ?');
            values.push(value || null);
            break;
          case 'establishedYear':
            fields.push('established_year = ?');
            values.push(value || null);
            break;
          case 'employeeCount':
            fields.push('employee_count = ?');
            values.push(value || null);
            break;
          case 'teamInfo':
            fields.push('team_info = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'productInfo':
            fields.push('product_info = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'marketInfo':
            fields.push('market_info = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'financialInfo':
            fields.push('financial_info = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'rasmioData':
            fields.push('rasmio_data = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'aiAnalysisData':
            fields.push('ai_analysis_data = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'financialSummaryData':
            fields.push('financial_summary_data = ?');
            values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            break;
          case 'taxDeclarationDocumentId':
            fields.push('tax_declaration_document_id = ?');
            values.push(value || null);
            break;
          case 'financialSummaryStatus':
            fields.push('financial_summary_status = ?');
            values.push(value || null);
            break;
          case 'financialSummaryLastUpdated':
            fields.push('financial_summary_last_updated = ?');
            values.push(value || null);
            break;
          case 'financialSummaryError':
            fields.push('financial_summary_error = ?');
            values.push(value || null);
            break;
          default:
            // For simple fields like name, type, status, etc.
            fields.push(`${key} = ?`);
            values.push(value || null);
            break;
        }
      });
      
      if (fields.length === 0) {
        return this.getCompany(id);
      }
      
      fields.push('updated_at = ?');
      values.push(now);
      values.push(id);
      
      await db.execute(
        `UPDATE companies SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      // Invalidate cache for this company
      cacheService.delete(`company:${id}`);
      cacheService.invalidateByTag(`company:${id}`);
      cacheService.invalidateByPattern('companies:*'); // Invalidate list caches
      
      return this.getCompany(id);
    } catch (error) {
      logger.error(
        'خطا در به‌روزرسانی شرکت',
        'storage',
        error instanceof Error ? error : new Error(String(error)),
        ErrorCategory.DATABASE,
        { companyId: id }
      );
      throw error;
    }
  }

  async updateCompanyInfo(id: number, infoType: 'teamInfo' | 'productInfo' | 'marketInfo' | 'financialInfo' | 'signatories', data: any): Promise<Company | undefined> {
    try {
      const now = new Date().toISOString();
      const columnMap = {
        teamInfo: 'team_info',
        productInfo: 'product_info', 
        marketInfo: 'market_info',
        financialInfo: 'financial_info',
        signatories: 'signatories'
      };
      
      await db.execute(
        `UPDATE companies SET ${columnMap[infoType]} = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(data), now, id]
      );
      
      // بازگرداندن شرکت بروزرسانی شده
      return this.getCompany(id);
    } catch (error) {
      logger.error(
        'خطا در به‌روزرسانی اطلاعات شرکت',
        'storage',
        error instanceof Error ? error : new Error(String(error)),
        ErrorCategory.DATABASE,
        { companyId: id, infoType }
      );
      throw error;
    }
  }

  async associateUserWithCompany(userId: number, companyId: number, isOwner = false): Promise<UserCompany> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO user_companies (user_id, company_id, is_owner, created_at) 
       VALUES (?, ?, ?, ?) RETURNING *`,
      [userId, companyId, isOwner ? true : false, now]
    );
    return result.rows[0] as unknown as UserCompany;
  }

  async userHasAccessToCompany(userId: number, companyId: number): Promise<boolean> {
    const result = await db.execute(
      "SELECT COUNT(*) as count FROM user_companies WHERE user_id = ? AND company_id = ?",
      [userId, companyId]
    );
    return (result.rows[0] as any).count > 0;
  }

  async getUserCompanies(userId: number): Promise<Array<{ companyId: number; isOwner: boolean }>> {
    const result = await db.execute(
      "SELECT company_id, is_owner FROM user_companies WHERE user_id = ?",
      [userId]
    );
    return result.rows.map((row: any) => ({
      companyId: row.company_id,
      isOwner: Boolean(row.is_owner)
    }));
  }

  /**
   * Get all documents with company and user info (optimized with JOIN)
   * Replaces N+1 queries with a single JOIN query
   */
  async getAllDocumentsOptimized(filters?: {
    userId?: number;
    role?: string;
  }): Promise<Document[]> {
    try {
      let query = `
        SELECT 
          d.*,
          c.name as company_name,
          u.full_name as uploader_name
        FROM documents d
        LEFT JOIN companies c ON d.company_id = c.id
        LEFT JOIN users u ON d.uploaded_by_id = u.id
      `;
      
      const params: any[] = [];
      
      // If customer, only show their company documents
      if (filters?.userId && filters?.role === 'customer') {
        query += `
          WHERE d.company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = ?
          )
        `;
        params.push(filters.userId);
      }
      
      query += ` ORDER BY d.created_at DESC`;
      
      const result = await db.execute(query, params);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        uploadedById: row.uploaded_by_id,
        filename: row.filename,
        originalName: row.original_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        category: row.category,
        description: row.description,
        status: row.status,
        filePath: row.file_path,
        version: row.version,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Additional info from JOIN
        companyName: row.company_name,
        uploaderName: row.uploader_name,
      })) as Document[];
    } catch (error) {
      logger.error("Failed to get all documents", "storage", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Helper to map database row to Document type
   */
  private mapRowToDocument(row: any): Document {
    if (!row) return null as any;
    return {
      id: row.id,
      companyId: row.company_id,
      uploadedById: row.uploaded_by_id,
      filename: row.filename,
      originalName: row.original_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      category: row.category,
      description: row.description,
      status: row.status,
      filePath: row.file_path,
      version: row.version,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Document;
  }

  async getDocumentsByCompany(companyId: number): Promise<Document[]> {
    const result = await db.execute(
      "SELECT * FROM documents WHERE company_id = ? ORDER BY created_at DESC",
      [companyId]
    );
    return result.rows.map((row: any) => this.mapRowToDocument(row));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const result = await db.execute("SELECT * FROM documents WHERE id = ?", [id]);
    const row = result.rows[0];
    if (!row) return undefined;
    return this.mapRowToDocument(row);
  }

  async getDocumentsByIds(ids: number[]): Promise<Document[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const result = await db.execute(
      `SELECT * FROM documents WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows.map((row: any) => this.mapRowToDocument(row));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO documents (company_id, uploaded_by_id, filename, original_name, file_size, mime_type, 
       category, description, status, file_path, version, metadata, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        insertDocument.companyId as any, 
        insertDocument.uploadedById as any, 
        insertDocument.filename as any, 
        insertDocument.originalName as any,
        insertDocument.fileSize as any, 
        insertDocument.mimeType as any, 
        insertDocument.category as any, 
        (insertDocument.description ?? null) as any,
        (insertDocument.status ?? 'pending') as any, 
        insertDocument.filePath as any, 
        (insertDocument.version ?? 1) as any,
        (insertDocument.metadata ?? null) as any, 
        now, 
        now
      ]
    );
    return this.mapRowToDocument(result.rows[0]);
  }

  async updateDocument(id: number, updateData: Partial<Document>): Promise<Document | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    Object.entries(updateData).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
      if (key === 'companyId') { fields.push('company_id = ?'); values.push(value); }
      else if (key === 'uploadedById') { fields.push('uploaded_by_id = ?'); values.push(value); }
      else if (key === 'originalName') { fields.push('original_name = ?'); values.push(value); }
      else if (key === 'fileSize') { fields.push('file_size = ?'); values.push(value); }
      else if (key === 'mimeType') { fields.push('mime_type = ?'); values.push(value); }
      else if (key === 'filePath') { fields.push('file_path = ?'); values.push(value); }
      else { fields.push(`${key} = ?`); values.push(value); }
    });
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    if (!result.rows[0]) return undefined;
    return this.mapRowToDocument(result.rows[0]);
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM documents WHERE id = ?", [id]);
    return (result.rowsAffected ?? 0) > 0;
  }

  async getConversations(userId: number, userRole: string): Promise<Conversation[]> {
    let query = "SELECT * FROM conversations";
    const values = [];
    
    if (userRole === 'customer') {
      // برای مشتری: فقط مکالمات شرکت‌های خودش
      query += ` WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = ?
      )`;
      values.push(userId);
    } else if (userRole === 'employee') {
      // برای کارمند: مکالمات تخصیص شده یا همه
      query += " WHERE employee_id = ? OR employee_id IS NULL";
      values.push(userId);
    }
    
    query += " ORDER BY last_message_at DESC";
    
    const result = await db.execute(query, values);
    return result.rows as unknown as Conversation[];
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const result = await db.execute("SELECT * FROM conversations WHERE id = ?", [id]);
    return result.rows[0] as unknown as Conversation | undefined;
  }

  async getConversationsByCompanyId(companyId: number): Promise<Conversation[]> {
    const result = await db.execute("SELECT * FROM conversations WHERE company_id = ? ORDER BY last_message_at DESC", [companyId]);
    return result.rows as unknown as Conversation[];
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO conversations (company_id, employee_id, subject, status, priority, category, department, last_message_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        insertConversation.companyId, 
        insertConversation.employeeId ?? null, 
        insertConversation.subject ?? null,
        insertConversation.status || 'active',
        insertConversation.priority || 'medium',
        insertConversation.category || 'general',
        insertConversation.department ?? null,
        now, 
        now, 
        now
      ] as any[]
    );
    return result.rows[0] as unknown as Conversation;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const result = await db.execute(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [conversationId]
    );
    return result.rows as unknown as Message[];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const now = new Date().toISOString();
    const attachmentPath = message.attachmentPath ?? null;
    const messageStatus = message.status ?? 'sent';
    const msgType = message.messageType ?? 'text';

    const result = await db.execute(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, attachment_path, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [message.conversationId, message.senderId, message.content,
       msgType, attachmentPath, messageStatus, now]
    );
    
    // به‌روزرسانی زمان آخرین پیام در مکالمه
    await db.execute(
      "UPDATE conversations SET last_message_at = ? WHERE id = ?",
      [now, message.conversationId]
    );
    
    return result.rows[0] as unknown as Message;
  }

  async getDocumentRequirements(department?: string): Promise<DocumentRequirement[]> {
    // DEPRECATED -> از متد جدید استفاده کنید
    return this.getAccessibleDocumentRequirements(undefined, department);
  }

  async getDocumentRequirement(id: number): Promise<DocumentRequirement | undefined> {
    const result = await db.execute(
      "SELECT * FROM document_requirements WHERE id = ? AND is_active = true",
      [id]
    );
    
    return result.rows[0] as unknown as DocumentRequirement | undefined;
  }

  /**
   * Batch loading method for multiple document requirements
   * Performance optimization: prevents N+1 query problem
   */
  async getDocumentRequirementsByIds(ids: number[]): Promise<DocumentRequirement[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    // Remove duplicates and filter invalid IDs
    const uniqueIds = Array.from(new Set(ids.filter(id => id > 0)));
    
    if (uniqueIds.length === 0) {
      return [];
    }

    // Create placeholders for SQL IN clause
    const placeholders = uniqueIds.map(() => '?').join(',');
    const query = `SELECT * FROM document_requirements WHERE id IN (${placeholders}) AND is_active = true`;
    
    const result = await db.execute(query, uniqueIds);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      department: row.department,
      category: row.category,
      description: row.description,
      fields: row.fields,
      isRequired: Boolean(row.is_required),
      order: row.order,
      isActive: Boolean(row.is_active),
      accessType: row.access_type,
      serviceId: row.service_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as DocumentRequirement[];
  }

  // NEW: دریافت فرم‌های قابل دسترس برای یک شرکت خاص (یا همه شرکت‌ها در حالت undefined)
  async getAccessibleDocumentRequirements(companyId?: number, department?: string): Promise<DocumentRequirement[]> {
    const conditions = ["dr.is_active = true"]; // dr = document_requirements alias
    const values: any[] = [];

    if (department && department !== 'all') {
      conditions.push("dr.department = ?");
      values.push(department);
    }

    // اگر companyId مشخص است، باید access_type را چک کنیم
    if (companyId) {
      // فرم‌هایی که access_type = 'all' یا در جدول دسترسی، companyId موجود است
      conditions.push(`(dr.access_type = 'all' OR dr.id IN (SELECT requirement_id FROM document_requirement_access WHERE company_id = ?))`);
      values.push(companyId as any);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT dr.* FROM document_requirements dr ${whereClause} ORDER BY dr."order"`;

    const result = await db.execute(query, values);
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      department: row.department,
      category: row.category,
      description: row.description,
      fields: row.fields,
      isRequired: Boolean(row.is_required),
      order: row.order,
      isActive: Boolean(row.is_active),
      accessType: row.access_type,
      serviceId: row.service_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as DocumentRequirement[];
  }

  async createDocumentRequirement(requirementData: Omit<DocumentRequirement, 'id' | 'createdAt' | 'updatedAt'> & { companyIds?: number[] }): Promise<DocumentRequirement> {
    const now = new Date().toISOString();
    
    // Ensure fields is properly stringified
    const fieldsData = typeof requirementData.fields === 'string' 
      ? requirementData.fields 
      : JSON.stringify(requirementData.fields || []);

    const result = await db.execute(
      `INSERT INTO document_requirements (title, department, category, description, fields, is_required, "order", is_active, access_type, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        requirementData.title,
        requirementData.department,
        requirementData.category ?? null,
        requirementData.description,
        fieldsData,
        requirementData.isRequired ? true : false,
        requirementData.order || 0,
        requirementData.isActive !== false ? true : false,
        (requirementData as any).accessType || 'all',
        (requirementData as any).createdBy || null,
        now,
        now,
      ]
    );
    const created = result.rows[0] as any;

    // اگر access_type = specific و companyIds ارسال شده، در جدول دسترسی درج کن
    if (((requirementData as any).accessType === 'specific') && Array.isArray((requirementData as any).companyIds) && (requirementData as any).companyIds.length > 0) {
      const companyIds = (requirementData as any).companyIds;
      const placeholders = companyIds.map(() => '(?, ?, ?)').join(', ');
      const values = companyIds.flatMap((cid: number) => [created.id, cid, now]);

      await db.execute(
        `INSERT INTO document_requirement_access (requirement_id, company_id, created_at) VALUES ${placeholders}`,
        values
      );
    }

    return {
      id: created.id,
      title: created.title,
      department: created.department,
      category: created.category,
      description: created.description,
      fields: created.fields,
      isRequired: Boolean(created.is_required),
      order: created.order,
      isActive: Boolean(created.is_active),
      accessType: created.access_type,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    } as DocumentRequirement;
  }

  async updateDocumentRequirement(id: number, requirementData: Partial<Omit<DocumentRequirement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DocumentRequirement | undefined> {
    const now = new Date().toISOString();
    
    // Ensure fields is properly stringified if provided
    if (requirementData.fields) {
      requirementData.fields = typeof requirementData.fields === 'string' 
        ? requirementData.fields 
        : JSON.stringify(requirementData.fields);
    }
    
    const fields = [];
    const values = [];
    
    // Only process known database columns
    const allowedFields = ['title', 'department', 'category', 'description', 'fields', 'isRequired', 'isActive', 'order', 'serviceId', 'createdBy', 'accessType'];
    
    Object.entries(requirementData).forEach(([key, value]) => {
      if (!allowedFields.includes(key)) {
        console.log(`⚠️ Skipping unknown field: ${key}`);
        return;
      }
      
      if (key === 'isRequired') { fields.push('is_required = ?'); values.push(value ? true : false); }
      else if (key === 'isActive') { fields.push('is_active = ?'); values.push(value ? true : false); }
      else if (key === 'order') { fields.push('"order" = ?'); values.push(value || 0); }
      else if (key === 'serviceId') { fields.push('service_id = ?'); values.push(value); }
      else if (key === 'createdBy') { fields.push('created_by = ?'); values.push(value); }
      else if (key === 'accessType') { fields.push('access_type = ?'); values.push(value); }
      else { fields.push(`${key} = ?`); values.push(value); }
    });
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE document_requirements SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    
    return result.rows[0] as unknown as DocumentRequirement | undefined;
  }

  async deleteDocumentRequirement(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM document_requirements WHERE id = ?", [id]);
    return (result as any).changes > 0;
  }

  async createAuditLog(logData: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [logData.userId, logData.action, logData.resource, logData.resourceId,
       logData.details ? JSON.stringify(logData.details) : null, logData.ipAddress, logData.userAgent, now]
    );
    return result.rows[0] as unknown as AuditLog;
  }

  async getAuditLogs(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    const result = await db.execute(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })) as AuditLog[];
  }

  async getFormSubmissions(filters: {
    companyId?: number;
    requirementId?: number;
    userId?: number;
    status?: string;
  }): Promise<FormSubmission[]> {
    let query = "SELECT * FROM form_submissions";
    const conditions = [];
    const values = [];
    
    if (filters.companyId) {
      conditions.push("company_id = ?");
      values.push(filters.companyId);
    }
    
    if (filters.requirementId) {
      conditions.push("requirement_id = ?");
      values.push(filters.requirementId);
    }
    
    if (filters.userId) {
      conditions.push("user_id = ?");
      values.push(filters.userId);
    }
    
    if (filters.status) {
      conditions.push("status = ?");
      values.push(filters.status);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY created_at DESC";
    
    const result = await db.execute(query, values);
    return result.rows.map((row: any) => ({
      id: row.id,
      requirementId: row.requirement_id,
      companyId: row.company_id,
      userId: row.user_id,
      formData: row.form_data,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as FormSubmission[];
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    const result = await db.execute("SELECT * FROM form_submissions WHERE id = ?", [id]);
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      requirementId: row.requirement_id,
      companyId: row.company_id,
      userId: row.user_id,
      formData: row.form_data,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as FormSubmission;
  }

  async createFormSubmission(submissionData: Omit<FormSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormSubmission> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO form_submissions (requirement_id, company_id, user_id, form_data, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [submissionData.requirementId, submissionData.companyId, submissionData.userId, submissionData.formData,
       submissionData.status || 'pending', submissionData.reviewedBy || null, submissionData.reviewedAt || null,
       submissionData.reviewNotes || null, now, now]
    );
    const row = result.rows[0] as any;
    
    return {
      id: row.id,
      requirementId: row.requirement_id,
      companyId: row.company_id,
      userId: row.user_id,
      formData: row.form_data,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as FormSubmission;
  }

  async updateFormSubmission(id: number, updates: Partial<FormSubmission>): Promise<FormSubmission | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
      if (key === 'requirementId') { fields.push('requirement_id = ?'); values.push(value); }
      else if (key === 'companyId') { fields.push('company_id = ?'); values.push(value); }
      else if (key === 'userId') { fields.push('user_id = ?'); values.push(value); }
      else if (key === 'formData') { fields.push('form_data = ?'); values.push(value); }
      else if (key === 'reviewedBy') { fields.push('reviewed_by = ?'); values.push(value); }
      else if (key === 'reviewedAt') { fields.push('reviewed_at = ?'); values.push(value); }
      else if (key === 'reviewNotes') { fields.push('review_notes = ?'); values.push(value); }
      else { fields.push(`${key} = ?`); values.push(value); }
    });
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE form_submissions SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      requirementId: row.requirement_id,
      companyId: row.company_id,
      userId: row.user_id,
      formData: row.form_data,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as FormSubmission;
  }

  async deleteFormSubmission(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM form_submissions WHERE id = ?", [id]);
    return (result.rowsAffected ?? 0) > 0;
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalCompanies: number;
    totalDocuments: number;
    newDocuments: number;
    pendingCompanies: number;
    activeConversations: number;
  }> {
    const stats = {
      totalUsers: 0,
      totalCompanies: 0,
      totalDocuments: 0,
      newDocuments: 0,
      pendingCompanies: 0,
      activeConversations: 0
    };
    
    // تعداد کل کاربران
    const usersResult = await db.execute("SELECT COUNT(*) as count FROM users");
    stats.totalUsers = (usersResult.rows[0] as any).count;
    
    // تعداد کل شرکت‌ها
    const companiesResult = await db.execute("SELECT COUNT(*) as count FROM companies");
    stats.totalCompanies = (companiesResult.rows[0] as any).count;
    
    // تعداد کل مدارک
    const documentsResult = await db.execute("SELECT COUNT(*) as count FROM documents");
    stats.totalDocuments = (documentsResult.rows[0] as any).count;
    
    // مدارک جدید (7 روز گذشته)
    const newDocsResult = await db.execute(
      "SELECT COUNT(*) as count FROM documents WHERE created_at > NOW() - INTERVAL '7 days'"
    );
    stats.newDocuments = (newDocsResult.rows[0] as any).count;
    
    // شرکت‌های در انتظار
    const pendingResult = await db.execute("SELECT COUNT(*) as count FROM companies WHERE status = 'pending'");
    stats.pendingCompanies = (pendingResult.rows[0] as any).count;
    
    // مکالمات فعال
    const activeConvsResult = await db.execute("SELECT COUNT(*) as count FROM conversations WHERE status = 'active'");
    stats.activeConversations = (activeConvsResult.rows[0] as any).count;
    
    return stats;
  }

  // Contract Template methods
  async getContractTemplates(
    options?: { useMappings?: boolean }
  ): Promise<ContractTemplate[]> {
    const useMappings = options?.useMappings ?? false; // Default: false برای backward compatibility

    const result = await db.execute("SELECT * FROM contract_templates WHERE is_active = true ORDER BY created_at DESC");

    if (useMappings) {
      // 🆕 روش جدید: استفاده از JOIN به جداول normalized
      logger.debug(`Fetching ${result.rows.length} templates with variables using JOIN (normalized tables)`, 'storage');

      // Batch fetch all mappings for all templates
      const templateIds = result.rows.map(row => (row as any).id);

      // دریافت یکجای تمام mappings برای همه templates
      const allMappings = await db.execute(`
        SELECT
          cvm.template_id,
          cvm.variable_id,
          cvm.is_required,
          cvm.default_value,
          cvm.sort_order,
          cv.name,
          cv.label,
          cv.description,
          cv.data_type,
          cv.source,
          cv.category,
          cv.is_required as var_is_required,
          cv.default_value as var_default_value,
          cv.placeholder,
          cv.validation_rules
        FROM contract_variable_mappings cvm
        JOIN contract_variables cv ON cvm.variable_id = cv.id
        WHERE cvm.template_id IN (${templateIds.map(() => '?').join(',')})
        ORDER BY cvm.template_id, cvm.sort_order
      `, templateIds);

      // گروه‌بندی mappings بر اساس template_id
      const mappingsByTemplate = new Map<number, any[]>();
      for (const mapping of allMappings.rows) {
        const templateId = (mapping as any).template_id;
        if (!mappingsByTemplate.has(templateId)) {
          mappingsByTemplate.set(templateId, []);
        }
        mappingsByTemplate.get(templateId)!.push(mapping);
      }

      // ساخت لیست نهایی templates با variables از normalized tables
      return result.rows.map(row => {
        const templateId = (row as any).id;
        const mappings = mappingsByTemplate.get(templateId) || [];

        const parsedVariables = mappings.map((m: any) => ({
          name: m.name,
          label: m.label,
          description: m.description,
          type: m.data_type,
          source: m.source,
          category: m.category,
          required: m.is_required || m.var_is_required,
          defaultValue: m.default_value || m.var_default_value,
          placeholder: m.placeholder,
          validationRules: m.validation_rules,
          order: m.sort_order
        }));

        return {
          id: (row as any).id,
          name: (row as any).name,
          description: (row as any).description,
          category: (row as any).category,
          fileName: (row as any).file_name,
          filePath: (row as any).file_path,
          fileSize: (row as any).file_size,
          version: (row as any).version,
          variables: parsedVariables,
          isActive: Boolean((row as any).is_active),
          createdBy: (row as any).created_by,
          createdAt: (row as any).created_at,
          updatedAt: (row as any).updated_at,
        };
      }) as ContractTemplate[];
    } else {
      // 📦 روش قدیمی: Parse JSON (برای backward compatibility)
      return result.rows.map(row => {
        const variables = (row as any).variables;
        let parsedVariables = [];

        // Parse JSON variables safely
        if (variables) {
          try {
            parsedVariables = typeof variables === 'string' ? JSON.parse(variables) : variables;
          } catch (error) {
            logger.warn('Failed to parse variables for template', 'template-parsing', { templateName: (row as any).name, error: error instanceof Error ? error.message : String(error) });
            parsedVariables = [];
          }
        }

        return {
          id: (row as any).id,
          name: (row as any).name,
          description: (row as any).description,
          category: (row as any).category,
          fileName: (row as any).file_name,
          filePath: (row as any).file_path,
          fileSize: (row as any).file_size,
          version: (row as any).version,
          variables: parsedVariables,
          isActive: Boolean((row as any).is_active),
          createdBy: (row as any).created_by,
          createdAt: (row as any).created_at,
          updatedAt: (row as any).updated_at,
        };
      }) as ContractTemplate[];
    }
  }

  async getContractTemplate(
    id: number,
    options?: { useMappings?: boolean }
  ): Promise<ContractTemplate | undefined> {
    const result = await db.execute("SELECT * FROM contract_templates WHERE id = ?", [id]);
    const row = result.rows[0] as any;
    if (!row) return undefined;

    // تعیین منبع variables: JOIN (mappings) یا JSON (legacy)
    const useMappings = options?.useMappings ?? false; // Default: false برای backward compatibility
    let parsedVariables = [];

    if (useMappings) {
      // 🆕 روش جدید: استفاده از JOIN به جداول normalized
      logger.debug(`Fetching variables for template ${id} using JOIN (normalized tables)`, 'storage');
      const mappedVars = await this.getTemplateVariables(id);

      // تبدیل فرمت از {variable, mapping} به فرمت ساده
      parsedVariables = mappedVars.map(item => ({
        name: item.variable.name,
        label: item.variable.label,
        description: item.variable.description,
        type: item.variable.dataType,
        source: item.variable.source,
        category: item.variable.category,
        required: item.mapping.isRequired || item.variable.isRequired,
        defaultValue: item.mapping.defaultValue || item.variable.defaultValue,
        placeholder: item.variable.placeholder,
        validationRules: item.variable.validationRules,
        order: item.mapping.sortOrder
      }));

      logger.info(`Loaded ${parsedVariables.length} variables from normalized tables for template ${id}`, 'storage');
    } else {
      // 📦 روش قدیمی: Parse JSON (برای backward compatibility)
      if (row.variables) {
        try {
          parsedVariables = typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables;
          logger.debug(`Parsed ${parsedVariables.length} variables from JSON for template ${id}`, 'storage');
        } catch (error) {
          logger.warn('Failed to parse variables for template', 'template-parsing', { templateName: row.name, error: error instanceof Error ? error.message : String(error) });
          parsedVariables = [];
        }
      }
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      version: row.version,
      variables: parsedVariables,
      isActive: Boolean(row.is_active),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as ContractTemplate;
  }

  async createContractTemplate(templateData: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractTemplate> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO contract_templates (name, description, category, file_name, file_path, file_size, version, variables, is_active, created_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        templateData.name,
        templateData.description || null,
        templateData.category || null,
        templateData.fileName,
        templateData.filePath,
        templateData.fileSize,
        templateData.version || '1.0',
        typeof templateData.variables === 'string' ? templateData.variables : JSON.stringify(templateData.variables || []),
        templateData.isActive !== false ? true : false,
        templateData.createdBy,
        now,
        now
      ]
    );
    
    const row = result.rows[0] as any;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      version: row.version,
      variables: row.variables,
      isActive: Boolean(row.is_active),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as ContractTemplate;
  }

  async updateContractTemplate(id: number, updates: Partial<ContractTemplate>): Promise<ContractTemplate | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
      if (key === 'fileName') { fields.push('file_name = ?'); values.push(value); }
      else if (key === 'filePath') { fields.push('file_path = ?'); values.push(value); }
      else if (key === 'fileSize') { fields.push('file_size = ?'); values.push(value); }
      else if (key === 'isActive') { fields.push('is_active = ?'); values.push(value ? true : false); }
      else if (key === 'createdBy') { fields.push('created_by = ?'); values.push(value); }
      else { fields.push(`${key} = ?`); values.push(value); }
    });
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE contract_templates SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    
    const row = result.rows[0] as any;
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      version: row.version,
      variables: row.variables,
      isActive: Boolean(row.is_active),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as ContractTemplate;
  }

  async deleteContractTemplate(id: number): Promise<boolean> {
    const result = await db.execute("UPDATE contract_templates SET is_active = false WHERE id = ?", [id]);
    return (result as any).changes > 0;
  }

  // Contract Form Data methods
  async getContractFormData(companyId: number, templateId: number): Promise<ContractFormData | undefined> {
    const result = await db.execute("SELECT * FROM contract_form_data WHERE company_id = ? AND template_id = ?", [companyId, templateId]);
    const row = result.rows[0] as any;
    if (!row) return undefined;

    return {
      id: row.id,
      companyId: row.company_id,
      templateId: row.template_id,
      formType: row.form_type,
      formData: row.form_data,
      isComplete: Boolean(row.is_complete),
      lastUsedAt: row.last_used_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as ContractFormData;
  }

  async getContractFormDataByCompany(companyId: number): Promise<ContractFormData[]> {
    const result = await db.execute("SELECT * FROM contract_form_data WHERE company_id = ? ORDER BY created_at DESC", [companyId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      companyId: row.company_id,
      templateId: row.template_id,
      formType: row.form_type,
      formData: row.form_data,
      isComplete: Boolean(row.is_complete),
      lastUsedAt: row.last_used_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as ContractFormData[];
  }

  async createContractFormData(data: Omit<ContractFormData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractFormData> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO contract_form_data (company_id, template_id, form_type, form_data, is_complete, last_used_at, created_by, updated_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [data.companyId, data.templateId, data.formType, data.formData, data.isComplete ? true : false, data.lastUsedAt || null, data.createdBy, data.updatedBy || null, now, now]
    );
    const row = result.rows[0] as any;

    return {
      id: row.id,
      companyId: row.company_id,
      templateId: row.template_id,
      formType: row.form_type,
      formData: row.form_data,
      isComplete: Boolean(row.is_complete),
      lastUsedAt: row.last_used_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as ContractFormData;
  }

  async updateContractFormData(id: number, updates: Partial<ContractFormData>): Promise<ContractFormData | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt') return;
      if (key === 'companyId') { fields.push('company_id = ?'); values.push(value); }
      else if (key === 'templateId') { fields.push('template_id = ?'); values.push(value); }
      else if (key === 'formType') { fields.push('form_type = ?'); values.push(value); }
      else if (key === 'formData') { fields.push('form_data = ?'); values.push(value); }
      else if (key === 'isComplete') { fields.push('is_complete = ?'); values.push(value ? true : false); }
      else if (key === 'lastUsedAt') { fields.push('last_used_at = ?'); values.push(value); }
      else if (key === 'createdBy') { fields.push('created_by = ?'); values.push(value); }
      else if (key === 'updatedBy') { fields.push('updated_by = ?'); values.push(value); }
    });

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const result = await db.execute(
      `UPDATE contract_form_data SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    const row = result.rows[0] as any;
    if (!row) return undefined;

    return {
      id: row.id,
      companyId: row.company_id,
      templateId: row.template_id,
      formType: row.form_type,
      formData: row.form_data,
      isComplete: Boolean(row.is_complete),
      lastUsedAt: row.last_used_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as ContractFormData;
  }

  async deleteContractFormData(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM contract_form_data WHERE id = ?", [id]);
    return (result as any).changes > 0;
  }

  // Delete user (hard delete)
  async deleteUser(id: number): Promise<boolean> {
    try {
      logger.info(`شروع حذف کاربر ${id} و تمام داده‌های مرتبط`, 'user-deletion');
      
      // Find companies that will become orphaned after this user is deleted
      const orphanedCompanies = await db.execute(`
        SELECT c.id FROM companies c
        WHERE c.id IN (
          SELECT company_id FROM user_companies WHERE user_id = ?
        )
        AND (
          SELECT COUNT(*) FROM user_companies uc2 
          WHERE uc2.company_id = c.id AND uc2.user_id != ?
        ) = 0
      `, [id, id]);

      logger.info(`${orphanedCompanies.rows.length} شرکت یتیم یافت شد که باید حذف شوند`, 'user-deletion');

      // Delete related data first
      await db.execute("DELETE FROM user_companies WHERE user_id = ?", [id]);
      logger.info(`حذف user_companies مرتبط با کاربر ${id}`, 'user-deletion');
      
      await db.execute("DELETE FROM audit_logs WHERE user_id = ?", [id]);
      logger.info(`حذف audit_logs مرتبط با کاربر ${id}`, 'user-deletion');
      
      await db.execute("DELETE FROM form_submissions WHERE user_id = ?", [id]);
      logger.info(`حذف form_submissions مرتبط با کاربر ${id}`, 'user-deletion');
      
      await db.execute("UPDATE documents SET uploaded_by_id = NULL WHERE uploaded_by_id = ?", [id]);
      logger.info(`بروزرسانی documents: تنظیم uploaded_by_id به NULL`, 'user-deletion');
      
      await db.execute("UPDATE conversations SET employee_id = NULL WHERE employee_id = ?", [id]);
      logger.info(`بروزرسانی conversations: تنظیم employee_id به NULL`, 'user-deletion');
      
      await db.execute("UPDATE messages SET sender_id = NULL WHERE sender_id = ?", [id]);
      logger.info(`بروزرسانی messages: تنظیم sender_id به NULL`, 'user-deletion');
      
      // Delete orphaned companies using the complete deleteCompany method
      // Delete orphaned companies sequentially to avoid connection pool exhaustion
      for (const row of orphanedCompanies.rows) {
        const companyId = (row as any).id;
        logger.info(`حذف شرکت یتیم: ${companyId}`, 'user-deletion');
        await this.deleteCompany(companyId);
      }
      
      // Delete the user
      const result = await db.execute("DELETE FROM users WHERE id = ?", [id]);
      logger.info(`حذف کاربر ${id} از جدول users`, 'user-deletion');
      
      // Log the deletion
      logger.info(`✅ کاربر ${id} با موفقیت حذف شد. ${orphanedCompanies.rows.length} شرکت یتیم نیز حذف شد.`, 'user-deletion');
      
      return (result as any).changes > 0;
    } catch (error) {
      logger.error(`❌ خطا در حذف کاربر ${id}`, 'user-deletion', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Delete company (hard delete)
  async deleteCompany(id: number): Promise<boolean> {
    try {
      logger.info(`شروع حذف شرکت ${id} و تمام داده‌های مرتبط`, 'company-deletion');
      
      // Temporarily disable foreign key checks for complex deletion
      await db.execute("PRAGMA foreign_keys = OFF");
      
      // Delete related data first (in order of dependencies)
      
      // 1. جداول وابسته به جداول دیگر (مثل messages که وابسته به conversations است)
      await db.execute(`
        DELETE FROM messages 
        WHERE conversation_id IN (
          SELECT id FROM conversations WHERE company_id = ?
        )
      `, [id]);
      logger.info(`حذف messages مرتبط با شرکت ${id}`, 'company-deletion');
      
      // 2. جداول migration های اضافه شده
      await db.execute("DELETE FROM generated_investment_reports WHERE company_id = ?", [id]);
      logger.info(`حذف generated_investment_reports مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM investment_report_form_data WHERE company_id = ?", [id]);
      logger.info(`حذف investment_report_form_data مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM company_services WHERE company_id = ?", [id]);
      logger.info(`حذف company_services مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM service_requests WHERE company_id = ?", [id]);
      logger.info(`حذف service_requests مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM contract_form_data WHERE company_id = ?", [id]);
      logger.info(`حذف contract_form_data مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM document_requirement_access WHERE company_id = ?", [id]);
      logger.info(`حذف document_requirement_access مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM ai_chat_sessions WHERE company_id = ?", [id]);
      logger.info(`حذف ai_chat_sessions مرتبط با شرکت ${id}`, 'company-deletion');
      
      // 3. جداول اصلی
      await db.execute("DELETE FROM form_submissions WHERE company_id = ?", [id]);
      logger.info(`حذف form_submissions مرتبط با شرکت ${id}`, 'company-deletion');
      
      // حذف generated_contracts (اگر وجود داشته باشد)
      try {
        await db.execute("DELETE FROM generated_contracts WHERE company_id = ?", [id]);
        logger.info(`حذف generated_contracts مرتبط با شرکت ${id}`, 'company-deletion');
      } catch (e) {
        // Table might not exist
      }
      
      await db.execute("DELETE FROM documents WHERE company_id = ?", [id]);
      logger.info(`حذف documents مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM conversations WHERE company_id = ?", [id]);
      logger.info(`حذف conversations مرتبط با شرکت ${id}`, 'company-deletion');
      
      await db.execute("DELETE FROM user_companies WHERE company_id = ?", [id]);
      logger.info(`حذف user_companies مرتبط با شرکت ${id}`, 'company-deletion');
      
      // 4. حذف شرکت
      const result = await db.execute("DELETE FROM companies WHERE id = ?", [id]);
      logger.info(`حذف شرکت ${id} از جدول companies`, 'company-deletion');
      
      // 5. پاک کردن cache
      const { invalidateCompanyCaches } = await import('./utils/cache-keys');
      invalidateCompanyCaches(id);
      logger.info(`cache شرکت ${id} پاک شد`, 'company-deletion');
      
      const deleted = (result as any).changes > 0;
      if (deleted) {
        logger.info(`✅ شرکت ${id} با موفقیت حذف شد`, 'company-deletion');
      } else {
        logger.warn(`⚠️ شرکت ${id} یافت نشد`, 'company-deletion');
      }
      
      // Re-enable foreign key checks
      await db.execute("PRAGMA foreign_keys = ON");
      
      return deleted;
    } catch (error) {
      // Re-enable foreign key checks even on error
      try {
        await db.execute("PRAGMA foreign_keys = ON");
      } catch (pragmaError) {
        // Ignore pragma error
      }
      
      logger.error(`❌ خطا در حذف شرکت ${id}`, 'company-deletion', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateConversation(id: number, updateData: Partial<Conversation>): Promise<Conversation | undefined> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (key === "id" || key === "createdAt") return;
      if (key === "companyId") { fields.push("company_id = ?"); values.push(value); }
      else if (key === "employeeId") { fields.push("employee_id = ?"); values.push(value); }
      else if (key === "subject") { fields.push("subject = ?"); values.push(value); }
      else if (key === "status") { fields.push("status = ?"); values.push(value); }
      else if (key === "lastMessageAt") { fields.push("last_message_at = ?"); values.push(value); }
    });

    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    const result = await db.execute(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ? RETURNING *`, values);
    return result.rows[0] as unknown as Conversation | undefined;
  }

  async getDocumentRequirementAccessList(userId: number): Promise<number[]> {
    // Implementation needed
    return [];
  }

  // Bale Chat System Methods Implementation
  async getDepartments(): Promise<Department[]> {
    const result = await db.execute("SELECT * FROM departments WHERE is_active = true ORDER BY id");
    return result.rows as unknown as Department[];
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const result = await db.execute("SELECT * FROM departments WHERE id = ?", [id]);
    return result.rows[0] as unknown as Department | undefined;
  }

  async createDepartment(name: string, slug: string): Promise<Department> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO departments (name, slug, is_active, created_at) 
       VALUES (?, ?, ?, ?) RETURNING *`,
      [name, slug, 1, now]
    );
    return result.rows[0] as unknown as Department;
  }

  async getDepartmentBySlug(slug: string): Promise<Department | undefined> {
    const result = await db.execute(
      "SELECT * FROM departments WHERE slug = ?", 
      [slug]
    );
    return result.rows[0] as unknown as Department | undefined;
  }

  async getAllDepartments(): Promise<Department[]> {
    const result = await db.execute("SELECT * FROM departments ORDER BY id");
    return result.rows as unknown as Department[];
  }

  async getAuthorizedPhones(): Promise<AuthorizedPhone[]> {
    const result = await db.execute("SELECT * FROM authorized_phones WHERE is_active = true ORDER BY id");
    return result.rows as unknown as AuthorizedPhone[];
  }

  async getAllAuthorizedPhones(): Promise<AuthorizedPhone[]> {
    const result = await db.execute("SELECT * FROM authorized_phones ORDER BY id");
    return result.rows as unknown as AuthorizedPhone[];
  }

  async getAuthorizedPhoneByNumber(phoneNumber: string): Promise<AuthorizedPhone[]> {
    const result = await db.execute(
      `SELECT ap.*, d.name as department_name 
       FROM authorized_phones ap 
       LEFT JOIN departments d ON ap.department_id = d.id 
       WHERE ap.phone_number = ? AND ap.is_active = true`,
      [phoneNumber]
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      phoneNumber: row.phone_number,
      employeeName: row.employee_name,
      departmentId: row.department_id,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      department: row.department_name ? {
        id: row.department_id,
        name: row.department_name
      } : undefined
    })) as AuthorizedPhone[];
  }

  async getAuthorizedPhonesByDepartment(departmentId: number): Promise<AuthorizedPhone[]> {
    const result = await db.execute(
      "SELECT * FROM authorized_phones WHERE department_id = ? ORDER BY id",
      [departmentId]
    );
    return result.rows as unknown as AuthorizedPhone[];
  }

  async addAuthorizedPhone(phoneNumber: string, employeeName: string, departmentId: number): Promise<AuthorizedPhone> {
    // Check if phone already exists for this department
    const existing = await db.execute(
      "SELECT * FROM authorized_phones WHERE phone_number = ? AND department_id = ?",
      [phoneNumber, departmentId]
    );
    
    if (existing.rows.length > 0) {
      throw new Error(`Phone number already exists for this department`);
    }
    
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO authorized_phones (phone_number, employee_name, department_id, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
      [phoneNumber, employeeName, departmentId, 1, now]
    );
    return result.rows[0] as unknown as AuthorizedPhone;
  }

  async createBaleUser(user: InsertBaleUser): Promise<BaleUser> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO bale_users (bale_user_id, bale_chat_id, first_name, last_name, username, 
       phone_number, department_id, is_authenticated, last_active_at, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        user.baleUserId,
        user.baleChatId,
        user.firstName || null,
        user.lastName || null,
        user.username || null,
        user.phoneNumber || null,
        user.departmentId || null,
        user.isAuthenticated ? true : false,
        now,
        now
      ]
    );
    return result.rows[0] as unknown as BaleUser;
  }

  async getBaleUserByChatId(chatId: string): Promise<BaleUser | undefined> {
    const result = await db.execute(
      "SELECT * FROM bale_users WHERE bale_chat_id = ?", 
      [chatId]
    );
    return result.rows[0] as unknown as BaleUser | undefined;
  }

  async getBaleUserByPhoneNumber(phoneNumber: string): Promise<BaleUser | undefined> {
    const result = await db.execute(
      "SELECT * FROM bale_users WHERE phone_number = ?", 
      [phoneNumber]
    );
    return result.rows[0] as unknown as BaleUser | undefined;
  }

  async updateBaleUser(id: number, updates: Partial<BaleUser>): Promise<BaleUser | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    if (updates.firstName !== undefined) { fields.push('first_name = ?'); values.push(updates.firstName); }
    if (updates.lastName !== undefined) { fields.push('last_name = ?'); values.push(updates.lastName); }
    if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
    if (updates.phoneNumber !== undefined) { fields.push('phone_number = ?'); values.push(updates.phoneNumber); }
    if (updates.departmentId !== undefined) { fields.push('department_id = ?'); values.push(updates.departmentId); }
    if (updates.isAuthenticated !== undefined) { fields.push('is_authenticated = ?'); values.push(updates.isAuthenticated ? true : false); }
    
    fields.push('last_active_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE bale_users SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    return result.rows[0] as unknown as BaleUser | undefined;
  }

  async createBaleConversation(conversation: InsertBaleConversation): Promise<BaleConversation> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO bale_conversations (title, customer_name, customer_phone, department_id, 
       status, last_message_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        conversation.title || null,
        conversation.customerName || null,
        conversation.customerPhone || null,
        conversation.departmentId,
        conversation.status || 'active',
        now,
        now,
        now
      ]
    );
    return result.rows[0] as unknown as BaleConversation;
  }

  async getBaleConversation(id: number): Promise<BaleConversation | undefined> {
    const result = await db.execute("SELECT * FROM bale_conversations WHERE id = ?", [id]);
    return result.rows[0] as unknown as BaleConversation | undefined;
  }

  async getBaleConversationsByDepartment(departmentId: number): Promise<BaleConversation[]> {
    const result = await db.execute(
      "SELECT * FROM bale_conversations WHERE department_id = ? AND status = 'active' ORDER BY last_message_at DESC",
      [departmentId]
    );
    return result.rows as unknown as BaleConversation[];
  }

  async updateBaleConversation(id: number, updates: Partial<BaleConversation>): Promise<BaleConversation | undefined> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.customerName !== undefined) { fields.push('customer_name = ?'); values.push(updates.customerName); }
    if (updates.customerPhone !== undefined) { fields.push('customer_phone = ?'); values.push(updates.customerPhone); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.lastMessageAt !== undefined) { fields.push('last_message_at = ?'); values.push(updates.lastMessageAt); }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await db.execute(
      `UPDATE bale_conversations SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    return result.rows[0] as unknown as BaleConversation | undefined;
  }

  async createBaleMessage(message: InsertBaleMessage): Promise<BaleMessage> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO bale_messages (conversation_id, content, message_type, platform, 
       sender_type, bale_user_id, is_delivered, sent_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        message.conversationId,
        message.content,
        message.messageType || 'text',
        message.platform || 'web',
        message.senderType || 'customer',
        message.baleUserId || null,
        message.isDelivered ? true : false,
        message.sentAt || now
      ]
    );
    
    // Update conversation's last message time
    await db.execute(
      `UPDATE bale_conversations SET last_message_at = ? WHERE id = ?`,
      [now, message.conversationId]
    );
    
    return result.rows[0] as unknown as BaleMessage;
  }

  async getBaleMessagesByConversation(conversationId: number): Promise<BaleMessage[]> {
    const result = await db.execute(
      "SELECT * FROM bale_messages WHERE conversation_id = ? ORDER BY sent_at ASC",
      [conversationId]
    );
    return result.rows as unknown as BaleMessage[];
  }

  async updateBaleMessageDelivery(id: number, isDelivered: boolean): Promise<void> {
    await db.execute(
      "UPDATE bale_messages SET is_delivered = ? WHERE id = ?",
      [isDelivered ? true : false, id]
    );
  }

  // System Settings Methods
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    const result = await db.execute("SELECT * FROM system_settings ORDER BY category, key");
    return result.rows.map((row: any) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      category: row.category,
      description: row.description,
      isEditable: Boolean(row.is_editable),
      dataType: row.data_type,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSystemSettingsByCategory(category: string): Promise<SystemSetting[]> {
    const result = await db.execute(
      "SELECT * FROM system_settings WHERE category = ? ORDER BY key",
      [category]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      category: row.category,
      description: row.description,
      isEditable: Boolean(row.is_editable),
      dataType: row.data_type,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const result = await db.execute(
      "SELECT * FROM system_settings WHERE key = ?",
      [key]
    );
    const row = result.rows[0] as any;
    if (!row) return undefined;

    return {
      id: row.id,
      key: row.key,
      value: row.value,
      category: row.category,
      description: row.description,
      isEditable: Boolean(row.is_editable),
      dataType: row.data_type,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO system_settings (key, value, category, description, is_editable, data_type, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        setting.key,
        setting.value,
        setting.category,
        setting.description || null,
        setting.isEditable ? true : false,
        setting.dataType || 'text',
        setting.updatedBy || null,
        now,
        now,
      ]
    );

    return {
      id: result.rows[0].id,
      key: setting.key,
      value: setting.value,
      category: setting.category,
      description: setting.description || null,
      isEditable: setting.isEditable ?? true,
      dataType: setting.dataType || 'text',
      updatedBy: setting.updatedBy || null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateSystemSetting(key: string, value: string, updatedBy?: number): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await db.execute(
      "UPDATE system_settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?",
      [value, updatedBy || null, now, key]
    );
    return (result.rowsAffected || 0) > 0;
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    const result = await db.execute("DELETE FROM system_settings WHERE key = ?", [key]);
    return (result.rowsAffected || 0) > 0;
  }

  // Contract Variables methods
  async getContractVariables(filters?: any): Promise<ContractVariable[]> {
    const result = await db.execute("SELECT * FROM contract_variables ORDER BY category, name");
    return result.rows.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      label: (row as any).label,
      description: (row as any).description || null,
      dataType: (row as any).data_type || 'text',
      defaultValue: (row as any).default_value || null,
      isRequired: Boolean((row as any).is_required),
      source: (row as any).source,
      placeholder: (row as any).placeholder || null,
      validationRules: (row as any).validation_rules || null,
      category: (row as any).category || 'other',
      isActive: Boolean((row as any).is_active),
      sortOrder: (row as any).sort_order || 0,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    })) as ContractVariable[];
  }

  async getContractVariable(id: number): Promise<ContractVariable | null> {
    const result = await db.execute("SELECT * FROM contract_variables WHERE id = ?", [id]);
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: (row as any).id,
      name: (row as any).name,
      label: (row as any).label,
      description: (row as any).description || null,
      dataType: (row as any).data_type || 'text',
      defaultValue: (row as any).default_value || null,
      isRequired: Boolean((row as any).is_required),
      source: (row as any).source,
      placeholder: (row as any).placeholder || null,
      validationRules: (row as any).validation_rules || null,
      category: (row as any).category || 'other',
      isActive: Boolean((row as any).is_active),
      sortOrder: (row as any).sort_order || 0,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    } as ContractVariable;
  }

  async getContractVariableByName(name: string): Promise<ContractVariable | null> {
    const result = await db.execute("SELECT * FROM contract_variables WHERE name = ?", [name]);
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: (row as any).id,
      name: (row as any).name,
      label: (row as any).label,
      description: (row as any).description || null,
      dataType: (row as any).data_type,
      defaultValue: (row as any).default_value || null,
      isRequired: Boolean((row as any).is_required),
      source: (row as any).source,
      placeholder: (row as any).placeholder || null,
      validationRules: (row as any).validation_rules || null,
      category: (row as any).category || 'other',
      isActive: Boolean((row as any).is_active),
      sortOrder: (row as any).sort_order || 0,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    } as ContractVariable;
  }

  async createContractVariable(data: Omit<InsertContractVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractVariable> {
    const now = new Date().toISOString();
    const result = await db.execute(`
      INSERT INTO contract_variables (
        name, label, description, data_type, default_value, is_required, source,
        placeholder, validation_rules, category, is_active, created_by, created_at, updated_at, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [
      data.name,
      data.label,
      data.description || null,
      (data as any).dataType || (data as any).type || 'text',
      data.defaultValue || null,
      data.isRequired ? true : false,
      data.source || 'form',
      data.placeholder || null,
      (data as any).validationRules || (data as any).validation || null,
      data.category || 'general',
      data.isActive !== undefined ? (data.isActive ? true : false) : true,
      data.createdBy,
      now,
      now,
      (data as any).sortOrder || 0
    ]);

    const newVariable = await this.getContractVariable(result.rows[0].id);
    if (!newVariable) throw new Error("Failed to create contract variable");
    return newVariable;
  }

  async updateContractVariable(id: number, data: Partial<Omit<ContractVariable, 'id' | 'createdBy' | 'createdAt'>>): Promise<ContractVariable | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.label !== undefined) {
      updates.push("label = ?");
      values.push(data.label);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if ((data as any).dataType !== undefined || (data as any).type !== undefined) {
      updates.push("data_type = ?");
      values.push((data as any).dataType || (data as any).type);
    }
    if (data.defaultValue !== undefined) {
      updates.push("default_value = ?");
      values.push(data.defaultValue);
    }
    if (data.isRequired !== undefined) {
      updates.push("is_required = ?");
      values.push(data.isRequired ? true : false);
    }
    if (data.source !== undefined) {
      updates.push("source = ?");
      values.push(data.source);
    }
    if (data.placeholder !== undefined) {
      updates.push("placeholder = ?");
      values.push(data.placeholder);
    }
    if ((data as any).validationRules !== undefined || (data as any).validation !== undefined) {
      updates.push("validation_rules = ?");
      values.push((data as any).validationRules || (data as any).validation);
    }
    if (data.category !== undefined) {
      updates.push("category = ?");
      values.push(data.category);
    }
    if (data.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(data.isActive ? true : false);
    }

    if (updates.length === 0) return await this.getContractVariable(id);

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    await db.execute(
      `UPDATE contract_variables SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return await this.getContractVariable(id);
  }

  async deleteContractVariable(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM contract_variables WHERE id = ?", [id]);
    return (result.rowsAffected || 0) > 0;
  }

  async getVariablesByCategory(category: string): Promise<ContractVariable[]> {
    const result = await db.execute(
      "SELECT * FROM contract_variables WHERE category = ? ORDER BY name",
      [category]
    );
    return result.rows.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      label: (row as any).label,
      description: (row as any).description || null,
      dataType: (row as any).data_type,
      defaultValue: (row as any).default_value || null,
      isRequired: Boolean((row as any).is_required),
      source: (row as any).source,
      placeholder: (row as any).placeholder || null,
      validationRules: (row as any).validation_rules || null,
      category: (row as any).category || 'other',
      isActive: Boolean((row as any).is_active),
      sortOrder: (row as any).sort_order || 0,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    })) as ContractVariable[];
  }

  async getVariablesBySource(source: string): Promise<ContractVariable[]> {
    const result = await db.execute(
      "SELECT * FROM contract_variables WHERE source = ? ORDER BY category, name",
      [source]
    );
    return result.rows.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      label: (row as any).label,
      description: (row as any).description || null,
      dataType: (row as any).data_type,
      defaultValue: (row as any).default_value || null,
      isRequired: Boolean((row as any).is_required),
      source: (row as any).source,
      placeholder: (row as any).placeholder || null,
      validationRules: (row as any).validation_rules || null,
      category: (row as any).category || 'other',
      isActive: Boolean((row as any).is_active),
      sortOrder: (row as any).sort_order || 0,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    })) as ContractVariable[];
  }

  async getActiveContractVariables(): Promise<ContractVariable[]> {
    const result = await db.execute(
      "SELECT * FROM contract_variables WHERE is_active = true ORDER BY category, name"
    );
    return result.rows.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      label: (row as any).label,
      description: (row as any).description || null,
      dataType: (row as any).data_type,
      defaultValue: (row as any).default_value || null,
      isRequired: Boolean((row as any).is_required),
      source: (row as any).source,
      placeholder: (row as any).placeholder || null,
      validationRules: (row as any).validation_rules || null,
      category: (row as any).category || 'other',
      isActive: Boolean((row as any).is_active),
      sortOrder: (row as any).sort_order || 0,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    })) as ContractVariable[];
  }

  // ========================================
  // Variable Form Field Mappings (ارتباط متغیر با فیلدهای فرم)
  // ========================================

  /**
   * Safe JSON parser - برای جلوگیری از خطاهای parse
   */
  private safeJSONParse(jsonString: unknown, fallback: any = []): any {
    if (!jsonString) return fallback;

    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (error) {
      logger.warn('Failed to parse JSON', 'storage', {
        error: error instanceof Error ? error.message : String(error)
      });
      return fallback;
    }
  }

  /**
   * Validate mapping قبل از ایجاد
   */
  private async validateMapping(data: {
    variableId: number;
    requirementId: number;
    fieldName: string;
  }): Promise<{ valid: boolean; error?: string }> {
    // 1. چک کردن وجود variable
    const variable = await this.getContractVariable(data.variableId);
    if (!variable) {
      return { valid: false, error: `Variable with ID ${data.variableId} not found` };
    }

    // 2. چک کردن وجود form (requirement)
    const requirement = await this.getDocumentRequirement(data.requirementId);
    if (!requirement) {
      return { valid: false, error: `Form with ID ${data.requirementId} not found` };
    }

    // 3. چک کردن وجود fieldName در JSON فرم
    const fields = this.safeJSONParse(requirement.fields, []);
    const fieldExists = fields.some((f: any) => f.name === data.fieldName);

    if (!fieldExists) {
      return {
        valid: false,
        error: `Field '${data.fieldName}' not found in form '${requirement.title}'`
      };
    }

    // 4. چک کردن duplicate mapping
    const existingMappings = await db.execute(`
      SELECT id FROM variable_form_field_mappings
      WHERE variable_id = ? AND requirement_id = ? AND field_name = ?
    `, [data.variableId, data.requirementId, data.fieldName]);

    if (existingMappings.rows.length > 0) {
      return {
        valid: false,
        error: `Mapping already exists for this variable, form, and field combination`
      };
    }

    return { valid: true };
  }

  async getVariableFormFieldMappings(variableId: number) {
    try {
      const result = await db.execute(`
        SELECT
          vffm.*,
          dr.id as requirement_id,
          dr.title as requirement_title,
          dr.fields as requirement_fields
        FROM variable_form_field_mappings vffm
        LEFT JOIN document_requirements dr ON vffm.requirement_id = dr.id
        WHERE vffm.variable_id = ? AND vffm.is_active = true
        ORDER BY vffm.priority DESC
      `, [variableId]);

      return result.rows.map((row: any) => ({
        id: row.id,
        variableId: row.variable_id,
        requirementId: row.requirement_id,
        requirementTitle: row.requirement_title,
        fieldName: row.field_name,
        priority: row.priority || 1,
        isActive: Boolean(row.is_active),
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // اطلاعات فرم با safe JSON parsing
        form: {
          id: row.requirement_id,
          title: row.requirement_title,
          fields: this.safeJSONParse(row.requirement_fields, [])
        }
      }));
    } catch (error) {
      logger.error('Error fetching variable form field mappings', 'storage', {
        variableId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async createVariableFormFieldMapping(data: {
    variableId: number;
    requirementId: number;
    fieldName: string;
    priority?: number;
    createdBy?: number;
  }) {
    // Validation قبل از ایجاد
    const validation = await this.validateMapping(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.error}`);
    }

    try {
      const now = new Date().toISOString();

      const result = await db.execute(`
        INSERT INTO variable_form_field_mappings (
          variable_id, requirement_id, field_name, priority, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, true, ?, ?, ?) RETURNING id
      `, [
        data.variableId,
        data.requirementId,
        data.fieldName,
        data.priority || 1,
        data.createdBy || null,
        now,
        now
      ]);

      const mappingId = result.rows[0].id;

      logger.info('Variable form field mapping created', 'storage', {
        mappingId,
        variableId: data.variableId,
        requirementId: data.requirementId,
        fieldName: data.fieldName
      });

      return {
        id: mappingId,
        ...data,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      logger.error('Error creating variable form field mapping', 'storage', {
        data,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteVariableFormFieldMapping(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM variable_form_field_mappings WHERE id = ?", [id]);
    return (result.rowsAffected || 0) > 0;
  }

  async getFormFieldsForVariable(variableId: number) {
    // دریافت تمام mappings با اولویت
    const mappings = await this.getVariableFormFieldMappings(variableId);

    return mappings.map(mapping => ({
      formId: mapping.requirementId,
      formTitle: mapping.requirementTitle,
      fieldName: mapping.fieldName,
      priority: mapping.priority,
      // پیدا کردن تعریف کامل فیلد از JSON فرم
      fieldDefinition: mapping.form.fields.find((f: any) => f.name === mapping.fieldName)
    }));
  }

  /**
   * Update mapping - برای تغییر priority یا fieldName
   */
  async updateVariableFormFieldMapping(
    id: number,
    updates: {
      fieldName?: string;
      priority?: number;
      isActive?: boolean;
    }
  ) {
    try {
      // دریافت mapping فعلی
      const existingResult = await db.execute(
        'SELECT * FROM variable_form_field_mappings WHERE id = ?',
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw new Error(`Mapping with ID ${id} not found`);
      }

      const existing = existingResult.rows[0] as any;

      // اگر fieldName تغییر کرده، باید validate کنیم
      if (updates.fieldName && updates.fieldName !== existing.field_name) {
        const validation = await this.validateMapping({
          variableId: existing.variable_id,
          requirementId: existing.requirement_id,
          fieldName: updates.fieldName
        });

        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.error}`);
        }
      }

      // ساخت query update
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.fieldName !== undefined) {
        updateFields.push('field_name = ?');
        updateValues.push(updates.fieldName);
      }

      if (updates.priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(updates.priority);
      }

      if (updates.isActive !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updates.isActive ? true : false);
      }

      if (updateFields.length === 0) {
        return existing; // هیچ تغییری نیست
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());
      updateValues.push(id);

      await db.execute(
        `UPDATE variable_form_field_mappings SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info('Variable form field mapping updated', 'storage', {
        mappingId: id,
        updates
      });

      // دریافت mapping به‌روزرسانی شده
      const updatedResult = await db.execute(
        'SELECT * FROM variable_form_field_mappings WHERE id = ?',
        [id]
      );

      return updatedResult.rows[0];
    } catch (error) {
      logger.error('Error updating variable form field mapping', 'storage', {
        id,
        updates,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Bulk create mappings - برای ایجاد چند mapping یکجا
   */
  async bulkCreateVariableFormFieldMappings(
    mappings: Array<{
      variableId: number;
      requirementId: number;
      fieldName: string;
      priority?: number;
      createdBy?: number;
    }>
  ) {
    const results = {
      created: [] as any[],
      skipped: [] as any[],
      errors: [] as any[]
    };

        if (mappings.length > 0) {
      // Note: Full validation matching createVariableFormFieldMapping is complex in bulk,
      // so we use a sequential loop to prevent connection pool exhaustion.

      for (const mapping of mappings) {
        try {
          const created = await this.createVariableFormFieldMapping(mapping);
          results.created.push(created);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // اگر duplicate باشه، skip می‌کنیم (نه error)
          if (errorMessage.includes('already exists')) {
            results.skipped.push({
              ...mapping,
              reason: 'Already exists'
            });
          } else {
            results.errors.push({
              ...mapping,
              error: errorMessage
            });
          }
        }
      }
    }

    logger.info('Bulk create variable form field mappings completed', 'storage', {
      total: mappings.length,
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length
    });

    return results;
  }

  /**
   * دریافت تمام mappings یک فرم
   */
  async getMappingsByForm(requirementId: number) {
    try {
      const result = await db.execute(`
        SELECT
          vffm.*,
          cv.name as variable_name,
          cv.label as variable_label,
          cv.source as variable_source
        FROM variable_form_field_mappings vffm
        JOIN contract_variables cv ON vffm.variable_id = cv.id
        WHERE vffm.requirement_id = ? AND vffm.is_active = true
        ORDER BY vffm.priority DESC, vffm.field_name
      `, [requirementId]);

      return result.rows.map((row: any) => ({
        id: row.id,
        variableId: row.variable_id,
        variableName: row.variable_name,
        variableLabel: row.variable_label,
        variableSource: row.variable_source,
        requirementId: row.requirement_id,
        fieldName: row.field_name,
        priority: row.priority || 1,
        isActive: Boolean(row.is_active),
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error fetching mappings by form', 'storage', error instanceof Error ? error : new Error(String(error)), undefined, { requirementId });
      throw error;
    }
  }

  /**
   * حذف تمام mappings یک متغیر
   */
  async deleteAllMappingsForVariable(variableId: number): Promise<number> {
    const result = await db.execute(
      'DELETE FROM variable_form_field_mappings WHERE variable_id = ?',
      [variableId]
    );
    return result.rowsAffected || 0;
  }

  /**
   * حذف تمام mappings یک فرم
   */
  async deleteAllMappingsForForm(requirementId: number): Promise<number> {
    const result = await db.execute(
      'DELETE FROM variable_form_field_mappings WHERE requirement_id = ?',
      [requirementId]
    );
    return result.rowsAffected || 0;
  }

  async bulkUpdateVariableCategory(variableIds: number[], category: string): Promise<boolean> {
    const placeholders = variableIds.map(() => '?').join(',');
    const result = await db.execute(
      `UPDATE contract_variables SET category = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [category, new Date().toISOString(), ...variableIds]
    );
    return (result.rowsAffected || 0) > 0;
  }

  // Employee Bale Settings methods
  async getEmployeeBaleSettings(): Promise<EmployeeBaleSettings[]> {
    const result = await db.execute("SELECT * FROM employee_bale_settings ORDER BY created_at DESC");
    return result.rows.map(row => ({
      id: (row as any).id,
      employeeId: (row as any).employee_id,
      baleChatId: (row as any).bale_chat_id,
      baleUserId: (row as any).bale_user_id,
      isActive: Boolean((row as any).is_active),
      notificationsEnabled: Boolean((row as any).notifications_enabled),
      departmentFilter: (row as any).department_filter,
      lastActivity: (row as any).last_activity,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    })) as EmployeeBaleSettings[];
  }

  async getEmployeeBaleSettingsByEmployee(employeeId: number): Promise<EmployeeBaleSettings | null> {
    const result = await db.execute(
      "SELECT * FROM employee_bale_settings WHERE employee_id = ?",
      [employeeId]
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: (row as any).id,
      employeeId: (row as any).employee_id,
      baleChatId: (row as any).bale_chat_id,
      baleUserId: (row as any).bale_user_id,
      isActive: Boolean((row as any).is_active),
      notificationsEnabled: Boolean((row as any).notifications_enabled),
      departmentFilter: (row as any).department_filter,
      lastActivity: (row as any).last_activity,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    } as EmployeeBaleSettings;
  }

  async getEmployeeBaleSettingsByChatId(baleChatId: string): Promise<EmployeeBaleSettings | null> {
    const result = await db.execute(
      "SELECT * FROM employee_bale_settings WHERE bale_chat_id = ?",
      [baleChatId]
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: (row as any).id,
      employeeId: (row as any).employee_id,
      baleChatId: (row as any).bale_chat_id,
      baleUserId: (row as any).bale_user_id,
      isActive: Boolean((row as any).is_active),
      notificationsEnabled: Boolean((row as any).notifications_enabled),
      departmentFilter: (row as any).department_filter,
      lastActivity: (row as any).last_activity,
      createdBy: (row as any).created_by,
      createdAt: (row as any).created_at,
      updatedAt: (row as any).updated_at,
    } as EmployeeBaleSettings;
  }

  async createEmployeeBaleSettings(data: Omit<InsertEmployeeBaleSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmployeeBaleSettings> {
    const now = new Date().toISOString();
    await db.execute(`
      INSERT INTO employee_bale_settings (
        employee_id, bale_chat_id, bale_user_id, is_active, notifications_enabled,
        department_filter, last_activity, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [
      data.employeeId,
      data.baleChatId || null,
      data.baleUserId || null,
      data.isActive !== undefined ? (data.isActive ? true : false) : true,
      data.notificationsEnabled !== undefined ? (data.notificationsEnabled ? true : false) : true,
      data.departmentFilter || null,
      data.lastActivity || null,
      data.createdBy,
      now,
      now
    ]);

    const newSettings = await this.getEmployeeBaleSettingsByEmployee(data.employeeId);
    if (!newSettings) throw new Error("Failed to create employee bale settings");
    return newSettings;
  }

  async updateEmployeeBaleSettings(id: number, data: Partial<Omit<EmployeeBaleSettings, 'id' | 'employeeId' | 'createdBy' | 'createdAt'>>): Promise<EmployeeBaleSettings> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.baleChatId !== undefined) {
      updates.push("bale_chat_id = ?");
      values.push(data.baleChatId);
    }
    if (data.baleUserId !== undefined) {
      updates.push("bale_user_id = ?");
      values.push(data.baleUserId);
    }
    if (data.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(data.isActive ? true : false);
    }
    if (data.notificationsEnabled !== undefined) {
      updates.push("notifications_enabled = ?");
      values.push(data.notificationsEnabled ? true : false);
    }
    if (data.departmentFilter !== undefined) {
      updates.push("department_filter = ?");
      values.push(data.departmentFilter);
    }
    if (data.lastActivity !== undefined) {
      updates.push("last_activity = ?");
      values.push(data.lastActivity);
    }

    if (updates.length === 0) {
      const current = await this.getEmployeeBaleSettingsByEmployee(id);
      if (!current) throw new Error("Employee bale settings not found");
      return current;
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    await db.execute(
      `UPDATE employee_bale_settings SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const currentSettings = await db.execute("SELECT employee_id FROM employee_bale_settings WHERE id = ?", [id]);
    const employeeId = (currentSettings.rows[0] as any).employee_id;
    const updated = await this.getEmployeeBaleSettingsByEmployee(employeeId);
    if (!updated) throw new Error("Failed to update employee bale settings");
    return updated;
  }

  async deleteEmployeeBaleSettings(id: number): Promise<boolean> {
    const result = await db.execute("DELETE FROM employee_bale_settings WHERE id = ?", [id]);
    return (result.rowsAffected || 0) > 0;
  }

  async getEmployees(): Promise<Array<{
    id: number;
    username: string;
    fullName: string;
    department: string | null;
    role: string;
  }>> {
    const result = await db.execute(
      "SELECT id, username, full_name, department, role FROM users WHERE role IN ('admin', 'employee') AND is_active = true ORDER BY full_name"
    );
    return result.rows.map(row => ({
      id: (row as any).id,
      username: (row as any).username,
      fullName: (row as any).full_name,
      department: (row as any).department,
      role: (row as any).role
    }));
  }

  // ==================== Contract Variables Methods (Duplicates removed) ====================

  // ==================== Contract Variable Mappings Methods ====================

  async getVariableMappings(variableId: number): Promise<any[]> {
    const result = await db.execute(`
      SELECT cvm.*, ct.name as template_name
      FROM contract_variable_mappings cvm
      JOIN contract_templates ct ON cvm.template_id = ct.id
      WHERE cvm.variable_id = ?
      ORDER BY ct.name
    `, [variableId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      templateId: row.template_id,
      templateName: row.template_name,
      variableId: row.variable_id,
      isRequired: Boolean(row.is_required),
      defaultValue: row.default_value,
      sortOrder: row.sort_order,
      createdAt: row.created_at
    }));
  }

  async getTemplateVariables(templateId: number): Promise<any[]> {
    const result = await db.execute(`
      SELECT cv.*, cvm.*,
        cv.id as variable_id,
        cvm.id as mapping_id
      FROM contract_variable_mappings cvm
      JOIN contract_variables cv ON cvm.variable_id = cv.id
      WHERE cvm.template_id = ?
      ORDER BY cvm.sort_order, cv.name
    `, [templateId]);

    return result.rows.map((row: any) => ({
      variable: {
        id: row.variable_id,
        name: row.name,
        label: row.label,
        description: row.description,
        dataType: row.data_type,
        source: row.source,
        defaultValue: row.default_value,
        isRequired: Boolean(row.is_required),
        validationRules: row.validation_rules,
        placeholder: row.placeholder,
        category: row.category,
        isActive: Boolean(row.is_active),
        sortOrder: row.sort_order
      },
      mapping: {
        id: row.mapping_id,
        templateId: row.template_id,
        variableId: row.variable_id,
        isRequired: Boolean(row.is_required),
        defaultValue: row.default_value,
        sortOrder: row.sort_order,
        createdAt: row.created_at
      }
    }));
  }

  async createVariableMapping(data: any): Promise<any> {
    const result = await db.execute(`
      INSERT INTO contract_variable_mappings (
        template_id, variable_id, is_required, default_value, sort_order
      ) VALUES (?, ?, ?, ?, ?) RETURNING id
    `, [
      data.templateId,
      data.variableId,
      data.isRequired ? true : false,
      data.defaultValue,
      data.sortOrder || 0
    ]);

    const mappingResult = await db.execute(
      "SELECT * FROM contract_variable_mappings WHERE id = ?",
      [result.rows[0].id]
    );

    const row = mappingResult.rows[0] as any;
    return {
      id: row.id,
      templateId: row.template_id,
      variableId: row.variable_id,
      isRequired: Boolean(row.is_required),
      defaultValue: row.default_value,
      sortOrder: row.sort_order,
      createdAt: row.created_at
    };
  }

  async updateVariableMapping(id: number, data: any): Promise<any> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.isRequired !== undefined) {
      updates.push('is_required = ?');
      params.push(data.isRequired ? true : false);
    }
    if (data.defaultValue !== undefined) {
      updates.push('default_value = ?');
      params.push(data.defaultValue);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sortOrder);
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    params.push(id);

    await db.execute(
      `UPDATE contract_variable_mappings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const result = await db.execute(
      "SELECT * FROM contract_variable_mappings WHERE id = ?",
      [id]
    );

    const row = result.rows[0] as any;
    return {
      id: row.id,
      templateId: row.template_id,
      variableId: row.variable_id,
      isRequired: Boolean(row.is_required),
      defaultValue: row.default_value,
      sortOrder: row.sort_order,
      createdAt: row.created_at
    };
  }

  async deleteVariableMapping(templateId: number, variableId: number): Promise<void> {
    await db.execute(
      "DELETE FROM contract_variable_mappings WHERE template_id = ? AND variable_id = ?",
      [templateId, variableId]
    );
  }

  async clearTemplateVariables(templateId: number): Promise<void> {
    await db.execute(
      "DELETE FROM contract_variable_mappings WHERE template_id = ?",
      [templateId]
    );
  }

  async getTemplateVariableMappings(): Promise<any[]> {
    const result = await db.execute(`
      SELECT ct.id as template_id, ct.name as template_name,
        cv.*, cvm.*,
        cv.id as variable_id,
        cvm.id as mapping_id
      FROM contract_templates ct
      LEFT JOIN contract_variable_mappings cvm ON ct.id = cvm.template_id
      LEFT JOIN contract_variables cv ON cvm.variable_id = cv.id
      WHERE ct.is_active = true
      ORDER BY ct.name, cvm.sort_order, cv.name
    `);

    const templateMap = new Map();

    result.rows.forEach((row: any) => {
      const templateId = row.template_id;
      
      if (!templateMap.has(templateId)) {
        templateMap.set(templateId, {
          templateId,
          templateName: row.template_name,
          variables: []
        });
      }

      if (row.variable_id) {
        templateMap.get(templateId).variables.push({
          variable: {
            id: row.variable_id,
            name: row.name,
            label: row.label,
            description: row.description,
            dataType: row.data_type,
            source: row.source,
            defaultValue: row.default_value,
            isRequired: Boolean(row.is_required),
            validationRules: row.validation_rules,
            placeholder: row.placeholder,
            category: row.category,
            isActive: Boolean(row.is_active),
            sortOrder: row.sort_order
          },
          mapping: {
            id: row.mapping_id,
            templateId: row.template_id,
            variableId: row.variable_id,
            isRequired: Boolean(row.is_required),
            defaultValue: row.default_value,
            sortOrder: row.sort_order,
            createdAt: row.created_at
          }
        });
      }
    });

    return Array.from(templateMap.values());
  }

  // ==================== Bale Employee Mappings Methods ====================

  async getBaleEmployeeMappings(): Promise<any[]> {
    const result = await db.execute(`
      SELECT bem.*, 
        u.full_name as employee_name,
        u.department as employee_department,
        creator.full_name as created_by_name
      FROM bale_employee_mappings bem
      JOIN users u ON bem.employee_id = u.id
      LEFT JOIN users creator ON bem.created_by = creator.id
      ORDER BY bem.created_at DESC
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeDepartment: row.employee_department,
      baleChatId: row.bale_chat_id,
      baleUserId: row.bale_user_id,
      isActive: Boolean(row.is_active),
      notes: row.notes,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getBaleEmployeeMappingByChatId(chatId: string): Promise<any | undefined> {
    const result = await db.execute(
      "SELECT * FROM bale_employee_mappings WHERE bale_chat_id = ?",
      [chatId]
    );

    if (result.rows.length === 0) return undefined;

    const row = result.rows[0] as any;
    return {
      id: row.id,
      employeeId: row.employee_id,
      baleChatId: row.bale_chat_id,
      baleUserId: row.bale_user_id,
      isActive: Boolean(row.is_active),
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async createBaleEmployeeMapping(data: any): Promise<any> {
    const result = await db.execute(`
      INSERT INTO bale_employee_mappings (
        employee_id, bale_chat_id, bale_user_id, is_active, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `, [
      data.employeeId,
      data.baleChatId,
      data.baleUserId,
      data.isActive !== false ? true : false,
      data.notes,
      data.createdBy
    ]);

    const mappingResult = await db.execute(
      "SELECT * FROM bale_employee_mappings WHERE id = ?",
      [result.rows[0].id]
    );

    const row = mappingResult.rows[0] as any;
    return {
      id: row.id,
      employeeId: row.employee_id,
      baleChatId: row.bale_chat_id,
      baleUserId: row.bale_user_id,
      isActive: Boolean(row.is_active),
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async updateBaleEmployeeMapping(id: number, data: any): Promise<any> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.employeeId !== undefined) {
      updates.push('employee_id = ?');
      params.push(data.employeeId);
    }
    if (data.baleChatId !== undefined) {
      updates.push('bale_chat_id = ?');
      params.push(data.baleChatId);
    }
    if (data.baleUserId !== undefined) {
      updates.push('bale_user_id = ?');
      params.push(data.baleUserId);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? true : false);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.execute(
      `UPDATE bale_employee_mappings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const result = await db.execute(
      "SELECT * FROM bale_employee_mappings WHERE id = ?",
      [id]
    );

    const row = result.rows[0] as any;
    return {
      id: row.id,
      employeeId: row.employee_id,
      baleChatId: row.bale_chat_id,
      baleUserId: row.bale_user_id,
      isActive: Boolean(row.is_active),
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async deleteBaleEmployeeMapping(id: number): Promise<void> {
    await db.execute("DELETE FROM bale_employee_mappings WHERE id = ?", [id]);
  }

  // ======================================
  // 🤖 AI CHAT SESSIONS METHODS
  // ======================================

  async createAIChatSession(data: {
    userId: number;
    companyId: number;
    title: string;
    serviceId?: number;
  }): Promise<any> {
    const result = await db.execute(
      `INSERT INTO ai_chat_sessions (user_id, company_id, title, service_id)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [data.userId, data.companyId, data.title, data.serviceId || null]
    );

    return {
      id: result.rows[0].id,
      userId: data.userId,
      companyId: data.companyId,
      title: data.title,
      serviceId: data.serviceId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getAIChatSessionsByUser(userId: number): Promise<any[]> {
    const result = await db.execute(
      `SELECT 
         s.id, s.user_id, s.company_id, s.service_id, s.title, s.created_at, s.updated_at,
         c.name as company_name,
         COUNT(m.id) as message_count,
         MAX(m.created_at) as last_message_at
       FROM ai_chat_sessions s
       LEFT JOIN companies c ON s.company_id = c.id
       LEFT JOIN ai_chat_messages m ON s.id = m.session_id
       WHERE s.user_id = ?
       GROUP BY s.id, s.user_id, s.company_id, s.service_id, s.title, s.created_at, s.updated_at, c.name
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      companyId: row.company_id,
      serviceId: row.service_id,
      title: row.title,
      companyName: row.company_name,
      messageCount: row.message_count || 0,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getAIChatSession(sessionId: number, userId?: number): Promise<any | null> {
    const query = userId 
      ? `SELECT s.*, c.name as company_name 
         FROM ai_chat_sessions s
         LEFT JOIN companies c ON s.company_id = c.id
         WHERE s.id = ? AND s.user_id = ?`
      : `SELECT s.*, c.name as company_name 
         FROM ai_chat_sessions s
         LEFT JOIN companies c ON s.company_id = c.id
         WHERE s.id = ?`;
    
    const params = userId ? [sessionId, userId] : [sessionId];
    const result = await db.execute(query, params);

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    return {
      id: row.id,
      userId: row.user_id,
      companyId: row.company_id,
      serviceId: row.service_id,
      title: row.title,
      companyName: row.company_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async updateAIChatSession(sessionId: number, data: {
    title?: string;
    updatedAt?: string;
  }): Promise<void> {
    const updates = [];
    const values = [];

    if (data.title) {
      updates.push('title = ?');
      values.push(data.title);
    }

    updates.push('updated_at = ?');
    values.push(data.updatedAt || new Date().toISOString());

    values.push(sessionId);

    await db.execute(
      `UPDATE ai_chat_sessions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteAIChatSession(sessionId: number, userId?: number): Promise<void> {
    const query = userId 
      ? 'DELETE FROM ai_chat_sessions WHERE id = ? AND user_id = ?'
      : 'DELETE FROM ai_chat_sessions WHERE id = ?';
    
    const params = userId ? [sessionId, userId] : [sessionId];
    await db.execute(query, params);
  }

  async createAIChatMessage(data: {
    sessionId: number;
    messageType: 'user' | 'ai';
    content: string;
    attachments?: string[];
  }): Promise<any> {
    const result = await db.execute(
      `INSERT INTO ai_chat_messages (session_id, message_type, content, attachments)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [
        data.sessionId,
        data.messageType,
        data.content,
        data.attachments ? JSON.stringify(data.attachments) : null
      ]
    );

    // Update session's updated_at timestamp
    await this.updateAIChatSession(data.sessionId, {});

    return {
      id: result.rows[0].id,
      sessionId: data.sessionId,
      messageType: data.messageType,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date().toISOString()
    };
  }

  async getAIChatMessages(sessionId: number): Promise<any[]> {
    const result = await db.execute(
      `SELECT id, session_id, message_type, content, attachments, created_at
       FROM ai_chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      messageType: row.message_type,
      content: row.content,
      attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments) : [],
      createdAt: row.created_at
    }));
  }

  async deleteAIChatMessage(messageId: number): Promise<void> {
    await db.execute('DELETE FROM ai_chat_messages WHERE id = ?', [messageId]);
  }

  // ====================================
  // Transaction-based operations
  // ====================================

  /**
   * Create a user and company in a single transaction
   * This ensures both are created atomically or both fail
   */
  async createUserWithCompany(
    userData: InsertUser,
    companyData: InsertCompany
  ): Promise<{ user: User; company: Company }> {
    try {
      const now = new Date().toISOString();
      
      // Execute as a batch to ensure atomicity
      const results = await executeBatch([
        // Create user
        {
          query: `INSERT INTO users (username, password, role, full_name, national_id, email, phone, department, is_active, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
          params: [
            userData.username,
            userData.password,
            userData.role,
            userData.fullName || '',
            userData.nationalId ?? null,
            userData.email ?? null,
            userData.phone ?? null,
            (userData.department ?? null) as any,
            userData.isActive !== false ? true : false,
            now,
            now
          ]
        },
        // Create company (will use the user id from first query in association)
        {
          query: `INSERT INTO companies (national_id, name, type, city, address, phone, email, website, description, status, established_year, employee_count, capital, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
          params: [
            companyData.nationalId,
            companyData.name,
            companyData.type,
            companyData.city || null,
            companyData.address || null,
            companyData.phone || null,
            companyData.email || null,
            companyData.website || null,
            companyData.description || null,
            companyData.status || 'pending',
            companyData.establishedYear || null,
            companyData.employeeCount || null,
            companyData.capital || null,
            now,
            now
          ]
        }
      ]);

      const user = results[0].rows[0] as any;
      const company = results[1].rows[0] as any;

      // Associate user with company
      await db.execute(
        `INSERT INTO user_companies (user_id, company_id, is_owner, created_at)
         VALUES (?, ?, ?, ?)`,
        [user.id, company.id, 1, now]
      );

      logger.info(`User ${user.id} created with company ${company.id}`, "storage", {
        userId: user.id,
        companyId: company.id
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          password: user.password,
          role: user.role,
          department: user.department,
          fullName: user.full_name,
          nationalId: user.national_id,
          email: user.email,
          phone: user.phone,
          profileImage: user.profile_image,
          isActive: Boolean(user.is_active),
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        } as User,
        company: {
          id: company.id,
          nationalId: company.national_id,
          name: company.name,
          type: company.type,
          status: company.status,
          primaryUnit: company.primary_unit,
          registrationNumber: company.registration_number,
          registrationDate: company.registration_date,
          capital: company.capital,
          address: company.address,
          city: company.city,
          phone: company.phone,
          email: company.email,
          website: company.website,
          description: company.description,
          establishedYear: company.established_year,
          employeeCount: company.employee_count,
          teamInfo: company.team_info,
          productInfo: company.product_info,
          marketInfo: company.market_info,
          financialInfo: company.financial_info,
          rasmioData: company.rasmio_data,
          aiAnalysisData: company.ai_analysis_data,
          createdAt: company.created_at,
          updatedAt: company.updated_at,
        } as Company
      };
    } catch (error) {
      logger.error("Failed to create user with company", "storage", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update multiple related entities atomically
   * Example: Update company status and create audit log
   */
  async updateCompanyWithAudit(
    companyId: number,
    updateData: Partial<Company>,
    auditData: Omit<AuditLog, 'id' | 'createdAt'>
  ): Promise<Company | undefined> {
    try {
      const now = new Date().toISOString();
      
      await executeBatch([
        // Update company
        {
          query: `UPDATE companies SET status = ?, updated_at = ? WHERE id = ?`,
          params: [updateData.status, now, companyId]
        },
        // Create audit log
        {
          query: `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            auditData.userId,
            auditData.action,
            auditData.resource,
            auditData.resourceId,
            auditData.details,
            auditData.ipAddress,
            auditData.userAgent,
            now
          ]
        }
      ]);

      return this.getCompany(companyId);
    } catch (error) {
      logger.error("Failed to update company with audit", "storage", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all documents (alias for getAllDocuments for backward compatibility)
   */
  async getDocuments(): Promise<Document[]> {
    const result = await db.execute("SELECT * FROM documents ORDER BY created_at DESC");
    return result.rows.map((row: any) => this.mapRowToDocument(row));
  }

  /**
   * Get all users (alias for getAllUsers for backward compatibility)
   */
  async getUsers(): Promise<any[]> {
    return this.getAllUsers();
  }

  // ================================
  // Financial Formulas Methods
  // ================================

  /**
   * Get all financial formulas
   */
  async getFinancialFormulas(): Promise<any[]> {
    try {
      const result = await db.execute(`
        SELECT 
          ff.*,
          irv.name as variable_name,
          irv.label as variable_label
        FROM financial_formulas ff
        LEFT JOIN investment_report_variables irv ON ff.variable_id = irv.id
        WHERE ff.is_active = true
        ORDER BY ff.execution_order
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching financial formulas', 'storage', error as Error);
      return [];
    }
  }

  /**
   * Get a single financial formula
   */
  async getFinancialFormula(id: number): Promise<any | undefined> {
    try {
      const result = await db.execute(`
        SELECT 
          ff.*,
          irv.name as variable_name,
          irv.label as variable_label
        FROM financial_formulas ff
        LEFT JOIN investment_report_variables irv ON ff.variable_id = irv.id
        WHERE ff.id = ?
      `, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching financial formula', 'storage', error as Error);
      return undefined;
    }
  }

  /**
   * Get dependencies for a formula
   */
  async getFormulaDependencies(formulaId: number): Promise<number[]> {
    try {
      const result = await db.execute(`
        SELECT depends_on_variable_id
        FROM formula_dependencies
        WHERE formula_id = ?
      `, [formulaId]);
      return result.rows.map((row: any) => row.depends_on_variable_id);
    } catch (error) {
      logger.error('Error fetching formula dependencies', 'storage', error as Error);
      return [];
    }
  }

  /**
   * Get investment report variables with optional filtering
   */
  async getInvestmentReportVariables(filters?: { category?: string; source?: string }): Promise<any[]> {
    try {
      let query = 'SELECT * FROM investment_report_variables WHERE 1=1';
      const params: any[] = [];

      if (filters?.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters?.source) {
        query += ' AND source = ?';
        params.push(filters.source);
      }

      query += ' ORDER BY sort_order, name';

      const result = await db.execute(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching investment report variables', 'storage', error as Error);
      return [];
    }
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
