import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { UpiPaymentService } from '../services/upiPayment.service';
import { Payment } from '../models';

export class UpiPaymentController {
  /**
   * Initialize a direct UPI payment order with dynamic QR code
   */
  static async createOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { planId, billingCycle = 'monthly' } = req.body;
      const userId = req.user!.userId;
      const orgId = req.user?.organizationId;
      const targetType = orgId ? 'organization' : 'staff';
      const targetId = (orgId || userId).toString();

      if (!planId) {
        sendError(res, 'Plan ID is required', 400);
        return;
      }

      const order = await UpiPaymentService.createUpiOrder({
        planId,
        targetType,
        targetId,
        billingCycle,
      });

      sendSuccess(res, order, 'Direct UPI QR code generated successfully.');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to initialize UPI order', 500);
    }
  }

  /**
   * Submit 12-digit UTR for immediate verification & subscription activation
   */
  static async submitUtr(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId, utr } = req.body;
      if (!paymentId || !utr) {
        sendError(res, 'Payment ID and 12-digit UTR are required.', 400);
      }

      const result = await UpiPaymentService.verifyAndActivateUtr(paymentId, utr);
      sendSuccess(res, result, 'UPI payment verified & subscription activated successfully!');
    } catch (err: any) {
      sendError(res, err.message || 'Verification failed. Please check the UTR.', 400);
    }
  }

  /**
   * Poll status of an active UPI payment
   */
  static async checkStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        sendError(res, 'Payment not found', 404);
        return;
      }

      sendSuccess(res, {
        paymentId: payment._id,
        status: payment.status,
        isCaptured: payment.status === 'captured',
        utr: payment.upiUtr,
      });
    } catch (err: any) {
      sendError(res, err.message || 'Failed to check payment status', 500);
    }
  }

  /**
   * Automated Webhook from PhonePe Business / Paytm / BharatPe / Custom Webhook
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body || {};
      const result = await UpiPaymentService.handleMerchantWebhook(payload);

      if (result.success) {
        res.status(200).json({ status: 'SUCCESS', message: 'Webhook processed & subscription activated' });
      } else {
        res.status(200).json({ status: 'ACK', reason: result.reason });
      }
    } catch (err: any) {
      console.error('[UPI Webhook Error]:', err);
      res.status(200).json({ status: 'ERROR', message: err.message });
    }
  }
}
