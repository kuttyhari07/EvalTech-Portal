import mongoose, { Schema, Document } from 'mongoose';
import {
  CODE_VERDICTS,
  CodeVerdict,
  PROGRAMMING_LANGUAGES,
  ProgrammingLanguage,
} from '../constants';

export interface ITestResultItem {
  testCaseId?: mongoose.Types.ObjectId;
  isSample: boolean;
  isHidden: boolean;
  passed: boolean;
  verdict: CodeVerdict;
  executionTimeMs?: number;
  memoryKb?: number;
  studentOutput?: string;
  expectedOutput?: string;
  compileError?: string;
  runtimeError?: string;
}

export interface ICodeSubmission extends Document {
  examId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  attemptId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentInfo: {
    name: string;
    email: string;
    rollNo?: string;
  };
  language: ProgrammingLanguage;
  sourceCode: string;
  submissionNumber: number;
  type: 'run' | 'submit';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  verdict: CodeVerdict;
  marksObtained: number;
  totalMarks: number;
  passedTestCasesCount: number;
  totalTestCasesCount: number;
  testResults: ITestResultItem[];
  executionMetadata: {
    executionTimeMs: number;
    memoryKb: number;
    compileOutput?: string;
  };
  providerSubmissionId?: string;
  idempotencyKey?: string;
  evaluatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const testResultItemSchema = new Schema<ITestResultItem>(
  {
    testCaseId: { type: Schema.Types.ObjectId, ref: 'ProgrammingTestCase' },
    isSample: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    passed: { type: Boolean, required: true },
    verdict: {
      type: String,
      enum: Object.values(CODE_VERDICTS),
      required: true,
    },
    executionTimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
    studentOutput: { type: String },
    expectedOutput: { type: String },
    compileError: { type: String },
    runtimeError: { type: String },
  },
  { _id: false }
);

const codeSubmissionSchema = new Schema<ICodeSubmission>(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', index: true },
    studentInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      rollNo: { type: String },
    },
    language: {
      type: String,
      enum: Object.values(PROGRAMMING_LANGUAGES),
      required: true,
    },
    sourceCode: { type: String, required: true },
    submissionNumber: { type: Number, default: 1 },
    type: { type: String, enum: ['run', 'submit'], required: true, default: 'submit' },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    verdict: {
      type: String,
      enum: Object.values(CODE_VERDICTS),
      default: CODE_VERDICTS.PENDING_EVALUATION,
      index: true,
    },
    marksObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    passedTestCasesCount: { type: Number, default: 0 },
    totalTestCasesCount: { type: Number, default: 0 },
    testResults: [testResultItemSchema],
    executionMetadata: {
      executionTimeMs: { type: Number, default: 0 },
      memoryKb: { type: Number, default: 0 },
      compileOutput: { type: String },
    },
    providerSubmissionId: { type: String, index: true },
    idempotencyKey: { type: String, index: true },
    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

codeSubmissionSchema.index({ attemptId: 1, questionId: 1, type: 1, createdAt: -1 });
codeSubmissionSchema.index({ examId: 1, 'studentInfo.email': 1 });

export const CodeSubmission = mongoose.model<ICodeSubmission>(
  'CodeSubmission',
  codeSubmissionSchema
);
