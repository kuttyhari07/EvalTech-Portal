import { Router } from 'express';
import { AIAdvancedController } from '../controllers/aiAdvanced.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 1. AI Socratic Viva
router.post('/socratic-viva/generate', AIAdvancedController.generateSocraticViva);
router.post('/socratic-viva/evaluate', AIAdvancedController.evaluateSocraticViva);

// 4. Adversarial AI Mutation Testing
router.post('/mutation-test', AIAdvancedController.runMutationTest);

// 5. Constrained AI Co-Pilot Pair-Programming
router.post('/copilot-assist', AIAdvancedController.copilotAssist);

// 2. Keystroke Snapshots for Thought Playback
router.post('/attempts/:attemptId/keystroke-snapshot', AIAdvancedController.saveKeystrokeSnapshot);
router.get('/attempts/:attemptId/thought-playback', authenticate, AIAdvancedController.getThoughtPlayback);

// 6. Skill DNA & GitHub / LinkedIn Portfolio Export
router.get('/results/:resultId/portfolio', AIAdvancedController.getPortfolioBundle);
router.get('/credential/:token', AIAdvancedController.getVerifiedCredential);

export default router;
