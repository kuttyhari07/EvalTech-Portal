import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSetting extends Document {
  key: string;
  value: any;
  description?: string;
  category: 'general' | 'ai' | 'billing' | 'email' | 'security';
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const platformSettingSchema = new Schema<IPlatformSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['general', 'ai', 'billing', 'email', 'security'],
      default: 'general',
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PlatformSetting = mongoose.model<IPlatformSetting>(
  'PlatformSetting',
  platformSettingSchema
);
