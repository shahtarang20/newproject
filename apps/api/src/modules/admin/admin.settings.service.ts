import { PlatformSetting } from '@/database/models/platform-setting.model';
import { oid } from './admin.helpers';

export const SETTING_DEFAULTS = {
  maintenance: { enabled: false, message: '' },
  signupsEnabled: true,
  featureFlags: {} as Record<string, boolean>,
  defaults: { currency: 'INR', trialDays: 14, lowStockThreshold: 5 },
};
export type PlatformSettings = typeof SETTING_DEFAULTS;

const DESCRIPTIONS: Record<keyof PlatformSettings, string> = {
  maintenance: 'Maintenance mode flag and public message',
  signupsEnabled: 'Allow new shop registrations',
  featureFlags: 'Free-form boolean feature flags',
  defaults: 'Platform defaults (currency, trial days, low-stock threshold)',
};

export async function getSettings(): Promise<PlatformSettings> {
  const rows = await PlatformSetting.find({ key: { $in: Object.keys(SETTING_DEFAULTS) } }).lean();
  const out: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const r of rows) {
    const def = (SETTING_DEFAULTS as Record<string, unknown>)[r.key];
    out[r.key] = def && typeof def === 'object' && !Array.isArray(def) && r.value && typeof r.value === 'object' ? { ...def, ...(r.value as object) } : r.value;
  }
  return out as PlatformSettings;
}

/** Reusable by other modules (e.g. maintenance / signup gating): `await getPlatformSetting('signupsEnabled')`. */
export async function getPlatformSetting<K extends keyof PlatformSettings>(key: K): Promise<PlatformSettings[K]> {
  return (await getSettings())[key];
}

export async function updateSettings(userId: string, input: Partial<PlatformSettings>) {
  const before = await getSettings();
  for (const [key, patch] of Object.entries(input) as Array<[keyof PlatformSettings, unknown]>) {
    if (patch === undefined) continue;
    // Objects are merged with the current value (featureFlags replaces wholesale so flags can be removed).
    const value =
      key === 'featureFlags' || typeof patch !== 'object' || patch === null ? patch : { ...(before[key] as object), ...(patch as object) };
    await PlatformSetting.updateOne({ key }, { $set: { value, description: DESCRIPTIONS[key], updatedBy: oid(userId) } }, { upsert: true });
  }
  return { before, after: await getSettings() };
}
