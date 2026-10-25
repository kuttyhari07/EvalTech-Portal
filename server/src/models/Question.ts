import mongoose, { Schema, Document } from 'mongoose';
import { DIFFICULTY_LEVELS, DifficultyLevel, QUESTION_TYPES, QuestionType } from '../constants';

export interface IOption {
  id: string;
  text: string;
}

export interface IQuestion extends Document {
  subject: string;
  topic?: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  text: string;
  title?: string;
  codeSnippet?: string;
  options: IOption[];
  correctAnswers: string[]; // Option IDs or canonical answer strings
  explanation?: string;
  defaultMarks: number;
  negativeMarks: number;
  tags: string[];
  creatorId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  questionBankId?: mongoose.Types.ObjectId;
  programmingQuestionId?: mongoose.Types.ObjectId;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  isApproved: boolean;
  aiGenerated: boolean;
  aiPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<IOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new Schema<IQuestion>(
  {
    subject: { type: String, required: true, trim: true, index: true },
    topic: { type: String, trim: true, index: true },
    difficulty: {
      type: String,
      enum: Object.values(DIFFICULTY_LEVELS),
      default: DIFFICULTY_LEVELS.MEDIUM,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(QUESTION_TYPES),
      required: true,
      index: true,
    },
    title: { type: String, trim: true },
    text: { type: String, required: true },
    codeSnippet: { type: String },
    options: [optionSchema],
    correctAnswers: [{ type: String }],
    explanation: { type: String },
    defaultMarks: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    tags: [{ type: String, index: true }],
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    questionBankId: { type: Schema.Types.ObjectId, ref: 'QuestionBank', index: true },
    programmingQuestionId: { type: Schema.Types.ObjectId, ref: 'ProgrammingQuestion', index: true },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true,
    },
    isApproved: { type: Boolean, default: true },
    aiGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String },
  },
  { timestamps: true }
);

export const Question = mongoose.model<IQuestion>('Question', questionSchema);
