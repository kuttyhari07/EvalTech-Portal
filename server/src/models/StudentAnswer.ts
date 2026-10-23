import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentAnswer extends Document {
  attemptId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  answerValue: any; // string, string[], or boolean
  isMarkedForReview: boolean;
  isAnswered: boolean;
  savedAt: Date;
  isEvaluated: boolean;
  marksAwarded: number;
  teacherFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentAnswerSchema = new Schema<IStudentAnswer>(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    answerValue: { type: Schema.Types.Mixed, default: null },
    isMarkedForReview: { type: Boolean, default: false },
    isAnswered: { type: Boolean, default: false },
    savedAt: { type: Date, default: Date.now },
    isEvaluated: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
    teacherFeedback: { type: String },
  },
  { timestamps: true }
);

studentAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export const StudentAnswer = mongoose.model<IStudentAnswer>('StudentAnswer', studentAnswerSchema);
