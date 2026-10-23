import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportMessage {
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  message: string;
  sentAt: Date;
}

export interface ISupportRequest extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  subject: string;
  category: 'billing' | 'technical' | 'exam_issue' | 'feature_request' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportRequestSchema = new Schema<ISupportRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['billing', 'technical', 'exam_issue', 'feature_request', 'general'],
      default: 'general',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    messages: [supportMessageSchema],
  },
  { timestamps: true }
);

export const SupportRequest = mongoose.model<ISupportRequest>('SupportRequest', supportRequestSchema);
