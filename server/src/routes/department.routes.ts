import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

router.use(authenticate);

router.post('/', requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), DepartmentController.createDepartment);
router.get('/', DepartmentController.listDepartments);
router.get('/:id', DepartmentController.getDepartmentById);
router.put('/:id', requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), DepartmentController.updateDepartment);
router.delete('/:id', requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), DepartmentController.deleteDepartment);
router.post(
  '/:id/assign-staff',
  requireRoles(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN),
  DepartmentController.assignStaffToDepartment
);

export default router;

