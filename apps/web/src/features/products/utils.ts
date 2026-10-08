import type { Product } from '@/types/catalog';
import { formatMoney } from '@/utils/format';
import { ApiError } from '@/api/client';

export const LIMIT_ERROR_CODES_SET = new Set([
  'PRODUCT_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'VIDEO_LIMIT_REACHED', 'STORAGE_LIMIT_REACHED', 'CATALOGUE_LIMIT_REACHED', 'FEATURE_NOT_IN_PLAN',
]);

export function isLimitError(e: unknown): e is ApiError {
  return e instanceof ApiError && LIMIT_ERROR_CODES_SET.has(e.code);
}

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');
export const publicProductUrl = (shopSlug: string, productSlug: string) => `${origin()}/shop/${shopSlug}/product/${productSlug}`;
export const publicCatalogueUrl = (shopSlug: string, slug: string) => `${origin()}/shop/${shopSlug}/catalogue/${slug}`;
export const productPath = (shopSlug: string, productSlug: string) => `/shop/${shopSlug}/product/${productSlug}`;

export function priceRangeText(p: Pick<Product, 'pricing'>, currency = 'INR'): string {
  const lo = p.pricing?.minSellingMinor;
  const hi = p.pricing?.maxSellingMinor;
  if (p.pricing?.hidePrice) return 'Price hidden';
  if (lo == null) return '—';
  return hi != null && hi !== lo ? `${formatMoney(lo, currency)} – ${formatMoney(hi, currency)}` : formatMoney(lo, currency);
}

export const whatsappShareUrl = (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
