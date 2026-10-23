import { Router } from 'express';
import { StudentPortalController } from '../controllers/studentPortal.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

// All routes require student authentication
router.use(authenticate, requireRoles(ROLES.STUDENT));

router.get('/dashboard', StudentPortalController.getDashboard);
router.get('/leaderboard', StudentPortalController.getLeaderboard);

export default router;
