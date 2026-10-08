import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, HelpCircle, ShoppingBag, Zap } from 'lucide-react';
import { ApiError } from '@/api/client';
import { trackEvent } from '@/api/endpoints/storefront';
import { useCart } from '@/stores/cart.store';
import type { PublicProduct } from '@/types/storefront';
import { absoluteUrl } from '@/utils/seo';
import { useStorefront } from '../hooks/useStorefront';
import { useProductQuery, useProductsQuery } from '../hooks/useStorefrontApi';
import { useAddToCart } from '../hooks/useAddToCart';
import { useQuickAdd } from '../hooks/useQuickAdd';
import { Gallery } from '../components/Gallery';
import { PriceTag } from '../components/PriceTag';
import { VariantPicker } from '../components/VariantPicker';
import { EnquiryDialog } from '../components/EnquiryDialog';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { ShareButton } from '../components/ShareButton';
import { StickyBuyBar, StickyBuyBarSpacer } from '../components/StickyBuyBar';
import { ProductGrid } from '../components/ProductGrid';
import { QtyStepper, SfButton, SfContainer, SfError, SfSkeleton } from '../components/ui-sf';
import { defaultSelection, humanize, productPath, resolveVariant, type Selection } from '../components/lib';

function detailRows(p: PublicProduct): [string, string][] {
  const rows: [string, string | undefined][] = [
    ['Fabric', p.fabric ? humanize(p.fabric) : undefined],
    ['Brand', p.brand],
    ['Occasion', p.occasion?.length ? p.occasion.map(humanize).join(', ') : undefined],
    ['Gender', p.gender ? humanize(p.gender) : undefined],
    ['SKU', p.sku],
  ];
  const s = p.sareeAttrs;
  if (s) {
    rows.push(
      ['Saree type', s.sareeType ? humanize(s.sareeType) : undefined],
      ['Saree length', s.length],
      ['Blouse piece', s.blouseIncluded === undefined ? undefined : s.blouseIncluded ? `Included${s.blouseLength ? ` (${s.blouseLength})` : ''}` : 'Not included'],
      ['Work', s.workTypes?.length ? s.workTypes.map(humanize).join(', ') : undefined],
      ['Border', s.borderType],
      ['Pattern', s.pattern],
      ['Care', s.washCare],
    );
  }
  const g = p.garmentAttrs;
  if (g) {
    rows.push(['Fit', g.fit], ['Sleeve', g.sleeveType], ['Neck', g.neckType], ['Pattern', g.pattern], ['Care', g.washCare]);
  }
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export default function ProductPage() {
  const { productSlug = '' } = useParams<{ productSlug: string }>();
  const { shop, shopSlug } = useStorefront();
  const navigate = useNavigate();
  const q = useProductQuery(shopSlug, productSlug);
  const product = q.data;

  if (q.isPending) {
    return (
      <SfContainer className="grid gap-8 py-8 md:grid-cols-2">
        <SfSkeleton className="aspect-[4/5] w-full" />
        <div className="space-y-4">
          <SfSkeleton className="h-8 w-3/4" />
          <SfSkeleton className="h-6 w-1/3" />
          <SfSkeleton className="h-24 w-full" />
          <SfSkeleton className="h-12 w-full" />
        </div>
      </SfContainer>
    );
  }
  if (q.isError || !product) {
    const missing = q.error instanceof ApiError && q.error.status === 404;
    return (
      <SfContainer className="py-12">
        <SfError error={q.error} title={missing ? 'Product not found' : undefined} message={missing ? 'This product may have been removed or is no longer available.' : undefined} onRetry={missing ? undefined : () => void q.refetch()} />
        <p className="mt-6 text-center">
          <Link to={`/shop/${shopSlug}/products`} className="underline underline-offset-4 text-[color:var(--sf-primary)]">Continue shopping</Link>
        </p>
      </SfContainer>
    );
  }
  return <ProductView key={product.id} product={product} onBuyNow={() => navigate(`/shop/${shop.slug}/checkout`)} />;
}

function ProductView({ product, onBuyNow }: { product: PublicProduct; onBuyNow: () => void }) {
  const { shop, shopSlug, template } = useStorefront();
  const addToCart = useAddToCart();
  const cart = useCart(shopSlug);
  const [sel, setSel] = useState<Selection>(() => defaultSelection(product));
  const [qty, setQty] = useState(1);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const { onQuickAdd, dialog } = useQuickAdd();

  const variant = useMemo(() => resolveVariant(product, sel), [product, sel]);
  const rows = useMemo(() => detailRows(product), [product]);
  const priced = !product.price.hidden && (variant?.priceMinor ?? product.price.sellingMinor) !== undefined;
  const canBuy = priced && !!variant && variant.inStock;
  const inCart = variant ? (cart.lines.find((l) => l.variantId === variant.id)?.qty ?? 0) : 0;
  const maxQty = variant?.stockLeft !== undefined ? Math.max(1, variant.stockLeft - inCart) : 99;

  useEffect(() => {
    trackEvent(shopSlug, { type: 'PRODUCT_VIEW', productId: product.id });
  }, [shopSlug, product.id]);

  useEffect(() => setQty((n) => Math.min(n, maxQty)), [maxQty]);

  const relatedQ = useProductsQuery(shopSlug, { category: product.category?.slug, limit: 5, sort: 'popular' }, !!product.category);
  const related = (relatedQ.data?.data ?? []).filter((p) => p.id !== product.id).slice(0, 4);

  const url = absoluteUrl(productPath(shopSlug, product.slug));
  const images = product.media.filter((m) => m.kind === 'IMAGE').map((m) => m.url);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: images.length ? images : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category?.name,
    ...(priced && product.price.sellingMinor !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: shop.currency,
            price: (product.price.sellingMinor / 100).toFixed(2),
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  };

  const handleAdd = () => variant && addToCart(product, variant, qty);
  const handleBuyNow = () => {
    if (variant && addToCart(product, variant, qty, { openDrawer: false })) onBuyNow();
  };

  const buyLabel = product.price.hidden ? 'Contact shop for price' : variant && !variant.inStock ? 'Out of stock' : 'Add to cart';

  return (
    <SfContainer className="py-5 md:py-10">
      <Helmet>
        <title>{product.seo?.title || product.name}</title>
        <meta name="description" content={(product.seo?.description || product.description || `${product.name} at ${shop.name}`).slice(0, 300)} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.seo?.title || product.name} />
        <meta property="og:url" content={url} />
        {(product.primaryImageUrl ?? images[0]) && <meta property="og:image" content={product.primaryImageUrl ?? images[0]} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-[color:var(--sf-muted-fg)] sm:text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to={`/shop/${shopSlug}`} className="hover:underline">Home</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li><Link to={`/shop/${shopSlug}/category/${product.category.slug}`} className="hover:underline">{product.category.name}</Link></li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="line-clamp-1 text-[color:var(--sf-fg)]">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
        <div className="-mx-4 sm:mx-0 md:sticky md:top-24 md:self-start">
          <Gallery media={product.media} name={product.name} activeUrl={variant?.imageUrl} />
        </div>

        <div className="space-y-6">
          <header className="space-y-2">
            {product.brand && <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--sf-muted-fg)]">{product.brand}</p>}
            <h1 className="font-display text-2xl font-semibold leading-tight md:text-4xl">{product.name}</h1>
            {product.offerBadge && (
              <span className="inline-block rounded-full bg-[color:var(--sf-accent)] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--sf-fg)]">{product.offerBadge}</span>
            )}
            <PriceTag product={product} currency={shop.currency} variant={variant} size="lg" />
            {!product.price.hidden && <p className="text-xs text-[color:var(--sf-muted-fg)]">Inclusive of all taxes where applicable</p>}
          </header>

          <VariantPicker product={product} selection={sel} onChange={(s) => setSel(s)} variant={variant} />

          {product.inStock || product.price.hidden ? null : (
            <p className="rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)] px-3 py-2 text-sm">This product is currently sold out. Ask the shop about availability.</p>
          )}

          <div className="space-y-3">
            {priced && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity</span>
                <QtyStepper value={qty} onChange={setQty} max={maxQty} />
              </div>
            )}
            {priced && (
              <div className="grid gap-3 sm:grid-cols-2">
                <SfButton size="lg" disabled={!canBuy} onClick={handleAdd}>
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {buyLabel}
                </SfButton>
                <SfButton size="lg" variant="outline" disabled={!canBuy} onClick={handleBuyNow}>
                  <Zap className="h-4 w-4" aria-hidden="true" /> Buy now
                </SfButton>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <SfButton variant="outline" onClick={() => setEnquiryOpen(true)}>
                <HelpCircle className="h-4 w-4" aria-hidden="true" /> Ask about this product
              </SfButton>
              <WhatsAppButton product={product} variant={variant} colour={sel.colour} />
            </div>
            <div className="flex justify-end">
              <ShareButton productId={product.id} title={`${product.name} — ${shop.name}`} path={productPath(shopSlug, product.slug)} />
            </div>
          </div>

          <div className="divide-y divide-[color:var(--sf-border)] border-y border-[color:var(--sf-border)]">
            {product.description && (
              <Disclosure title="Description" defaultOpen>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--sf-muted-fg)]">{product.description}</p>
              </Disclosure>
            )}
            {rows.length > 0 && (
              <Disclosure title="Product details" defaultOpen={!product.description}>
                <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-6 gap-y-2 text-sm">
                  {rows.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[color:var(--sf-muted-fg)]">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Disclosure>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 md:mt-20" aria-label="You may also like">
          <template.SectionHeading title="You may also like" align="center" />
          <div className="mt-6">
            <ProductGrid products={related} shop={shop} onQuickAdd={onQuickAdd} priorityCount={0} />
          </div>
        </section>
      )}

      <StickyBuyBar>
        <div className="min-w-0 flex-1">
          <PriceTag product={product} currency={shop.currency} variant={variant} />
        </div>
        {priced ? (
          <SfButton disabled={!canBuy} onClick={handleAdd} className="shrink-0">
            {buyLabel}
          </SfButton>
        ) : (
          <SfButton onClick={() => setEnquiryOpen(true)} className="shrink-0">
            Ask the shop
          </SfButton>
        )}
      </StickyBuyBar>
      <StickyBuyBarSpacer />

      <EnquiryDialog open={enquiryOpen} onOpenChange={setEnquiryOpen} product={product} variantId={variant?.id} />
      {dialog}
    </SfContainer>
  );
}

function Disclosure({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group py-1" open={defaultOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-display text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--sf-primary)] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}
