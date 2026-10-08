import { Schema, Types } from 'mongoose';

/** Removes __v / _id from JSON output, exposing `id` (string) instead. Also strips `passwordHash`/`tokenHash`. */
export function jsonTransformPlugin(schema: Schema): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      if (ret._id !== undefined) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      delete ret.__v;
      delete ret.passwordHash;
      delete ret.tokenHash;
      return ret;
    },
  });
  schema.set('toObject', { virtuals: false, versionKey: false });
}

export interface ITenantDoc {
  shopId: Types.ObjectId;
}

/** Adds a required, indexed `shopId` (tenant key) + JSON transform. Compound indexes in each model must lead with shopId. */
export function tenantPlugin(schema: Schema, opts: { unique?: boolean; index?: boolean } = {}): void {
  const { unique = false, index = true } = opts;
  schema.add({
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, ...(unique ? { unique: true } : index ? { index: true } : {}) },
  });
  jsonTransformPlugin(schema);
}

export interface ISoftDeleteDoc {
  deletedAt?: Date | null;
}

/** Adds `deletedAt` (null = alive). Use `{ deletedAt: null }` in queries; there is no automatic query hook so lean reads stay explicit. */
export function softDeletePlugin(schema: Schema): void {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });
}
