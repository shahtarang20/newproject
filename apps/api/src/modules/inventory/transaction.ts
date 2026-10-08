import mongoose, { type ClientSession } from 'mongoose';
import { logger } from '@/config/logger';

let cached: boolean | undefined;

/** True when the connected MongoDB supports multi-document transactions (replica set / mongos). Cached. */
export async function supportsTransactions(): Promise<boolean> {
  if (cached !== undefined) return cached;
  try {
    const db = mongoose.connection.db;
    if (!db) return false; // not connected yet; do not cache
    const hello = (await db.admin().command({ hello: 1 })) as { setName?: string; msg?: string };
    cached = Boolean(hello.setName) || hello.msg === 'isdbgrid';
  } catch {
    cached = false;
  }
  return cached;
}

export interface AtomicCtx {
  /** Defined only when running inside a real Mongo transaction. Pass it to every query/write. */
  session?: ClientSession;
  /**
   * Register a compensating action. Only used when transactions are unavailable: on failure the
   * registered actions run in reverse order. Inside a real transaction the abort already undoes everything.
   */
  onRollback(fn: () => Promise<void>): void;
}

/**
 * Runs `work` atomically: inside a Mongo transaction when supported, otherwise sequentially with
 * compensating rollback of everything registered through `ctx.onRollback`.
 * `work` may be retried by the driver on transient transaction errors, so keep it free of external side effects.
 */
export async function runAtomic<T>(work: (ctx: AtomicCtx) => Promise<T>): Promise<T> {
  if (await supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work({ session, onRollback: () => undefined });
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  const undo: Array<() => Promise<void>> = [];
  try {
    return await work({ session: undefined, onRollback: (fn) => void undo.push(fn) });
  } catch (err) {
    for (const fn of undo.reverse()) {
      try {
        await fn();
      } catch (rollbackErr) {
        logger.error({ err: rollbackErr }, 'compensating rollback step failed');
      }
    }
    throw err;
  }
}
