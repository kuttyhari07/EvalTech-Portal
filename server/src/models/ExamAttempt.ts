import mongoose, { Schema, Document } from 'mongoose';
import { ATTEMPT_STATUS } from '../constants';

export interface IClientEvent {
  event: string;
  timestamp: Date;
  details?: string;
}

export interface IProgrammingDraft {
  questionId: mongoose.Types.ObjectId;
  language: string;
  sourceCode: string;
  lastSavedAt: Date;
}

export interface IExamAttempt extends Document {
  examId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentInfo: {
    name: string;
    email: string;
    rollNo?: string;
  };
  attemptNumber: number;
  startedAt: Date;
  expiresAt: Date; // Authoritative server expiry
  submittedAt?: Date;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'evaluated';
  timeSpentSeconds: number;
  ipAddress?: string;
  userAgent?: string;
  isSEB?: boolean;
  clientEvents: IClientEvent[];
  programmingDrafts: IProgrammingDraft[];
  submissionToken: string; // Token used to verify idempotent submission
  createdAt: Date;
  updatedAt: Date;
}

const clientEventSchema = new Schema<IClientEvent>(
  {
    event: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String },
  },
  { _id: false }
);

const programmingDraftSchema = new Schema<IProgrammingDraft>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    language: { type: String, required: true },
    sourceCode: { type: String, default: '' },
    lastSavedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const examAttemptSchema = new Schema<IExamAttempt>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', index: true },
    studentInfo: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      rollNo: { type: String, trim: true },
    },
    attemptNumber: { type: Number, default: 1 },
    startedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true, index: true },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(ATTEMPT_STATUS),
      default: ATTEMPT_STATUS.IN_PROGRESS,
      index: true,
    },
    timeSpentSeconds: { type: Number, default: 0 },
    ipAddress: { type: String },
    userAgent: { type: String },
    isSEB: { type: Boolean, default: false },
    clientEvents: [clientEventSchema],
    programmingDrafts: [programmingDraftSchema],
    submissionToken: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

examAttemptSchema.index({ examId: 1, 'studentInfo.email': 1 });

export const ExamAttempt = mongoose.model<IExamAttempt>('ExamAttempt', examAttemptSchema);
