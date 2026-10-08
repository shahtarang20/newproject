import { Schema, model, Types } from 'mongoose';
import { jsonTransformPlugin } from '../plugins';

/** Key/value platform config & feature flags edited by super admin. */
export interface IPlatformSetting {
  _id: Types.ObjectId;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

const settingSchema = new Schema<IPlatformSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed },
    description: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);
settingSchema.plugin(jsonTransformPlugin);

export const PlatformSetting = model<IPlatformSetting>('PlatformSetting', settingSchema);
