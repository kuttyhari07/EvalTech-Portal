import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  headOfDepartmentId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    headOfDepartmentId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);

