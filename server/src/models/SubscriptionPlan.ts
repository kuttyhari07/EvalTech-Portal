import mongoose, { Schema, Document } from 'mongoose';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '../constants';

export interface ISubscriptionPlan extends Document {
  name: string;
  slug: string;
  tier: SubscriptionTier;
  maxStudents: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  aiQuestionsPerMonth: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    tier: { type: String, enum: Object.values(SUBSCRIPTION_TIERS), required: true, index: true },
    maxStudents: { type: Number, required: true, default: 10 },
    priceMonthly: { type: Number, required: true, default: 0 },
    priceYearly: { type: Number, required: true, default: 0 },
    features: [{ type: String }],
    aiQuestionsPerMonth: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  subscriptionPlanSchema
);
