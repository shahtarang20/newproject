import type { PublicProduct, PublicVariant } from '@/types/storefront';
import { ORDER_STATUS_LABELS } from '@/utils/labels';
import type { OrderStatus } from '@vastra/shared';

/** "GEORGETTE" / "READY_FOR_PICKUP" -> "Georgette" / "Ready for pickup" */
export function humanize(value: string): string {
  if (!value) return value;
  if (value !== value.toUpperCase() && !value.includes('_')) return value;
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? humanize(status);
}

export const shopPath = (slug: string, sub = '') => `/shop/${slug}${sub ? `/${sub}` : ''}`;
export const productPath = (slug: string, productSlug: string) => `/shop/${slug}/product/${productSlug}`;

export interface Selection {
  colour?: string;
  size?: string;
}

const same = (a?: string, b?: string) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

/** Variant that matches the selection on every dimension the product actually has. */
export function resolveVariant(product: PublicProduct, sel: Selection): PublicVariant | undefined {
  const hasColour = product.colours.length > 0;
  const hasSize = product.sizes.length > 0;
  return product.variants.find(
    (v) => (!hasColour || same(v.colour, sel.colour)) && (!hasSize || same(v.size, sel.size)),
  );
}

export function defaultSelection(product: PublicProduct): Selection {
  const first = product.variants.find((v) => v.inStock) ?? product.variants[0];
  return { colour: first?.colour, size: first?.size };
}

export function needsVariantChoice(product: PublicProduct): boolean {
  return product.variants.length > 1;
}

export function variantPrice(product: PublicProduct, variant?: PublicVariant) {
  if (variant) return { selling: variant.priceMinor, mrp: variant.mrpMinor };
  return { selling: product.price.sellingMinor, mrp: product.price.mrpMinor };
}

export function discountPct(selling?: number, mrp?: number): number | undefined {
  if (!selling || !mrp || mrp <= selling) return undefined;
  return Math.round(((mrp - selling) / mrp) * 100);
}
