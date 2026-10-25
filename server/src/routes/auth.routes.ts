import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/student-login', authLimiter, AuthController.studentLogin);
router.post('/student/change-password', authenticate, AuthController.changeStudentPassword);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', optionalAuthenticate, AuthController.getCurrentUser);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

export default router;
