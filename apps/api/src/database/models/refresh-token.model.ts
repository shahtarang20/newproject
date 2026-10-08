import { Schema, model, Types } from 'mongoose';
import { jsonTransformPlugin } from '../plugins';

export interface IRefreshToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** sha256 of the opaque JWT. Raw token is never stored. */
  tokenHash: string;
  /** Rotation family; reuse of a revoked token revokes the whole family. */
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByHash?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: String,
    userAgent: String,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// TTL: Mongo removes the document once expiresAt has passed.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.plugin(jsonTransformPlugin);

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
