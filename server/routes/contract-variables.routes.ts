import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth";
import { contractVariablesController } from "../controllers/contract-variables.controller";
import { storage } from "../storage";

const router = Router();

// Helper middleware for admin routes
const adminAuth = [authMiddleware, requireRole(["admin"])];

// Contract Variables routes
router.get("/admin/contract-variables", adminAuth as any, contractVariablesController.getContractVariables.bind(contractVariablesController));
router.get("/admin/contract-variables/categories", adminAuth as any, contractVariablesController.getVariableCategories.bind(contractVariablesController));
router.get("/admin/contract-variables/:id", adminAuth as any, contractVariablesController.getContractVariable.bind(contractVariablesController));
router.post("/admin/contract-variables", adminAuth as any, contractVariablesController.createContractVariable.bind(contractVariablesController));
router.put("/admin/contract-variables/:id", adminAuth as any, contractVariablesController.updateContractVariable.bind(contractVariablesController));
router.delete("/admin/contract-variables/:id", adminAuth as any, contractVariablesController.deleteContractVariable.bind(contractVariablesController));

// Variable detection and bulk operations
router.post("/admin/contract-variables/detect", adminAuth as any, contractVariablesController.detectTemplateVariables.bind(contractVariablesController));
router.post("/admin/contract-variables/bulk-create", adminAuth as any, contractVariablesController.bulkCreateVariables.bind(contractVariablesController));

// Template-Variable Mapping routes
router.get("/admin/template-variable-mappings", adminAuth as any, contractVariablesController.getTemplateVariableMappings.bind(contractVariablesController));
router.get("/admin/contract-templates/:templateId/variables", adminAuth as any, contractVariablesController.getTemplateVariables.bind(contractVariablesController));
router.post("/admin/contract-templates/:templateId/variables", adminAuth as any, contractVariablesController.mapVariablesToTemplate.bind(contractVariablesController));
router.delete("/admin/contract-templates/:templateId/variables/:variableId", adminAuth as any, contractVariablesController.removeVariableFromTemplate.bind(contractVariablesController));

// Bale Employee Mapping routes
router.get("/admin/bale-employee-mappings", adminAuth as any, contractVariablesController.getBaleEmployeeMappings.bind(contractVariablesController));
router.post("/admin/bale-employee-mappings", adminAuth as any, contractVariablesController.createBaleEmployeeMapping.bind(contractVariablesController));
router.put("/admin/bale-employee-mappings/:id", adminAuth as any, contractVariablesController.updateBaleEmployeeMapping.bind(contractVariablesController));
router.delete("/admin/bale-employee-mappings/:id", adminAuth as any, contractVariablesController.deleteBaleEmployeeMapping.bind(contractVariablesController));

// Helper endpoints
router.get("/admin/employees-dropdown", adminAuth as any, async (req, res) => {
  try {
    const employees = await storage.getEmployeesForDropdown();
    res.json({ success: true, employees });
  } catch (error) {
    console.error('Error getting employees dropdown:', error);
    res.status(500).json({
      success: false,
      message: "خطا در دریافت لیست کارمندان"
    });
  }
});

// ========================================
// Variable Form Field Mappings Routes
// ========================================

// دریافت تمام mappings یک متغیر
router.get("/contract-variables/:variableId/form-mappings", adminAuth as any, async (req, res) => {
  try {
    const variableId = parseInt(req.params.variableId);
    const mappings = await storage.getVariableFormFieldMappings(variableId);
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error getting variable form mappings:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "خطا در دریافت mappings"
    });
  }
});

// دریافت تمام mappings یک فرم
router.get("/forms/:formId/variable-mappings", adminAuth as any, async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    const mappings = await storage.getMappingsByForm(formId);
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error getting form mappings:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "خطا در دریافت mappings"
    });
  }
});

// ایجاد mapping جدید
router.post("/variable-form-mappings", adminAuth as any, async (req, res) => {
  try {
    const { variableId, requirementId, fieldName, priority } = req.body;
    const createdBy = (req as any).user?.id;

    if (!variableId || !requirementId || !fieldName) {
      res.status(400).json({
        success: false,
        message: "variableId، requirementId و fieldName الزامی هستند"
      });
      return;
    }

    const mapping = await storage.createVariableFormFieldMapping({
      variableId: parseInt(variableId),
      requirementId: parseInt(requirementId),
      fieldName,
      priority: priority ? parseInt(priority) : 1,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: "Mapping با موفقیت ایجاد شد",
      mapping
    });
  } catch (error) {
    console.error('Error creating variable form mapping:', error);
    const message = error instanceof Error ? error.message : "خطا در ایجاد mapping";
    res.status(400).json({ success: false, message });
  }
});

// ایجاد چند mapping یکجا (bulk)
router.post("/variable-form-mappings/bulk", adminAuth as any, async (req, res) => {
  try {
    const { mappings } = req.body;
    const createdBy = (req as any).user?.id;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      res.status(400).json({
        success: false,
        message: "mappings باید یک آرایه غیر خالی باشد"
      });
      return;
    }

    // اضافه کردن createdBy به هر mapping
    const mappingsWithCreator = mappings.map((m: any) => ({
      ...m,
      createdBy
    }));

    const results = await storage.bulkCreateVariableFormFieldMappings(mappingsWithCreator);

    res.status(201).json({
      success: true,
      message: `${results.created.length} mapping ایجاد شد، ${results.skipped.length} skip شد، ${results.errors.length} خطا`,
      results
    });
  } catch (error) {
    console.error('Error bulk creating mappings:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "خطا در ایجاد bulk mappings"
    });
  }
});

// به‌روزرسانی mapping
router.put("/variable-form-mappings/:id", adminAuth as any, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fieldName, priority, isActive } = req.body;

    const updates: any = {};
    if (fieldName !== undefined) updates.fieldName = fieldName;
    if (priority !== undefined) updates.priority = parseInt(priority);
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await storage.updateVariableFormFieldMapping(id, updates);

    res.json({
      success: true,
      message: "Mapping با موفقیت به‌روزرسانی شد",
      mapping: updated
    });
  } catch (error) {
    console.error('Error updating variable form mapping:', error);
    const message = error instanceof Error ? error.message : "خطا در به‌روزرسانی mapping";
    res.status(400).json({ success: false, message });
  }
});

// حذف mapping
router.delete("/variable-form-mappings/:id", adminAuth as any, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteVariableFormFieldMapping(id);

    if (deleted) {
      res.json({
        success: true,
        message: "Mapping با موفقیت حذف شد"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Mapping یافت نشد"
      });
    }
  } catch (error) {
    console.error('Error deleting variable form mapping:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "خطا در حذف mapping"
    });
  }
});

export { router as contractVariablesRoutes };
