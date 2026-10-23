import mongoose, { Schema, Document } from 'mongoose';

export interface IProgrammingTestCase extends Document {
  questionId: mongoose.Types.ObjectId;
  programmingQuestionId?: mongoose.Types.ObjectId;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  isSample: boolean;
  weight: number;
  description?: string;
  isEnabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const programmingTestCaseSchema = new Schema<IProgrammingTestCase>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    programmingQuestionId: { type: Schema.Types.ObjectId, ref: 'ProgrammingQuestion', index: true },
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false, index: true },
    isSample: { type: Boolean, default: false, index: true },
    weight: { type: Number, required: true, default: 1 },
    description: { type: String },
    isEnabled: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

programmingTestCaseSchema.index({ questionId: 1, isEnabled: 1, order: 1 });

export const ProgrammingTestCase = mongoose.model<IProgrammingTestCase>(
  'ProgrammingTestCase',
  programmingTestCaseSchema
);
