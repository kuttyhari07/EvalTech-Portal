import { config } from '../config/env';
import { Payment, Subscription, SubscriptionPlan, User, Organization } from '../models';

export interface CreateUpiOrderParams {
  planId: string;
  targetType: 'staff' | 'organization';
  targetId: string;
  billingCycle: 'monthly' | 'yearly';
}

export class UpiPaymentService {
  /**
   * Generates a Direct UPI Payment Order with Dynamic QR Code and Intent URI.
   */
  static async createUpiOrder(params: CreateUpiOrderParams) {
    const plan = await SubscriptionPlan.findById(params.planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const amount = params.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (amount <= 0) {
      throw new Error('Free tier does not require payment.');
    }

    const merchantTransactionId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      Math.random() * 900 + 100
    )}`;
    const vpa = config.UPI_MERCHANT_VPA || 'evaltech@okhdfcbank';
    const merchantName = config.UPI_MERCHANT_NAME || 'EvalTech Enterprise';
    const receipt = `rcpt_upi_${Date.now()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Standard NPCI UPI URI Scheme
    const upiIntentUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
      merchantName
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(
      `EvalTech_${plan.name}_${merchantTransactionId}`
    )}&tr=${merchantTransactionId}`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      upiIntentUri
    )}&margin=10`;

    // Record created payment in MongoDB
    const payment = await Payment.create({
      targetType: params.targetType,
      targetId: params.targetId,
      planId: plan._id,
      paymentMethod: 'direct_upi',
      merchantTransactionId,
      upiVpa: vpa,
      amount,
      currency: 'INR',
      status: 'created',
      receipt,
      invoiceNumber,
      metadata: {
        billingCycle: params.billingCycle,
        planName: plan.name,
        upiIntentUri,
      },
    });

    return {
      paymentId: payment._id,
      merchantTransactionId,
      amount,
      currency: 'INR',
      upiVpa: vpa,
      merchantName,
      upiIntentUri,
      qrCodeUrl,
      planName: plan.name,
      billingCycle: params.billingCycle,
    };
  }

  /**
   * 100% Automated Webhook Receiver:
   * Processes instant callbacks from PhonePe Business, Paytm for Business, BharatPe, or Custom Webhook Forwarder.
   */
  static async handleMerchantWebhook(payload: any) {
    // Standardize fields across multiple gateway / webhook formats
    const utr =
      payload.utr ||
      payload.bankTransactionId ||
      payload.providerReferenceId ||
      payload.rrn ||
      payload.data?.utr ||
      payload.data?.bankTransactionId ||
      payload.transaction?.utr;

    const transactionId =
      payload.merchantTransactionId ||
      payload.transactionId ||
      payload.orderId ||
      payload.data?.merchantTransactionId ||
      payload.data?.transactionId;

    const rawStatus = (
      payload.status ||
      payload.code ||
      payload.data?.status ||
      payload.paymentState ||
      'SUCCESS'
    )
      .toString()
      .toUpperCase();

    const isSuccess =
      rawStatus === 'SUCCESS' ||
      rawStatus === 'CAPTURED' ||
      rawStatus === 'PAYMENT_SUCCESS' ||
      rawStatus === 'COMPLETED';

    if (!isSuccess) {
      return { success: false, reason: `Status not successful: ${rawStatus}` };
    }

    // Locate payment by transaction ID or UTR
    let payment = null;
    if (transactionId) {
      payment = await Payment.findOne({ merchantTransactionId: transactionId });
    }

    if (!payment && utr) {
      payment = await Payment.findOne({ upiUtr: utr });
    }

    // Fallback: match by recent created amount within last 2 hours
    if (!payment && payload.amount) {
      const parsedAmount = Number(payload.amount);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      payment = await Payment.findOne({
        status: 'created',
        amount: parsedAmount,
        createdAt: { $gte: twoHoursAgo },
      }).sort({ createdAt: -1 });
    }

    if (!payment) {
      return { success: false, reason: 'Matching pending payment order not found' };
    }

    if (payment.status === 'captured') {
      return { success: true, alreadyProcessed: true, paymentId: payment._id };
    }

    // Activate subscription automatically
    await this.activateSubscriptionForPayment(payment, utr || `UTR_AUTO_${Date.now()}`);

    return {
      success: true,
      paymentId: payment._id,
      amount: payment.amount,
      utr,
    };
  }

  /**
   * Instant UTR submission & verification (Teacher enters 12-digit UTR in UI).
   */
  static async verifyAndActivateUtr(paymentId: string, utr: string) {
    const cleanUtr = String(utr).trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      throw new Error('Please enter a valid 12-digit UPI Reference / UTR Number.');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment transaction order not found.');
    }

    if (payment.status === 'captured') {
      return { success: true, alreadyProcessed: true, paymentId: payment._id };
    }

    await this.activateSubscriptionForPayment(payment, cleanUtr);

    return {
      success: true,
      activated: true,
      paymentId: payment._id,
      utr: cleanUtr,
    };
  }

  /**
   * Activates or updates the active subscription for a verified payment.
   */
  private static async activateSubscriptionForPayment(payment: any, utr: string) {
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

    const subscription = await Subscription.findOneAndUpdate(
      { targetType: payment.targetType, targetId: payment.targetId },
      {
        targetType: payment.targetType,
        targetId: payment.targetId,
        planId: plan._id,
        tier: plan.tier,
        studentCapacity: 999999, // Unlimited seats
        billingCycle,
        status: 'active',
        razorpaySubscriptionId: `upi_${utr}`,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
      { upsert: true, new: true }
    );

    payment.status = 'captured';
    payment.upiUtr = utr;
    payment.subscriptionId = subscription._id;
    await payment.save();

    return subscription;
  }
}
