import { Request, Response } from 'express';
import { RazorpayService } from '../services/razorpay.service';
import { Payment } from '../models';

export class WebhookController {
  static async handleRazorpay(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const bodyString = JSON.stringify(req.body);

    const isValid = RazorpayService.verifyWebhookSignature(bodyString, signature);
    if (!isValid) {
      console.warn('[Webhook] Invalid Razorpay webhook signature');
      res.status(400).json({ status: 'invalid_signature' });
      return;
    }

    const event = req.body.event;
    console.log(`[Webhook] Received Razorpay event: ${event}`);

    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        const paymentEntity = req.body.payload?.payment?.entity;
        if (paymentEntity) {
          const orderId = paymentEntity.order_id;
          const paymentId = paymentEntity.id;

          await RazorpayService.finalizePayment({
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature || 'webhook_verified',
          });
        }
      }
    } catch (err: any) {
      console.error('[Webhook] Error processing event:', err.message);
    }

    // Always respond 200 OK to prevent webhook retry storm
    res.status(200).json({ received: true });
  }
}
