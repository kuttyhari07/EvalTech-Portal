import { Router } from 'express';
import { PracticeController } from '../controllers/practice.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', PracticeController.getPracticeStats);
router.get('/topics', PracticeController.getPracticeTopics);
router.post('/generate-quiz', PracticeController.generateQuiz);
router.post('/submit-quiz', PracticeController.submitQuiz);

export default router;
