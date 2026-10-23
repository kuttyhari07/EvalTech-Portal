import { Router } from 'express';
import { AttemptController } from '../controllers/attempt.controller';
import { examSaveLimiter } from '../middleware/rateLimiter';
import { verifySafeExamBrowser } from '../middleware/seb';

const router = Router();

// Student exam interaction routes (secured via submissionToken, examCode, and SEB verification)
router.post('/start', verifySafeExamBrowser, AttemptController.startOrResume);
router.post('/:id/answer', verifySafeExamBrowser, examSaveLimiter, AttemptController.saveAnswer);
router.post('/:id/event', AttemptController.recordClientEvent);
router.post('/:id/submit', verifySafeExamBrowser, AttemptController.submitAttempt);

export default router;

