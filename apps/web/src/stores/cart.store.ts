import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCallback } from 'react';

/** ARCHITECTURE §6.4 — display snapshot only; server re-prices. unitPrice in minor units. */
export interface CartLine {
  productId: string;
  variantId: string;
  qty: number;
  snapshot: { name: string; image?: string; colour?: string; size?: string; unitPrice: number; slug?: string };
}

interface CartState {
  carts: Record<string, CartLine[]>;
  add: (shopSlug: string, line: CartLine) => void;
  setQty: (shopSlug: string, variantId: string, qty: number) => void;
  remove: (shopSlug: string, variantId: string) => void;
  clear: (shopSlug: string) => void;
}

const MAX_QTY = 99;
const EMPTY: CartLine[] = [];

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      add: (shopSlug, line) =>
        set((s) => {
          const lines = s.carts[shopSlug] ?? [];
          const idx = lines.findIndex((l) => l.variantId === line.variantId);
          const next =
            idx >= 0
              ? lines.map((l, i) =>
                  i === idx ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty), snapshot: line.snapshot } : l,
                )
              : [...lines, { ...line, qty: Math.min(MAX_QTY, Math.max(1, line.qty)) }];
          return { carts: { ...s.carts, [shopSlug]: next } };
        }),
      setQty: (shopSlug, variantId, qty) =>
        set((s) => {
          const lines = s.carts[shopSlug] ?? [];
          const next =
            qty <= 0
              ? lines.filter((l) => l.variantId !== variantId)
              : lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l));
          return { carts: { ...s.carts, [shopSlug]: next } };
        }),
      remove: (shopSlug, variantId) =>
        set((s) => ({ carts: { ...s.carts, [shopSlug]: (s.carts[shopSlug] ?? []).filter((l) => l.variantId !== variantId) } })),
      clear: (shopSlug) => set((s) => ({ carts: { ...s.carts, [shopSlug]: [] } })),
    }),
    { name: 'vastra-cart', version: 1, storage: createJSONStorage(() => localStorage), partialize: (s) => ({ carts: s.carts }) },
  ),
);

/** Cart bound to one shop. `lines` is referentially stable between unrelated updates. */
export function useCart(shopSlug: string) {
  const lines = useCartStore((s) => s.carts[shopSlug] ?? EMPTY);
  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotalEstimate = lines.reduce((n, l) => n + l.qty * l.snapshot.unitPrice, 0);
  return {
    lines,
    count,
    /** Display-only estimate; the server is authoritative. */
    subtotalEstimate,
    add: useCallback((line: CartLine) => add(shopSlug, line), [add, shopSlug]),
    setQty: useCallback((variantId: string, qty: number) => setQty(shopSlug, variantId, qty), [setQty, shopSlug]),
    remove: useCallback((variantId: string) => remove(shopSlug, variantId), [remove, shopSlug]),
    clear: useCallback(() => clear(shopSlug), [clear, shopSlug]),
  };
}
