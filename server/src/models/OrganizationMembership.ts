import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizationMembership extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  roleInOrg: 'org_admin' | 'staff';
  status: 'active' | 'invited' | 'suspended';
  permissions: string[];
  assignedClassIds: mongoose.Types.ObjectId[];
  invitationToken?: string;
  invitedAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationMembershipSchema = new Schema<IOrganizationMembership>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleInOrg: { type: String, enum: ['org_admin', 'staff'], default: 'staff', required: true },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active', index: true },
    permissions: [{ type: String }],
    assignedClassIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    invitationToken: { type: String },
    invitedAt: { type: Date },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

organizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const OrganizationMembership = mongoose.model<IOrganizationMembership>(
  'OrganizationMembership',
  organizationMembershipSchema
);
