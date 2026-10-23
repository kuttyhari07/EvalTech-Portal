import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluationJob extends Document {
  submissionId: mongoose.Types.ObjectId;
  attemptId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retryable';
  retryCount: number;
  maxRetries: number;
  scheduledTime: Date;
  completedAt?: Date;
  lastError?: string;
  providerJobRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

const evaluationJobSchema = new Schema<IEvaluationJob>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'CodeSubmission', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'retryable'],
      default: 'pending',
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    scheduledTime: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date },
    lastError: { type: String },
    providerJobRef: { type: String, index: true },
  },
  { timestamps: true }
);

evaluationJobSchema.index({ status: 1, scheduledTime: 1 });

export const EvaluationJob = mongoose.model<IEvaluationJob>(
  'EvaluationJob',
  evaluationJobSchema
);
