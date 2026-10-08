import type { InventoryTxnType } from '@vastra/shared';
import type { AdjustType } from '@/types/commerce';

export const ADJUST_TYPES: { value: AdjustType; label: string; hint: string }[] = [
  { value: 'PURCHASE', label: 'Purchase (stock in)', hint: 'New stock received. Enter a positive quantity.' },
  { value: 'RETURN', label: 'Return (stock in)', hint: 'Customer return put back on the shelf. Enter a positive quantity.' },
  { value: 'DAMAGE', label: 'Damage / loss (stock out)', hint: 'Damaged or lost pieces. Enter a positive quantity to remove.' },
  { value: 'ADJUSTMENT', label: 'Correction (+/-)', hint: 'Stock count correction. Use a negative number to reduce.' },
];

/** Signed stock change implied by the API's sign rules. */
export function signedDelta(type: AdjustType, quantity: number): number {
  if (type === 'DAMAGE') return -Math.abs(quantity);
  if (type === 'ADJUSTMENT') return quantity;
  return Math.abs(quantity);
}

export const TXN_BADGE: Record<InventoryTxnType, 'success' | 'info' | 'destructive' | 'warning' | 'neutral'> = {
  PURCHASE: 'success', RETURN: 'info', SALE: 'neutral', ADJUSTMENT: 'warning', DAMAGE: 'destructive',
};

export function variantText(colour?: unknown, size?: string | null): string {
  const c = typeof colour === 'string' ? colour : colour && typeof colour === 'object' ? (colour as { name?: string }).name : undefined;
  return [c, size].filter(Boolean).join(' / ') || 'Default';
}
