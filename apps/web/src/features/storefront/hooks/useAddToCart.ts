import { useCallback } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/api/endpoints/storefront';
import { useCart } from '@/stores/cart.store';
import type { PublicProduct, PublicVariant } from '@/types/storefront';
import { useStorefront } from './useStorefront';

/** Adds a variant to the guest cart, fires ADD_TO_CART and opens the mini-cart drawer. */
export function useAddToCart() {
  const { shopSlug, setCartOpen } = useStorefront();
  const cart = useCart(shopSlug);

  return useCallback(
    (product: PublicProduct, variant: PublicVariant, qty = 1, opts?: { openDrawer?: boolean }) => {
      if (!variant.inStock) {
        toast.error('Sorry, this option is out of stock.');
        return false;
      }
      const image = variant.imageUrl ?? product.primaryImageUrl ?? product.media[0]?.url;
      cart.add({
        productId: product.id,
        variantId: variant.id,
        qty,
        snapshot: { name: product.name, image, colour: variant.colour, size: variant.size, unitPrice: variant.priceMinor, slug: product.slug },
      });
      trackEvent(shopSlug, { type: 'ADD_TO_CART', productId: product.id, meta: { variantId: variant.id, qty } });
      if (opts?.openDrawer !== false) setCartOpen(true);
      return true;
    },
    [cart, shopSlug, setCartOpen],
  );
}
