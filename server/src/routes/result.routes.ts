import { Router } from 'express';
import { ResultController } from '../controllers/result.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Student access endpoints for released results & analytics
router.get('/student-view', ResultController.getStudentReleasedResult);
router.get('/student/analytics', optionalAuthenticate, ResultController.getStudentAnalytics);

// Teacher/Admin endpoints
router.use(authenticate);

router.get('/exam/:examId', ResultController.getExamResults);
router.get('/exam/:examId/export-csv', ResultController.exportExamResultsCsv);
router.post('/grade/:attemptId/:questionId', ResultController.gradeSubjectiveQuestion);
router.post('/release/:examId', ResultController.toggleReleaseResults);
router.post('/email/:examId', ResultController.emailResultsToStudents);

export default router;
