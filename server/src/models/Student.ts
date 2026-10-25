import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  studentIdNumber: string; // Roll number, student ID
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string;
  passwordChanged?: boolean;
  phone?: string;
  organizationId?: mongoose.Types.ObjectId;
  createdByStaffId: mongoose.Types.ObjectId;
  status: 'active' | 'archived';
  metadata?: Record<string, any>;
  xpPoints?: number;
  streakCount?: number;
  lastPracticeDate?: Date;
  solvedPracticeCount?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  toSafeObject(): Record<string, any>;
}

const studentSchema = new Schema<IStudent>(
  {
    studentIdNumber: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    passwordChanged: { type: Boolean, default: false },
    phone: { type: String, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    createdByStaffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    metadata: { type: Schema.Types.Mixed },
    xpPoints: { type: Number, default: 0 },
    streakCount: { type: Number, default: 1 },
    lastPracticeDate: { type: Date },
    solvedPracticeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studentSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  // If student has a customized password hash, compare against it
  if (this.passwordHash) {
    return bcrypt.default.compare(candidate, this.passwordHash);
  }
  // Otherwise, fallback to default password 'Test@123'
  return candidate === 'Test@123';
};

studentSchema.methods.toSafeObject = function (): Record<string, any> {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Distinct uniqueness scopes for Org vs Independent Staff
studentSchema.index(
  { organizationId: 1, studentIdNumber: 1 },
  { unique: true, partialFilterExpression: { organizationId: { $type: 'objectId' } } }
);
studentSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true, partialFilterExpression: { organizationId: { $type: 'objectId' } } }
);
studentSchema.index(
  { createdByStaffId: 1, studentIdNumber: 1 },
  { unique: true, partialFilterExpression: { organizationId: null } }
);
studentSchema.index(
  { createdByStaffId: 1, email: 1 },
  { unique: true, partialFilterExpression: { organizationId: null } }
);

export const Student = mongoose.model<IStudent>('Student', studentSchema);
