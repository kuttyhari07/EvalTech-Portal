import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

router.use(authenticate);

router.post('/', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), StudentController.addStudent);
router.post('/batch-import', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), StudentController.batchImport);
router.get('/', StudentController.listStudents);
router.delete('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), StudentController.archiveStudent);

export default router;
