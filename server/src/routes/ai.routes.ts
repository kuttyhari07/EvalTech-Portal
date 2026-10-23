import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/generate-questions', AIController.generateQuestions);
router.post('/save-approved', AIController.saveApprovedQuestions);
router.post('/assistant', AIController.assistantDraft);

export default router;
