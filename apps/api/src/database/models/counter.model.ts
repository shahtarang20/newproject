import { Schema, model } from 'mongoose';

/** Atomic sequences. `_id` is the sequence key, e.g. `order:<shopId>:<year>`. Use `findOneAndUpdate({_id},{$inc:{seq:1}},{upsert:true,new:true})`. */
export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false });

export const Counter = model<ICounter>('Counter', counterSchema);
