import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Code review accessible by students on scorecards or instructors
router.post('/review-code', optionalAuthenticate, AIController.reviewCode);

// Protected instructor question creation routes
router.use(authenticate);

router.post('/generate-questions', AIController.generateQuestions);
router.post('/generate-programming-question', AIController.generateProgrammingQuestion);
router.post('/generate-from-document', AIController.generateFromDocument);
router.post('/create-bank-with-questions', AIController.createBankWithQuestions);
router.post('/save-approved', AIController.saveApprovedQuestions);
router.post('/assistant', AIController.assistantDraft);

export default router;
