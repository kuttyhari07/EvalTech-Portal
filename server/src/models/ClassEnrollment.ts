import mongoose, { Schema, Document } from 'mongoose';

export interface IClassEnrollment extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  enrolledAt: Date;
  status: 'active' | 'dropped';
}

const classEnrollmentSchema = new Schema<IClassEnrollment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    enrolledAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'dropped'], default: 'active' },
  },
  { timestamps: true }
);

classEnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });

export const ClassEnrollment = mongoose.model<IClassEnrollment>(
  'ClassEnrollment',
  classEnrollmentSchema
);
