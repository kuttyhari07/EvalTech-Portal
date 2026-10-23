import { Router } from 'express';
import { ExamController } from '../controllers/exam.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

// Public route for students to view exam summary via code
router.get('/code/:code', ExamController.getPublicExamByCode);

// Protected routes
router.use(authenticate);

router.post('/', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.createExam);
router.get('/', ExamController.listExams);
router.get('/:id', ExamController.getExamById);
router.put('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.updateExam);
router.delete('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.deleteExam);
router.post('/:id/publish', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.publishExam);
router.post('/:id/unpublish', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.unpublishExam);

export default router;
