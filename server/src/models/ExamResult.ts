import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionResult {
  questionId: mongoose.Types.ObjectId;
  questionText: string;
  questionType: string;
  studentAnswer: any;
  correctAnswer: any;
  marksObtained: number;
  maxMarks: number;
  isCorrect: boolean;
  isPartial: boolean;
  explanation?: string;
  feedback?: string;
  verdict?: string;
  passedTestCases?: number;
  totalTestCases?: number;
  language?: string;
  codeSubmissionId?: mongoose.Types.ObjectId;
}

export interface IExamResult extends Document {
  attemptId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentInfo: {
    name: string;
    email: string;
    rollNo?: string;
  };
  totalScore: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  rank?: number;
  programmingScore: number;
  programmingMaxScore: number;
  evaluationStatus: 'completed' | 'pending_evaluation' | 'partially_evaluated';
  questionBreakdown: IQuestionResult[];
  isReleased: boolean;
  releasedAt?: Date;
  emailSent: boolean;
  emailSentAt?: Date;
  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const questionResultSchema = new Schema<IQuestionResult>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionText: { type: String, required: true },
    questionType: { type: String, required: true },
    studentAnswer: { type: Schema.Types.Mixed },
    correctAnswer: { type: Schema.Types.Mixed },
    marksObtained: { type: Number, required: true, default: 0 },
    maxMarks: { type: Number, required: true, default: 1 },
    isCorrect: { type: Boolean, default: false },
    isPartial: { type: Boolean, default: false },
    explanation: { type: String },
    feedback: { type: String },
    verdict: { type: String },
    passedTestCases: { type: Number },
    totalTestCases: { type: Number },
    language: { type: String },
    codeSubmissionId: { type: Schema.Types.ObjectId, ref: 'CodeSubmission' },
  },
  { _id: false }
);

const examResultSchema = new Schema<IExamResult>(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, unique: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', index: true },
    studentInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      rollNo: { type: String },
    },
    totalScore: { type: Number, required: true, default: 0 },
    maxScore: { type: Number, required: true, default: 100 },
    percentage: { type: Number, required: true, default: 0 },
    isPassed: { type: Boolean, required: true, default: false },
    rank: { type: Number },
    programmingScore: { type: Number, default: 0 },
    programmingMaxScore: { type: Number, default: 0 },
    evaluationStatus: {
      type: String,
      enum: ['completed', 'pending_evaluation', 'partially_evaluated'],
      default: 'completed',
      index: true,
    },
    questionBreakdown: [questionResultSchema],
    isReleased: { type: Boolean, default: false, index: true },
    releasedAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

examResultSchema.index({ examId: 1, totalScore: -1 });

export const ExamResult = mongoose.model<IExamResult>('ExamResult', examResultSchema);
