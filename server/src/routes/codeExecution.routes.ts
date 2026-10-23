import { Router } from 'express';
import { CodeExecutionController } from '../controllers/codeExecution.controller';
import { verifySafeExamBrowser } from '../middleware/seb';

const router = Router();

// Student code execution and submission endpoints with SEB protection
router.post('/run', verifySafeExamBrowser, CodeExecutionController.runCode);
router.post('/submit', verifySafeExamBrowser, CodeExecutionController.submitSolution);
router.get('/submissions/:submissionId', CodeExecutionController.getSubmission);
router.get('/attempts/:attemptId/submissions', verifySafeExamBrowser, CodeExecutionController.getAttemptSubmissions);
router.post('/attempts/:attemptId/draft-code', verifySafeExamBrowser, CodeExecutionController.saveDraftCode);
router.get('/attempts/:attemptId/draft-code/:questionId', verifySafeExamBrowser, CodeExecutionController.getDraftCode);

export default router;
