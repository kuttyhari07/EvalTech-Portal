import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  name: string;
  section?: string;
  subject?: string;
  academicYear?: string;
  code: string;
  description?: string;
  organizationId?: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    subject: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

classSchema.index({ organizationId: 1, code: 1 });
classSchema.index({ staffId: 1, name: 1, section: 1 });

export const Class = mongoose.model<IClass>('Class', classSchema);
