import { Router } from 'express';
import { ClassController } from '../controllers/class.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

router.use(authenticate);

router.post('/', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ClassController.createClass);
router.get('/', ClassController.listClasses);
router.get('/:id', ClassController.getClassById);
router.put('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ClassController.updateClass);
router.delete('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ClassController.deleteClass);

export default router;
