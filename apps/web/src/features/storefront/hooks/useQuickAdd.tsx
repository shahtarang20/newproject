import { useCallback, useState } from 'react';
import type { PublicProduct } from '@/types/storefront';
import { QuickAddDialog } from '../components/QuickAddDialog';
import { needsVariantChoice } from '../components/lib';
import { useAddToCart } from './useAddToCart';

/** Product-card quick add: single-variant products go straight to cart, others open the picker. */
export function useQuickAdd() {
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const addToCart = useAddToCart();

  const onQuickAdd = useCallback(
    (p: PublicProduct) => {
      if (!needsVariantChoice(p) && p.variants[0] && !p.price.hidden) addToCart(p, p.variants[0], 1);
      else setProduct(p);
    },
    [addToCart],
  );

  return { onQuickAdd, dialog: <QuickAddDialog product={product} onClose={() => setProduct(null)} /> };
}
