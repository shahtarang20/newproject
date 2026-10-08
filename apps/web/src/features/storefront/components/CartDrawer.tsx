import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/stores/cart.store';
import { formatMoney } from '@/utils/format';
import { useStorefront } from '../hooks/useStorefront';
import { SfDialog, SfLinkButton, QtyStepper } from './ui-sf';
import { productPath } from './lib';

/** Mini-cart shown right after "Add to cart". */
export function CartDrawer() {
  const { shopSlug, shop, cartOpen, setCartOpen } = useStorefront();
  const cart = useCart(shopSlug);
  return (
    <SfDialog
      open={cartOpen}
      onOpenChange={setCartOpen}
      variant="right"
      title={`Your bag (${cart.count})`}
      description="Added to your bag"
      footer={
        cart.lines.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[color:var(--sf-muted-fg)]">Subtotal (estimate)</span>
              <span className="font-semibold">{formatMoney(cart.subtotalEstimate, shop.currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SfLinkButton to={`/shop/${shopSlug}/cart`} variant="outline" onClick={() => setCartOpen(false)}>
                View bag
              </SfLinkButton>
              <SfLinkButton to={`/shop/${shopSlug}/checkout`} onClick={() => setCartOpen(false)}>
                Checkout
              </SfLinkButton>
            </div>
          </div>
        )
      }
    >
      {cart.lines.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center text-sm text-[color:var(--sf-muted-fg)]">
          <ShoppingBag className="mb-3 h-8 w-8" aria-hidden="true" />
          Your bag is empty.
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--sf-border)]">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex gap-3 py-3">
              <Link to={l.snapshot.slug ? productPath(shopSlug, l.snapshot.slug) : `/shop/${shopSlug}`} onClick={() => setCartOpen(false)} className="h-20 w-16 shrink-0 overflow-hidden rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)]">
                {l.snapshot.image && <img src={l.snapshot.image} alt="" loading="lazy" width={64} height={80} className="h-full w-full object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{l.snapshot.name}</p>
                <p className="text-xs text-[color:var(--sf-muted-fg)]">{[l.snapshot.colour, l.snapshot.size].filter(Boolean).join(' · ')}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <QtyStepper size="sm" value={l.qty} min={0} onChange={(n) => cart.setQty(l.variantId, n)} label={`Quantity of ${l.snapshot.name}`} />
                  <span className="text-sm font-semibold">{formatMoney(l.snapshot.unitPrice * l.qty, shop.currency)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SfDialog>
  );
}
