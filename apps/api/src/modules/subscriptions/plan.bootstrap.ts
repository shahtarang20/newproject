import { SubscriptionPlan, type ISubscriptionPlan } from '@/database/models/subscription-plan.model';
import { logger } from '@/config/logger';
import { PLAN_SEEDS } from './plan.defaults';

type PlanDoc = ISubscriptionPlan;

/**
 * Seeds FREE/STARTER/PRO/BUSINESS ONLY when the plans collection is empty, then returns the plan flagged
 * `isDefault` (falling back to the first active plan by sortOrder). Safe under concurrent first calls.
 */
export async function ensureDefaultPlan(): Promise<PlanDoc> {
  if ((await SubscriptionPlan.estimatedDocumentCount()) === 0) {
    try {
      await SubscriptionPlan.insertMany(PLAN_SEEDS.map((p) => ({ ...p, currency: 'INR', isActive: true })), { ordered: false });
      logger.info('Seeded default subscription plans');
    } catch (err) {
      // A concurrent request may have inserted them first (duplicate code) — that is fine.
      if ((await SubscriptionPlan.estimatedDocumentCount()) === 0) throw err;
    }
  }
  const plan =
    (await SubscriptionPlan.findOne({ isDefault: true, isActive: true }).lean()) ??
    (await SubscriptionPlan.findOne({ isActive: true }).sort({ sortOrder: 1 }).lean());
  if (!plan) throw new Error('No active subscription plan available');
  return plan;
}
