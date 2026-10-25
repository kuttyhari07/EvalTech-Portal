import { Router } from 'express';
import { QuestionController } from '../controllers/question.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Question Banks
router.get('/banks', QuestionController.listQuestionBanks);
router.post('/banks', QuestionController.createQuestionBank);
router.get('/banks/:id', QuestionController.getQuestionBankById);
router.put('/banks/:id', QuestionController.updateQuestionBank);
router.delete('/banks/:id', QuestionController.deleteQuestionBank);
router.post('/banks/:id/questions', QuestionController.addQuestionsToBank);
router.delete('/banks/:id/questions/:questionId', QuestionController.removeQuestionFromBank);

// Individual Questions
router.post('/', QuestionController.createQuestion);
router.get('/', QuestionController.listQuestions);
router.put('/:id', QuestionController.updateQuestion);
router.delete('/:id', QuestionController.deleteQuestion);

export default router;
