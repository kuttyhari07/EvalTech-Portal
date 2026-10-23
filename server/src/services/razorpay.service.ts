import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config/env';
import { Payment, Subscription, SubscriptionPlan, User, Organization } from '../models';

export interface CreateOrderParams {
  planId: string;
  targetType: 'staff' | 'organization';
  targetId: string;
  billingCycle: 'monthly' | 'yearly';
}

export class RazorpayService {
  private static instance: Razorpay | null = null;

  static isConfigured(): boolean {
    return (
      Boolean(config.RAZORPAY_KEY_ID) &&
      Boolean(config.RAZORPAY_KEY_SECRET) &&
      config.RAZORPAY_KEY_ID !== 'rzp_test_placeholder_key'
    );
  }

  static getClient(): Razorpay | null {
    if (!this.instance && this.isConfigured()) {
      this.instance = new Razorpay({
        key_id: config.RAZORPAY_KEY_ID,
        key_secret: config.RAZORPAY_KEY_SECRET,
      });
    }
    return this.instance;
  }

  /**
   * Creates an order for Razorpay checkout.
   */
  static async createOrder(params: CreateOrderParams) {
    const plan = await SubscriptionPlan.findById(params.planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const amount = params.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (amount <= 0) {
      throw new Error('Free plans do not require payment processing');
    }

    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    let razorpayOrderId = `order_sim_${Date.now()}`;

    const client = this.getClient();
    if (client) {
      // Amount in paise (1 INR = 100 paise)
      const order = await client.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt,
        notes: {
          planId: plan._id.toString(),
          targetType: params.targetType,
          targetId: params.targetId,
          billingCycle: params.billingCycle,
        },
      });
      razorpayOrderId = order.id;
    } else {
      console.log(`[Razorpay] Sandbox/Test mode active. Generated simulated order: ${razorpayOrderId}`);
    }

    // Record pending payment in database
    const payment = await Payment.create({
      targetType: params.targetType,
      targetId: params.targetId,
      planId: plan._id,
      razorpayOrderId,
      amount,
      currency: 'INR',
      status: 'created',
      receipt,
      invoiceNumber,
      metadata: {
        billingCycle: params.billingCycle,
        planName: plan.name,
        testMode: !client,
      },
    });

    return {
      orderId: razorpayOrderId,
      amount,
      currency: 'INR',
      keyId: config.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      plan: {
        id: plan._id,
        name: plan.name,
        tier: plan.tier,
        maxStudents: plan.maxStudents,
      },
      isTestMode: !client,
    };
  }

  /**
   * Cryptographically verifies payment signature received after checkout.
   */
  static verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    if (!this.isConfigured()) {
      // In development / demo test mode when credentials are placeholders
      console.log('[Razorpay] Sandbox test mode: accepting simulated payment verification');
      return true;
    }

    const generatedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  }

  /**
   * Completes the payment and activates/upgrades the subscription.
   */
  static async finalizePayment(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const isValid = this.verifyPaymentSignature(
      params.razorpayOrderId,
      params.razorpayPaymentId,
      params.razorpaySignature
    );

    if (!isValid) {
      throw new Error('Payment verification failed. Invalid cryptographic signature.');
    }

    const payment = await Payment.findOne({ razorpayOrderId: params.razorpayOrderId });
    if (!payment) {
      throw new Error(`Payment record not found for order ${params.razorpayOrderId}`);
    }

    // Avoid duplicate processing (idempotency)
    if (payment.status === 'captured') {
      return { success: true, payment, alreadyProcessed: true };
    }

    const plan = await SubscriptionPlan.findById(payment.planId);
    if (!plan) {
      throw new Error('Associated plan not found');
    }

    const billingCycle = payment.metadata?.billingCycle || 'monthly';
    const periodStart = new Date();
    const periodEnd = new Date();
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update or create active subscription
    const subscription = await Subscription.findOneAndUpdate(
      { targetType: payment.targetType, targetId: payment.targetId },
      {
        targetType: payment.targetType,
        targetId: payment.targetId,
        planId: plan._id,
        tier: plan.tier,
        studentCapacity: plan.maxStudents,
        billingCycle,
        status: 'active',
        razorpaySubscriptionId: params.razorpayPaymentId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
      { upsert: true, new: true }
    );

    payment.status = 'captured';
    payment.razorpayPaymentId = params.razorpayPaymentId;
    payment.razorpaySignature = params.razorpaySignature;
    payment.subscriptionId = subscription._id;
    await payment.save();

    console.log(
      `[Razorpay] Successfully activated ${plan.name} plan for ${payment.targetType} ${payment.targetId}`
    );

    return {
      success: true,
      subscription,
      payment,
    };
  }

  /**
   * Verifies Razorpay Webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!config.RAZORPAY_WEBHOOK_SECRET || config.RAZORPAY_WEBHOOK_SECRET === 'whsec_placeholder_secret') {
      return true;
    }
    const expected = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    return expected === signature;
  }
}
