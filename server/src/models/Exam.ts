import mongoose, { Schema, Document } from 'mongoose';
import { EXAM_STATUS } from '../constants';

export interface IExamQuestionItem {
  questionId: mongoose.Types.ObjectId;
  marks: number;
  negativeMarks: number;
  order: number;
}

export interface IExam extends Document {
  title: string;
  description?: string;
  examCode: string; // Unique exam access code
  creatorId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  classIds: mongoose.Types.ObjectId[];
  subject: string;
  category?: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: {
    enabled: boolean;
    penaltyPerQuestion: number;
  };
  canRevisitQuestions: boolean;
  releaseResultsMode: 'immediate' | 'manual';
  showExplanationsAfterSubmission: boolean;
  instructions?: string;
  questions: IExamQuestionItem[];
  status: 'draft' | 'published' | 'archived';
  isPublicLinkEnabled: boolean;
  requireSEB: boolean;
  sebBrowserExamKey?: string;
  sebConfigKey?: string;
  startPassword?: string;
  exitPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

const examQuestionItemSchema = new Schema<IExamQuestionItem>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    marks: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const examSchema = new Schema<IExam>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    examCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class', index: true }],
    subject: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    totalMarks: { type: Number, required: true, default: 100 },
    passingMarks: { type: Number, required: true, default: 40 },
    durationMinutes: { type: Number, required: true, default: 60 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    maxAttempts: { type: Number, default: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    negativeMarking: {
      enabled: { type: Boolean, default: false },
      penaltyPerQuestion: { type: Number, default: 0 },
    },
    canRevisitQuestions: { type: Boolean, default: true },
    releaseResultsMode: { type: String, enum: ['immediate', 'manual'], default: 'immediate' },
    showExplanationsAfterSubmission: { type: Boolean, default: true },
    instructions: { type: String },
    questions: [examQuestionItemSchema],
    status: {
      type: String,
      enum: Object.values(EXAM_STATUS),
      default: EXAM_STATUS.DRAFT,
      index: true,
    },
    isPublicLinkEnabled: { type: Boolean, default: true },
    requireSEB: { type: Boolean, default: false, index: true },
    sebBrowserExamKey: { type: String, trim: true },
    sebConfigKey: { type: String, trim: true },
    startPassword: { type: String, trim: true },
    exitPassword: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Exam = mongoose.model<IExam>('Exam', examSchema);
