import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  subscriptionId?: mongoose.Types.ObjectId;
  targetType: 'staff' | 'organization';
  targetId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number; // in INR
  currency: string;
  status: 'created' | 'captured' | 'failed' | 'refunded';
  receipt: string;
  invoiceNumber: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', index: true },
    targetType: { type: String, enum: ['staff', 'organization'], required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    receipt: { type: String, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
