import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

// Strictly Super Admin only
router.use(authenticate, requireRoles(ROLES.SUPER_ADMIN));

router.get('/overview', AdminController.getPlatformOverview);
router.get('/users', AdminController.listUsers);
router.put('/users/:id/status', AdminController.updateUserStatus);
router.get('/organizations', AdminController.listOrganizations);
router.get('/audit-logs', AdminController.listAuditLogs);
router.get('/payments', AdminController.listPayments);
router.get('/settings', AdminController.getPlatformSettings);
router.post('/settings', AdminController.updatePlatformSetting);

export default router;
