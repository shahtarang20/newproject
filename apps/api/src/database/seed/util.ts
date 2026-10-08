import { Types } from 'mongoose';

/**
 * By default the seed draws its own garment illustrations (see ./art) — no network, no copyrighted assets.
 * Set SEED_IMAGE_BASE (e.g. https://picsum.photos/seed) to use an external placeholder host instead.
 */
export const imageBase = (): string => (process.env.SEED_IMAGE_BASE?.trim() ?? '').replace(/\/+$/, '');
export const useExternalImages = (): boolean => imageBase() !== '';

export const imageUrl = (seedKey: string, w: number, h: number): string => `${imageBase()}/${seedKey}/${w}/${h}`;

/** Rupees -> paise. */
export const rp = (rupees: number): number => Math.round(rupees * 100);

/** Tax contained in a tax-inclusive amount (mirrors cart.service). */
export const inclusiveTax = (amountMinor: number, percent: number): number =>
  percent > 0 ? Math.round((amountMinor * percent) / (100 + percent)) : 0;

export const newId = (): Types.ObjectId => new Types.ObjectId();

export const idStr = (id: Types.ObjectId): string => String(id);

export const pad = (n: number, width: number): string => String(n).padStart(width, '0');

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
