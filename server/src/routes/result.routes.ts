import { Router } from 'express';
import { ResultController } from '../controllers/result.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Student access endpoint for released results
router.get('/student-view', ResultController.getStudentReleasedResult);

// Teacher/Admin endpoints
router.use(authenticate);

router.get('/exam/:examId', ResultController.getExamResults);
router.post('/grade/:attemptId/:questionId', ResultController.gradeSubjectiveQuestion);
router.post('/release/:examId', ResultController.toggleReleaseResults);
router.post('/email/:examId', ResultController.emailResultsToStudents);

export default router;
