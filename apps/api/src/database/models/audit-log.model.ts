import { Schema, model, Types } from 'mongoose';
import { jsonTransformPlugin } from '../plugins';

export interface IAuditLog {
  _id: Types.ObjectId;
  shopId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditSchema = new Schema<IAuditLog>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ shopId: 1, createdAt: -1 });
auditSchema.index({ shopId: 1, entity: 1, entityId: 1, createdAt: -1 });
auditSchema.index({ userId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });
auditSchema.plugin(jsonTransformPlugin);

export const AuditLog = model<IAuditLog>('AuditLog', auditSchema);
