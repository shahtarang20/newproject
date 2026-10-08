import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useCart } from '@/stores/cart.store';
import { useDebounce } from '@/hooks/useDebounce';
import type { CartPriceRequest, PricedCartLine } from '@/types/storefront';
import { usePricedCart } from './useStorefrontApi';

interface CouponState {
  codes: Record<string, string>;
  set: (slug: string, code: string) => void;
}
const useCouponStore = create<CouponState>()(
  persist((set) => ({ codes: {}, set: (slug, code) => set((s) => ({ codes: { ...s.codes, [slug]: code } })) }), {
    name: 'vastra-coupon',
    storage: createJSONStorage(() => sessionStorage),
  }),
);

export const BLOCKING_ISSUES: PricedCartLine['issue'][] = ['OUT_OF_STOCK', 'INSUFFICIENT_STOCK', 'UNAVAILABLE', 'PRICE_HIDDEN'];

/** Server-authoritative cart pricing (debounced) shared by the cart and checkout pages. */
export function useCartPricing(shopSlug: string) {
  const cart = useCart(shopSlug);
  const couponCode = useCouponStore((s) => s.codes[shopSlug] ?? '');
  const setCouponStore = useCouponStore((s) => s.set);

  const liveReq = useMemo<CartPriceRequest>(
    () => ({
      items: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.qty })),
      couponCode: couponCode || undefined,
    }),
    [cart.lines, couponCode],
  );
  const req = useDebounce(liveReq, 350);
  const query = usePricedCart(shopSlug, req, cart.lines.length > 0);

  const priced = cart.lines.length > 0 ? query.data : undefined;
  const lineIssue = useCallback((variantId: string) => priced?.lines.find((l) => l.variantId === variantId), [priced]);
  const blocking = !!priced?.lines.some((l) => !l.available || (l.issue && BLOCKING_ISSUES.includes(l.issue)));
  /** true while the displayed prices may not match the current cart */
  const stale = liveReq !== req || query.isFetching;

  return {
    cart,
    priced,
    query,
    stale,
    blocking,
    lineIssue,
    couponCode,
    setCoupon: (code: string) => setCouponStore(shopSlug, code.trim().toUpperCase()),
    clearCoupon: () => setCouponStore(shopSlug, ''),
  };
}
