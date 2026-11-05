import { Router } from 'express';
import { UpiPaymentController } from '../controllers/upiPayment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Staff Direct UPI Endpoints
router.post('/create-order', authenticate, UpiPaymentController.createOrder);
router.post('/submit-utr', authenticate, UpiPaymentController.submitUtr);
router.get('/status/:paymentId', authenticate, UpiPaymentController.checkStatus);

// 100% Automated Public Webhook (PhonePe Business / Paytm / BharatPe / Custom Webhook)
router.post('/webhook', UpiPaymentController.handleWebhook);

export default router;

