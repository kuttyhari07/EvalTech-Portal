import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionBank extends Document {
  title: string;
  description?: string;
  subject: string;
  creatorId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  questionIds: mongoose.Types.ObjectId[];
  tags: string[];
  isPublicWithinOrg: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionBankSchema = new Schema<IQuestionBank>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    tags: [{ type: String }],
    isPublicWithinOrg: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const QuestionBank = mongoose.model<IQuestionBank>('QuestionBank', questionBankSchema);
