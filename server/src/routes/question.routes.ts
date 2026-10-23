import { Router } from 'express';
import { QuestionController } from '../controllers/question.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', QuestionController.createQuestion);
router.get('/', QuestionController.listQuestions);
router.put('/:id', QuestionController.updateQuestion);
router.delete('/:id', QuestionController.deleteQuestion);

// Question Banks
router.get('/banks', QuestionController.listQuestionBanks);
router.post('/banks', QuestionController.createQuestionBank);

export default router;
