import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

router.get('/my-org', authenticate, OrganizationController.getMyOrganization);
router.put('/my-org', authenticate, requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), OrganizationController.updateOrganization);
router.get('/staff', authenticate, requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), OrganizationController.listStaff);
router.post('/invite-staff', authenticate, requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), OrganizationController.inviteStaff);
router.post('/accept-invitation', OrganizationController.acceptInvitation);
router.delete('/staff/:membershipId', authenticate, requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), OrganizationController.removeStaff);
router.get('/analytics', authenticate, requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), OrganizationController.getAnalytics);

export default router;
