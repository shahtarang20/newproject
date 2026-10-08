import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { lookupApi } from '@/api/endpoints/orders';
import { SearchInput } from '@/components/common/SearchInput';
import { ErrorState } from '@/components/common/ErrorState';
import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { LookupProduct, LookupVariant } from '@/types/commerce';
import { variantLabel } from '../utils';

export interface PickedLine {
  productId: string;
  variantId: string;
  name: string;
  label: string;
  imageUrl?: string;
  priceMinor: number;
  stock: number;
}

/**
 * Minimal local product -> variant picker (no shared ProductPicker existed when this was written).
 * Search a product, then tap a variant to add it.
 */
export function VariantPicker({ onAdd, currency }: { onAdd: (line: PickedLine) => void; currency?: string }) {
  const [q, setQ] = useState('');
  const [product, setProduct] = useState<LookupProduct | null>(null);

  const products = useQuery({ queryKey: ['lookup', 'products', q], queryFn: () => lookupApi.products(q), enabled: !product, staleTime: 30_000 });
  const variants = useQuery({
    queryKey: ['lookup', 'variants', product?.id],
    queryFn: () => lookupApi.variants(product!.id),
    enabled: !!product,
  });

  if (product) {
    return (
      <div className="rounded-xl border">
        <div className="flex items-center gap-2 border-b p-2">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setProduct(null)} aria-label="Back to products">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="truncate text-sm font-medium">{product.name}</p>
        </div>
        {variants.isLoading ? (
          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : variants.error ? (
          <ErrorState error={variants.error} onRetry={() => variants.refetch()} className="m-2 py-6" />
        ) : (
          <ul className="max-h-64 divide-y overflow-y-auto">
            {(variants.data ?? []).filter((v: LookupVariant) => v.isActive).map((v) => (
              <li key={v.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{variantLabel(v.colour, v.size)}</p>
                  <p className="text-xs text-muted-foreground">
                    <MoneyText minor={v.sellingPriceMinor} currency={currency} /> · {v.stock > 0 ? `${v.stock} in stock` : <Badge variant="destructive">Out of stock</Badge>}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  disabled={v.stock <= 0}
                  onClick={() =>
                    onAdd({
                      productId: product.id, variantId: v.id, name: product.name, label: variantLabel(v.colour, v.size),
                      imageUrl: v.imageUrl || product.primaryThumbUrl, priceMinor: v.sellingPriceMinor, stock: v.stock,
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </li>
            ))}
            {variants.data?.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No variants for this product.</li>}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SearchInput value={q} onChange={setQ} placeholder="Search products by name or SKU" />
      <div className="rounded-xl border">
        {products.isLoading ? (
          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : products.error ? (
          <ErrorState error={products.error} onRetry={() => products.refetch()} className="m-2 py-6" />
        ) : (products.data?.length ?? 0) === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No active products found.</p>
        ) : (
          <ul className="max-h-56 divide-y overflow-y-auto">
            {products.data!.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setProduct(p)} className="flex min-h-12 w-full items-center gap-3 p-2.5 text-left hover:bg-secondary">
                  <Thumb src={p.primaryThumbUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    {p.sku && <span className="block truncate text-xs text-muted-foreground">{p.sku}</span>}
                  </span>
                  {typeof p.stockTotal === 'number' && <span className="text-xs text-muted-foreground">{p.stockTotal} in stock</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Thumb({ src, size = 'h-10 w-10' }: { src?: string; size?: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className={`${size} shrink-0 rounded-lg border object-cover`} />
  ) : (
    <span className={`${size} shrink-0 rounded-lg border bg-muted`} />
  );
}
