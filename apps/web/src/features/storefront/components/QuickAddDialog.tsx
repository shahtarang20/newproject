import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '@/types/storefront';
import { useAddToCart } from '../hooks/useAddToCart';
import { useStorefront } from '../hooks/useStorefront';
import { PriceTag } from './PriceTag';
import { QtyStepper, SfButton, SfDialog } from './ui-sf';
import { VariantPicker } from './VariantPicker';
import { defaultSelection, productPath, resolveVariant, type Selection } from './lib';

interface Props {
  product: PublicProduct | null;
  onClose: () => void;
}

export function QuickAddDialog({ product, onClose }: Props) {
  const { shop, shopSlug } = useStorefront();
  const addToCart = useAddToCart();
  const [sel, setSel] = useState<Selection>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) {
      setSel(defaultSelection(product));
      setQty(1);
    }
  }, [product]);

  if (!product) return null;
  const variant = resolveVariant(product, sel);
  const canAdd = !!variant && variant.inStock && !product.price.hidden;
  const img = variant?.imageUrl ?? product.primaryImageUrl ?? product.media[0]?.url;

  return (
    <SfDialog
      open
      onOpenChange={(o) => !o && onClose()}
      variant="center"
      title="Quick add"
      description={product.name}
      footer={
        <div className="flex items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} max={variant?.stockLeft ?? 99} />
          <SfButton
            className="flex-1"
            disabled={!canAdd}
            onClick={() => {
              if (variant && addToCart(product, variant, qty)) onClose();
            }}
          >
            {product.price.hidden ? 'Contact shop' : variant && !variant.inStock ? 'Out of stock' : 'Add to cart'}
          </SfButton>
        </div>
      }
    >
      <div className="flex gap-4">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)]">
          {img && <img src={img} alt="" width={96} height={112} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 space-y-2">
          <PriceTag product={product} currency={shop.currency} variant={variant} />
          <Link to={productPath(shopSlug, product.slug)} onClick={onClose} className="text-sm underline underline-offset-4 text-[color:var(--sf-primary)]">
            View full details
          </Link>
        </div>
      </div>
      <div className="mt-5">
        <VariantPicker product={product} selection={sel} onChange={(s) => setSel(s)} variant={variant} />
      </div>
    </SfDialog>
  );
}
