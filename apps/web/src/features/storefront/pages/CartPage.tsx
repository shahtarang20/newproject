import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertCircle, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { formatMoney } from '@/utils/format';
import { useStorefront } from '../hooks/useStorefront';
import { useCartPricing } from '../hooks/useCartPricing';
import { OrderSummary } from '../components/OrderSummary';
import { QtyStepper, SfButton, SfContainer, SfEmpty, SfError, SfInput, SfLinkButton } from '../components/ui-sf';
import { productPath } from '../components/lib';
import type { PricedCartLine } from '@/types/storefront';

const ISSUE_TEXT: Record<NonNullable<PricedCartLine['issue']>, string> = {
  OUT_OF_STOCK: 'This item is out of stock.',
  INSUFFICIENT_STOCK: 'Not enough stock for this quantity.',
  UNAVAILABLE: 'This item is no longer available.',
  PRICE_HIDDEN: 'Please contact the shop to buy this item.',
};

export default function CartPage() {
  const { shop, shopSlug, template } = useStorefront();
  const navigate = useNavigate();
  const { cart, priced, query, stale, blocking, lineIssue, couponCode, setCoupon, clearCoupon } = useCartPricing(shopSlug);
  const [code, setCode] = useState('');
  const { SectionHeading } = template;

  if (cart.lines.length === 0) {
    return (
      <SfContainer className="py-12 md:py-20">
        <SfEmpty
          icon={<ShoppingBag className="h-10 w-10" />}
          title="Your bag is empty"
          description="Looks like you haven't added anything yet. Explore the collection and find something you love."
          action={<SfLinkButton to={`/shop/${shopSlug}/products`}>Start shopping</SfLinkButton>}
        />
      </SfContainer>
    );
  }

  const couponInvalid = priced?.coupon && !priced.coupon.valid;

  return (
    <SfContainer className="py-8 md:py-12">
      <Helmet>
        <title>Your bag</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <SectionHeading title={`Your bag (${cart.count})`} />
      {query.isError && !priced && (
        <div className="mt-4">
          <SfError error={query.error} title="Couldn't refresh prices" onRetry={() => void query.refetch()} />
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-[color:var(--sf-border)] border-y border-[color:var(--sf-border)]">
          {cart.lines.map((l) => {
            const p = lineIssue(l.variantId);
            const issue = p?.issue ?? (p && !p.available ? 'UNAVAILABLE' : undefined);
            const unit = p?.unitPriceMinor ?? l.snapshot.unitPrice;
            const total = p && p.quantity === l.qty ? p.lineTotalMinor : unit * l.qty;
            const href = l.snapshot.slug ? productPath(shopSlug, l.snapshot.slug) : `/shop/${shopSlug}/products`;
            return (
              <li key={l.variantId} className="flex gap-4 py-5">
                <Link to={href} className="h-28 w-24 shrink-0 overflow-hidden rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)] sm:h-32 sm:w-28">
                  {(p?.imageUrl ?? l.snapshot.image) && <img src={p?.imageUrl ?? l.snapshot.image} alt={l.snapshot.name} width={112} height={128} loading="lazy" className="h-full w-full object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={href} className="line-clamp-2 font-medium hover:underline">{p?.name ?? l.snapshot.name}</Link>
                      <p className="mt-0.5 text-sm text-[color:var(--sf-muted-fg)]">{[l.snapshot.colour, l.snapshot.size && `Size ${l.snapshot.size}`].filter(Boolean).join(' · ')}</p>
                      <p className="mt-1 text-sm">
                        {formatMoney(unit, shop.currency)}
                        {p?.mrpMinor && p.mrpMinor > unit && <s className="ml-2 text-xs text-[color:var(--sf-muted-fg)]">{formatMoney(p.mrpMinor, shop.currency)}</s>}
                      </p>
                    </div>
                    <button type="button" onClick={() => cart.remove(l.variantId)} aria-label={`Remove ${l.snapshot.name}`} className="h-9 w-9 shrink-0 rounded-full text-[color:var(--sf-muted-fg)] hover:bg-[color:var(--sf-muted)] hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--sf-primary)]">
                      <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <QtyStepper size="sm" value={l.qty} min={1} max={p?.maxQuantity && p.maxQuantity > 0 ? Math.max(p.maxQuantity, l.qty) : 99} onChange={(n) => cart.setQty(l.variantId, n)} label={`Quantity of ${l.snapshot.name}`} />
                    <span className="font-semibold">{formatMoney(total, shop.currency)}</span>
                  </div>
                  {issue && (
                    <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--sf-radius,6px)] bg-red-50 px-3 py-2 text-sm text-red-800">
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{ISSUE_TEXT[issue]}</span>
                      {issue === 'INSUFFICIENT_STOCK' && p && p.maxQuantity > 0 && (
                        <button type="button" className="font-semibold underline underline-offset-2" onClick={() => cart.setQty(l.variantId, p.maxQuantity)}>
                          Reduce to {p.maxQuantity}
                        </button>
                      )}
                      <button type="button" className="font-semibold underline underline-offset-2" onClick={() => cart.remove(l.variantId)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit space-y-5 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <div>
            <label htmlFor="coupon" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Tag className="h-4 w-4" aria-hidden="true" /> Have a coupon?
            </label>
            {couponCode ? (
              <div className="flex items-center justify-between rounded-[var(--sf-radius,6px)] border border-dashed border-[color:var(--sf-primary)] px-3 py-2 text-sm">
                <span className="font-semibold tracking-wider">{couponCode}</span>
                <button type="button" onClick={clearCoupon} className="text-xs underline">Remove</button>
              </div>
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) {
                    setCoupon(code);
                    setCode('');
                  }
                }}
              >
                <SfInput id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" autoCapitalize="characters" />
                <SfButton type="submit" variant="outline" disabled={!code.trim()}>Apply</SfButton>
              </form>
            )}
            {couponInvalid && <p role="alert" className="mt-1.5 text-xs text-red-600">{priced?.coupon?.message ?? 'This coupon is not valid for your bag.'}</p>}
            {priced?.coupon?.valid && <p className="mt-1.5 text-xs text-green-700">{priced.coupon.message ?? 'Coupon applied.'}</p>}
          </div>

          <OrderSummary priced={priced} estimate={cart.subtotalEstimate} currency={shop.currency} dim={stale} />

          {blocking && <p role="alert" className="text-sm text-red-700">Please fix the items marked above to continue.</p>}
          <SfButton size="lg" className="w-full" disabled={blocking || !priced || stale} onClick={() => navigate(`/shop/${shopSlug}/checkout`)}>
            Checkout
          </SfButton>
          <p className="text-center text-xs text-[color:var(--sf-muted-fg)]">No account needed. Final prices are confirmed securely at checkout.</p>
          <Link to={`/shop/${shopSlug}/products`} className="block text-center text-sm underline underline-offset-4">Continue shopping</Link>
        </aside>
      </div>
    </SfContainer>
  );
}
