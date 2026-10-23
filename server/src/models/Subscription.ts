import mongoose, { Schema, Document } from 'mongoose';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '../constants';

export interface ISubscription extends Document {
  targetType: 'staff' | 'organization';
  targetId: mongoose.Types.ObjectId; // User._id or Organization._id
  planId: mongoose.Types.ObjectId;
  tier: SubscriptionTier;
  studentCapacity: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'past_due';
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    targetType: { type: String, enum: ['staff', 'organization'], required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    tier: { type: String, enum: Object.values(SUBSCRIPTION_TIERS), required: true },
    studentCapacity: { type: Number, required: true, default: 10 },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending', 'past_due'],
      default: 'active',
      index: true,
    },
    razorpaySubscriptionId: { type: String, index: true },
    razorpayCustomerId: { type: String },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    autoRenew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ targetType: 1, targetId: 1, status: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
