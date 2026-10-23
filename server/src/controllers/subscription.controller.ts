import { Response } from 'express';
import { SubscriptionPlan, Subscription, Payment } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { CapacityService } from '../services/capacity.service';
import { RazorpayService } from '../services/razorpay.service';
import { INITIAL_PLANS } from '../constants';
import { recordAuditLog } from '../utils/audit';

export class SubscriptionController {
  static async listPlans(req: AuthRequest, res: Response): Promise<void> {
    let plans = await SubscriptionPlan.find({ isActive: true }).sort({ maxStudents: 1 });

    // Seed initial plans if database is fresh
    if (plans.length === 0) {
      await SubscriptionPlan.insertMany(INITIAL_PLANS);
      plans = await SubscriptionPlan.find({ isActive: true }).sort({ maxStudents: 1 });
    }

    sendSuccess(res, plans);
  }

  static async getMySubscription(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const targetType = orgId ? 'organization' : 'staff';
    const targetId = orgId || userId;

    const [subscription, capacityCheck] = await Promise.all([
      CapacityService.getActiveSubscription(targetType, targetId),
      CapacityService.verifyCapacity(targetType, targetId, 0),
    ]);

    // Fetch recent payments
    const payments = await Payment.find({ targetType, targetId }).sort({ createdAt: -1 }).limit(10);

    sendSuccess(res, {
      subscription,
      capacity: capacityCheck,
      paymentHistory: payments,
    });
  }

  static async createCheckoutOrder(req: AuthRequest, res: Response): Promise<void> {
    const { planId, billingCycle = 'monthly' } = req.body;
    const userId = req.user!.userId;
    const orgId = req.user?.organizationId;
    const targetType = orgId ? 'organization' : 'staff';
    const targetId = orgId || userId;

    if (!planId) {
      sendError(res, 'Plan ID is required for checkout.', 400);
      return;
    }

    const orderData = await RazorpayService.createOrder({
      planId,
      targetType,
      targetId: targetId.toString(),
      billingCycle,
    });

    sendSuccess(res, orderData, 'Order initialized for checkout.');
  }

  static async verifyPayment(req: AuthRequest, res: Response): Promise<void> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      sendError(res, 'Order ID and Payment ID are required.', 400);
      return;
    }

    const result = await RazorpayService.finalizePayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature || 'simulated_sig',
    });

    await recordAuditLog({
      req,
      action: 'SUBSCRIPTION_UPGRADE',
      entity: 'Subscription',
      entityId: result.subscription?._id.toString(),
      metadata: {
        tier: result.subscription?.tier,
        capacity: result.subscription?.studentCapacity,
      },
    });

    sendSuccess(res, result, 'Payment verified and plan upgraded successfully!');
  }

  static async updatePlan(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      {
        $set: {
          name: data.name,
          maxStudents: data.maxStudents,
          priceMonthly: data.priceMonthly,
          priceYearly: data.priceYearly,
          features: data.features,
          aiQuestionsPerMonth: data.aiQuestionsPerMonth,
          isActive: data.isActive,
        },
      },
      { new: true }
    );

    if (!plan) {
      sendError(res, 'Plan not found', 404);
      return;
    }

    await recordAuditLog({
      req,
      action: 'PLAN_UPDATE',
      entity: 'SubscriptionPlan',
      entityId: plan._id.toString(),
      metadata: { planName: plan.name },
    });

    sendSuccess(res, plan, 'Subscription plan updated.');
  }
}
