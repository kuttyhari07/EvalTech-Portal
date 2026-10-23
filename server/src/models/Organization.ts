import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  logo?: string;
  address?: string;
  contactEmail: string;
  contactPhone?: string;
  createdBy: mongoose.Types.ObjectId;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logo: { type: String },
    address: { type: String },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
