import type { FeatureKey, LimitKey } from '@vastra/shared';
import { formatBytes, formatNumber } from '@/utils/format';

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  customDomain: 'Custom domain',
  whatsappIntegration: 'WhatsApp integration',
  analytics: 'Analytics',
  advancedAnalytics: 'Advanced analytics',
  apiAccess: 'API access',
  customBranding: 'Custom branding',
  bulkImport: 'Bulk import / export',
  prioritySupport: 'Priority support',
};

export const LIMIT_TITLES: Record<LimitKey, string> = {
  products: 'Products',
  images: 'Images',
  videos: 'Videos',
  storageBytes: 'Storage',
  customers: 'Customers',
  ordersPerMonth: 'Orders this month',
  staff: 'Staff members',
  catalogues: 'Catalogues',
};

export const formatLimitValue = (key: LimitKey, n: number): string => (key === 'storageBytes' ? formatBytes(n) : formatNumber(n));

/** null = unlimited. */
export const formatLimit = (key: LimitKey, n: number | null): string => (n == null ? 'Unlimited' : formatLimitValue(key, n));

export type Tone = 'ok' | 'warn' | 'full';
export const toneFor = (used: number, limit: number | null): Tone => {
  if (limit == null || limit <= 0) return 'ok';
  const pct = (used / limit) * 100;
  return pct >= 100 ? 'full' : pct > 80 ? 'warn' : 'ok';
};

// ---- Razorpay (loaded on demand)
interface RazorpayInstance { open(): void; on?(event: string, cb: (resp: unknown) => void): void }
declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance }
}
let razorpayLoading: Promise<boolean> | null = null;
export function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayLoading) {
    razorpayLoading = new Promise<boolean>((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve(!!window.Razorpay);
      s.onerror = () => { razorpayLoading = null; s.remove(); resolve(false); };
      document.body.appendChild(s);
    });
  }
  return razorpayLoading;
}

export type CheckoutResult =
  | { status: 'success'; payload: Record<string, unknown> }
  | { status: 'dismissed' | 'failed' | 'unavailable' };

export async function openRazorpayCheckout(clientPayload: Record<string, unknown>): Promise<CheckoutResult> {
  if (!(await loadRazorpay()) || !window.Razorpay) return { status: 'unavailable' };
  const Rzp = window.Razorpay;
  return new Promise<CheckoutResult>((resolve) => {
    const rzp = new Rzp({
      ...clientPayload,
      handler: (resp: unknown) => resolve({ status: 'success', payload: (resp ?? {}) as Record<string, unknown> }),
      modal: { ...(clientPayload.modal as object | undefined), ondismiss: () => resolve({ status: 'dismissed' }) },
    });
    rzp.on?.('payment.failed', () => resolve({ status: 'failed' }));
    rzp.open();
  });
}
