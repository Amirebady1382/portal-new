import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { adminManagementController } from '../controllers/admin-management.controller';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authMiddleware);
router.use(requireRole(['admin']));

// Contract Variables routes
router.get('/contract-variables', adminManagementController.getContractVariables.bind(adminManagementController));
router.get('/contract-variables/stats', adminManagementController.getVariablesStats.bind(adminManagementController));
router.get('/contract-variables/category/:category', adminManagementController.getVariablesByCategory.bind(adminManagementController));
router.get('/contract-variables/:id', adminManagementController.getContractVariable.bind(adminManagementController));
router.post('/contract-variables', adminManagementController.createContractVariable.bind(adminManagementController));
router.put('/contract-variables/:id', adminManagementController.updateContractVariable.bind(adminManagementController));
router.delete('/contract-variables/:id', adminManagementController.deleteContractVariable.bind(adminManagementController));
router.post('/contract-variables/:id/toggle', adminManagementController.toggleVariableStatus.bind(adminManagementController));

// Employee Bale Settings routes
router.get('/employee-bale-settings', adminManagementController.getEmployeeBaleSettings.bind(adminManagementController));
router.post('/employee-bale-settings', adminManagementController.upsertEmployeeBaleSettings.bind(adminManagementController));
router.delete('/employee-bale-settings/:employeeId', adminManagementController.deleteEmployeeBaleSettings.bind(adminManagementController));
router.post('/employee-bale-settings/:employeeId/toggle-status', adminManagementController.toggleEmployeeStatus.bind(adminManagementController));
router.post('/employee-bale-settings/:employeeId/toggle-notifications', adminManagementController.toggleNotifications.bind(adminManagementController));

export default router;
