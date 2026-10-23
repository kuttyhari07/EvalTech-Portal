import mongoose, { Schema, Document } from 'mongoose';

export interface IAIUsageLog extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  prompt: string;
  action: 'generate_questions' | 'improve_question' | 'generate_rubric' | 'assistant';
  questionCountGenerated: number;
  tokensUsed?: number;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const aiUsageLogSchema = new Schema<IAIUsageLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    prompt: { type: String, required: true },
    action: {
      type: String,
      enum: ['generate_questions', 'improve_question', 'generate_rubric', 'assistant'],
      default: 'generate_questions',
      index: true,
    },
    questionCountGenerated: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiUsageLogSchema.index({ userId: 1, createdAt: -1 });

export const AIUsageLog = mongoose.model<IAIUsageLog>('AIUsageLog', aiUsageLogSchema);
