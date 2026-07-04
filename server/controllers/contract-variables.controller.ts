import { Response } from "express";
import { contractVariablesService } from "../services/contract-variables.service";
import { storage } from "../storage";
import type { AuthRequest } from "../middleware/auth";

export class ContractVariablesController {
  
  /**
   * GET /api/admin/contract-variables - Get all contract variables (merged with investment variables)
   */
  async getContractVariables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, source, isActive } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (source) filters.source = source as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      // دریافت متغیرهای قرارداد
      const contractVariables = await contractVariablesService.getContractVariables(filters);
      
      // دریافت متغیرهای ارزیابی مالی
      const investmentVariables = await storage.getInvestmentReportVariables(filters);
      
      // تبدیل investment variables به فرمت contract variables
      const formattedInvestmentVars = investmentVariables.map((v: any) => ({
        id: `inv_${v.id}`, // prefix برای جلوگیری از conflict با ID
        name: v.name,
        label: v.label,
        description: v.description,
        dataType: v.data_type,
        source: v.source,
        category: v.category,
        defaultValue: v.default_value,
        isRequired: v.is_required,
        placeholder: v.placeholder,
        validationRules: v.validation_rules,
        sortOrder: v.sort_order,
        isActive: v.is_active !== 0,
        _sourceTable: 'investment_report_variables' // علامت برای شناسایی منبع
      }));

      // Merge دو لیست
      const allVariables = [...contractVariables, ...formattedInvestmentVars];

      // حذف تکراری‌ها بر اساس name
      const uniqueVariables = allVariables.reduce((acc: any[], current: any) => {
        const existingIndex = acc.findIndex(v => v.name === current.name);
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // اولویت با contract_variables (اگر تکراری بود، همون قبلی رو نگه دار)
          console.log(`⚠️ Duplicate variable: ${current.name}, keeping contract_variables version`);
        }
        return acc;
      }, []);

      console.log(`✅ Merged variables: ${contractVariables.length} contract + ${formattedInvestmentVars.length} investment = ${uniqueVariables.length} unique`);
      
      res.json({
        success: true,
        variables: uniqueVariables,
        total: uniqueVariables.length,
        breakdown: {
          contractVariables: contractVariables.length,
          investmentVariables: formattedInvestmentVars.length,
          unique: uniqueVariables.length
        }
      });
    } catch (error) {
      console.error("Get contract variables error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در دریافت متغیرهای قرارداد" 
      });
    }
  }

  /**
   * GET /api/admin/contract-variables/:id - Get contract variable by ID
   */
  async getContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      const variable = await contractVariablesService.getContractVariable(id);
      
      if (!variable) {
        res.status(404).json({ 
          success: false, 
          message: "متغیر قرارداد یافت نشد" 
        });
        return;
      }

      res.json({
        success: true,
        variable
      });
    } catch (error) {
      console.error("Get contract variable error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در دریافت متغیر قرارداد" 
      });
    }
  }

  /**
   * POST /api/admin/contract-variables - Create new contract variable
   */
  async createContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name, label, description, dataType, source, defaultValue,
        isRequired, validationRules, placeholder, category, sortOrder
      } = req.body;

      if (!name || !label) {
        res.status(400).json({ 
          success: false, 
          message: "نام و برچسب متغیر الزامی است" 
        });
        return;
      }

      const variable = await contractVariablesService.createContractVariable({
        name: name.trim(),
        label: label.trim(),
        description,
        dataType: dataType || 'text',
        source: source || 'form',
        defaultValue,
        isRequired: isRequired || false,
        validationRules,
        placeholder,
        category,
        sortOrder: sortOrder || 0,
        createdBy: req.user.userId
      });

      res.status(201).json({
        success: true,
        variable,
        message: "متغیر قرارداد با موفقیت ایجاد شد"
      });
    } catch (error) {
      console.error("Create contract variable error:", error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطای سیستم در ایجاد متغیر قرارداد" 
        });
      }
    }
  }

  /**
   * PUT /api/admin/contract-variables/:id - Update contract variable
   */
  async updateContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const {
        name, label, description, dataType, source, defaultValue,
        isRequired, validationRules, placeholder, category, sortOrder, isActive
      } = req.body;

      const variable = await contractVariablesService.updateContractVariable(id, {
        name: name?.trim(),
        label: label?.trim(),
        description,
        dataType,
        source,
        defaultValue,
        isRequired,
        validationRules,
        placeholder,
        category,
        sortOrder,
        isActive
      });

      res.json({
        success: true,
        variable,
        message: "متغیر قرارداد با موفقیت به‌روزرسانی شد"
      });
    } catch (error) {
      console.error("Update contract variable error:", error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطای سیستم در به‌روزرسانی متغیر قرارداد" 
        });
      }
    }
  }

  /**
   * DELETE /api/admin/contract-variables/:id - Delete contract variable
   */
  async deleteContractVariable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      await contractVariablesService.deleteContractVariable(id);

      res.json({
        success: true,
        message: "متغیر قرارداد با موفقیت حذف شد"
      });
    } catch (error) {
      console.error("Delete contract variable error:", error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطای سیستم در حذف متغیر قرارداد" 
        });
      }
    }
  }

  /**
   * GET /api/admin/contract-variables/categories - Get variable categories
   */
  async getVariableCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const categories = await contractVariablesService.getVariableCategories();

      res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error("Get variable categories error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در دریافت دسته‌بندی‌های متغیر" 
      });
    }
  }

  /**
   * GET /api/admin/template-variable-mappings - Get all template-variable mappings
   */
  async getTemplateVariableMappings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mappings = await contractVariablesService.getTemplateVariableMappings();

      res.json({
        success: true,
        mappings
      });
    } catch (error) {
      console.error("Get template variable mappings error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در دریافت mapping های قالب-متغیر" 
      });
    }
  }

  /**
   * GET /api/admin/contract-templates/:templateId/variables - Get variables for template
   */
  async getTemplateVariables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.templateId);
      
      const variables = await contractVariablesService.getTemplateVariables(templateId);

      res.json({
        success: true,
        variables
      });
    } catch (error) {
      console.error("Get template variables error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در دریافت متغیرهای قالب" 
      });
    }
  }

  /**
   * POST /api/admin/contract-templates/:templateId/variables - Map variables to template
   */
  async mapVariablesToTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.templateId);
      const { variables } = req.body;

      if (!Array.isArray(variables)) {
        res.status(400).json({ 
          success: false, 
          message: "لیست متغیرها باید آرایه باشد" 
        });
        return;
      }

      await contractVariablesService.bulkUpdateTemplateVariables(templateId, variables);

      res.json({
        success: true,
        message: "متغیرها با موفقیت به قالب وصل شدند"
      });
    } catch (error) {
      console.error("Map variables to template error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در وصل کردن متغیرها به قالب" 
      });
    }
  }

  /**
   * DELETE /api/admin/contract-templates/:templateId/variables/:variableId - Remove variable from template
   */
  async removeVariableFromTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.templateId);
      const variableId = parseInt(req.params.variableId);

      await contractVariablesService.removeVariableFromTemplate(templateId, variableId);

      res.json({
        success: true,
        message: "متغیر از قالب حذف شد"
      });
    } catch (error) {
      console.error("Remove variable from template error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در حذف متغیر از قالب" 
      });
    }
  }

  /**
   * GET /api/admin/bale-employee-mappings - Get Bale employee mappings
   */
  async getBaleEmployeeMappings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const mappings = await contractVariablesService.getBaleEmployeeMappings();

      res.json({
        success: true,
        mappings
      });
    } catch (error) {
      console.error("Get Bale employee mappings error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در دریافت mapping های کارمندان بله" 
      });
    }
  }

  /**
   * POST /api/admin/bale-employee-mappings - Create Bale employee mapping
   */
  async createBaleEmployeeMapping(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId, baleChatId, baleUserId, notes } = req.body;

      if (!employeeId || !baleChatId) {
        res.status(400).json({ 
          success: false, 
          message: "شناسه کارمند و Chat ID الزامی است" 
        });
        return;
      }

      const mapping = await contractVariablesService.createBaleEmployeeMapping({
        employeeId,
        baleChatId: baleChatId.trim(),
        baleUserId: baleUserId?.trim(),
        notes,
        createdBy: req.user.userId
      });

      res.status(201).json({
        success: true,
        mapping,
        message: "mapping کارمند بله با موفقیت ایجاد شد"
      });
    } catch (error) {
      console.error("Create Bale employee mapping error:", error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطای سیستم در ایجاد mapping کارمند بله" 
        });
      }
    }
  }

  /**
   * PUT /api/admin/bale-employee-mappings/:id - Update Bale employee mapping
   */
  async updateBaleEmployeeMapping(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { employeeId, baleChatId, baleUserId, notes, isActive } = req.body;

      const mapping = await contractVariablesService.updateBaleEmployeeMapping(id, {
        employeeId,
        baleChatId: baleChatId?.trim(),
        baleUserId: baleUserId?.trim(),
        notes,
        isActive
      });

      res.json({
        success: true,
        mapping,
        message: "mapping کارمند بله با موفقیت به‌روزرسانی شد"
      });
    } catch (error) {
      console.error("Update Bale employee mapping error:", error);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "خطای سیستم در به‌روزرسانی mapping کارمند بله" 
        });
      }
    }
  }

  /**
   * DELETE /api/admin/bale-employee-mappings/:id - Delete Bale employee mapping
   */
  async deleteBaleEmployeeMapping(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      await contractVariablesService.deleteBaleEmployeeMapping(id);

      res.json({
        success: true,
        message: "mapping کارمند بله با موفقیت حذف شد"
      });
    } catch (error) {
      console.error("Delete Bale employee mapping error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در حذف mapping کارمند بله" 
      });
    }
  }

  /**
   * POST /api/admin/contract-variables/detect - Auto-detect variables from template content
   */
  async detectTemplateVariables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ 
          success: false, 
          message: "محتوای قالب الزامی است" 
        });
        return;
      }

      const variables = await contractVariablesService.detectTemplateVariables(content);
      
      // Suggest sources and labels for detected variables
      const suggestions = variables.map(variableName => {
        const suggestion = contractVariablesService.suggestVariableSource(variableName);
        return {
          name: variableName,
          ...suggestion
        };
      });

      res.json({
        success: true,
        variables: suggestions,
        total: suggestions.length
      });
    } catch (error) {
      console.error("Detect template variables error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در تشخیص متغیرهای قالب" 
      });
    }
  }

  /**
   * POST /api/admin/contract-variables/bulk-create - Bulk create variables
   */
  async bulkCreateVariables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { variables } = req.body;

      if (!Array.isArray(variables) || variables.length === 0) {
        res.status(400).json({ 
          success: false, 
          message: "لیست متغیرها باید آرایه غیرخالی باشد" 
        });
        return;
      }

      const createdVariables = [];
      const errors = [];

      for (let i = 0; i < variables.length; i++) {
        const variableData = variables[i];
        try {
          const variable = await contractVariablesService.createContractVariable({
            ...variableData,
            createdBy: req.user.userId,
            sortOrder: i + 1
          });
          createdVariables.push(variable);
        } catch (error) {
          errors.push({
            index: i,
            name: variableData.name,
            error: error instanceof Error ? error.message : 'خطای نامشخص'
          });
        }
      }

      res.json({
        success: true,
        createdVariables,
        errors,
        message: `${createdVariables.length} متغیر ایجاد شد. ${errors.length} خطا.`
      });
    } catch (error) {
      console.error("Bulk create variables error:", error);
      res.status(500).json({ 
        success: false, 
        message: "خطای سیستم در ایجاد گروهی متغیرها" 
      });
    }
  }
}

export const contractVariablesController = new ContractVariablesController();
