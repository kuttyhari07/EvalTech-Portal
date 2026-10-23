import { Router } from 'express';
import { ProgrammingQuestionController } from '../controllers/programmingQuestion.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

const teacherRoles = [ROLES.STAFF, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN];

// All programming question authoring requires staff/admin roles
router.use(authenticate);
router.use(requireRoles(...teacherRoles));

router.post('/', ProgrammingQuestionController.create);
router.get('/', ProgrammingQuestionController.list);
router.get('/:id', ProgrammingQuestionController.getById);
router.patch('/:id', ProgrammingQuestionController.update);
router.delete('/:id', ProgrammingQuestionController.delete);

// Test Cases Sub-routes
router.post('/:id/test-cases', ProgrammingQuestionController.addTestCase);
router.patch('/:id/test-cases/:testCaseId', ProgrammingQuestionController.updateTestCase);
router.delete('/:id/test-cases/:testCaseId', ProgrammingQuestionController.deleteTestCase);

// Validation and Publishing
router.post('/:id/validate', ProgrammingQuestionController.validate);
router.post('/:id/publish', ProgrammingQuestionController.publish);

export default router;
