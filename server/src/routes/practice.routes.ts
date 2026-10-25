import { Router } from 'express';
import { PracticeController } from '../controllers/practice.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', PracticeController.getPracticeStats);
router.get('/topics', PracticeController.getPracticeTopics);
router.post('/quiz', PracticeController.generateQuiz);
router.post('/generate-quiz', PracticeController.generateQuiz);
router.post('/run', PracticeController.runCode);
router.post('/run-code', PracticeController.runCode);
router.post('/submit', PracticeController.submitQuiz);
router.post('/submit-quiz', PracticeController.submitQuiz);

export default router;
