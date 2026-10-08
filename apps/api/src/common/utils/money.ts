export { toMinor, fromMinor } from '@vastra/shared';

/** Percentage of an integer minor amount, rounded half-up to an integer. */
export const percentOf = (amountMinor: number, percent: number): number => Math.round((amountMinor * percent) / 100);

/** Tax included in a tax-inclusive amount. */
export const inclusiveTax = (grossMinor: number, taxPercent: number): number =>
  taxPercent <= 0 ? 0 : Math.round(grossMinor - grossMinor / (1 + taxPercent / 100));

export const clampMinor = (n: number): number => Math.max(0, Math.round(n));

export const formatMoney = (minor: number, currency = 'INR', locale = 'en-IN'): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
