import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate, requireRoles } from '../middleware/auth';
import { ROLES } from '../constants';

const router = Router();

router.get('/plans', SubscriptionController.listPlans);

router.use(authenticate);

router.get('/my-subscription', SubscriptionController.getMySubscription);
router.post('/checkout', SubscriptionController.createCheckoutOrder);
router.post('/verify', SubscriptionController.verifyPayment);
router.put('/plans/:id', requireRoles(ROLES.SUPER_ADMIN), SubscriptionController.updatePlan);

export default router;
