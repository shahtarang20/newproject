import { ApiError } from '@/api/client';

const FRIENDLY: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  SLUG_TAKEN: 'That shop link is already taken.',
  SHOP_SUSPENDED: 'This shop is currently suspended. Contact support.',
  FEATURE_NOT_IN_PLAN: 'This feature is not included in your plan. Upgrade to unlock it.',
  UPLOAD_TOO_LARGE: 'That file is too large.',
  UPLOAD_INVALID_TYPE: 'That file type is not supported.',
  OUT_OF_STOCK: 'Sorry, that item is out of stock.',
  INSUFFICIENT_STOCK: 'Not enough stock available.',
};

/** Convert any thrown value into a message that is safe to show to end users. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Cannot reach the server. Check your connection.';
    if (error.code === 'INTERNAL_ERROR') return fallback;
    return FRIENDLY[error.code] && error.code !== 'VALIDATION_ERROR' ? FRIENDLY[error.code] : error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Map API validation `details` (zod flatten) to `{ field: message }`. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return {};
  const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
  if (!fieldErrors) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fieldErrors)) if (v?.[0]) out[k] = v[0];
  return out;
}
