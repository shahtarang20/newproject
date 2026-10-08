/** Normalise a phone to digits with an optional leading "+" (so the same number always matches per-shop unique index). */
export function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/\D/g, '');
}

export const PHONE_REGEX = /^\+?[0-9\s-]{7,16}$/;
