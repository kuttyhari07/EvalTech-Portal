import { Router } from 'express';
import { ExamController } from '../controllers/exam.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

// Public route for students to view exam summary via code
router.get('/code/:code', ExamController.getPublicExamByCode);
router.get('/code/:code/seb-config', ExamController.downloadSebConfig);
router.get('/:id/seb-config', ExamController.downloadSebConfig);

// Protected routes
router.use(authenticate);

router.post('/', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.createExam);
router.get('/', ExamController.listExams);
router.get('/:id', ExamController.getExamById);
router.put('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.updateExam);
router.delete('/:id', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.deleteExam);
router.post('/:id/publish', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.publishExam);
router.post('/:id/unpublish', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.unpublishExam);
router.get('/:id/live-monitoring', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.getLiveMonitoring);
router.post('/:id/live-broadcast', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.broadcastLiveMessage);
router.post('/:id/force-terminate/:attemptId', requireRoles(ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), ExamController.forceTerminateAttempt);

export default router;
