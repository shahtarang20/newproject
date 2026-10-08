import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Store } from 'lucide-react';
import { useShopSlug } from '@/hooks/useShopSlug';
import { ApiError } from '@/api/client';
import { trackEvent } from '@/api/endpoints/storefront';
import { useCart } from '@/stores/cart.store';
import { absoluteUrl } from '@/utils/seo';
import { TemplateProvider, useTemplate } from '@/features/storefront/templates/useTemplate';
import { StorefrontContext, useStorefront } from '@/features/storefront/hooks/useStorefront';
import { useCategoriesQuery, useShopQuery } from '@/features/storefront/hooks/useStorefrontApi';
import { CartDrawer } from '@/features/storefront/components/CartDrawer';
import { SfError, SfSkeleton } from '@/features/storefront/components/ui-sf';
import type { PublicShop } from '@/types/storefront';

export { useStorefront };

/** Branded loading skeleton (neutral until the template + tokens are available). */
function ShopSkeleton({ name }: { name?: string }) {
  return (
    <div className="min-h-screen bg-[color:var(--sf-bg,#fafafa)]" role="status" aria-label="Loading shop">
      <div className="border-b border-black/5 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {name ? <span className="font-display text-xl font-semibold">{name}</span> : <SfSkeleton className="h-6 w-32" />}
          <SfSkeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <SfSkeleton className="h-52 w-full sm:h-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SfSkeleton className="aspect-[4/5] w-full" />
              <SfSkeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopUnavailable({ notFound, onRetry, error }: { notFound: boolean; onRetry: () => void; error: unknown }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {notFound ? (
        <>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
            <Store className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold">We couldn&apos;t find this shop</h1>
          <p className="mt-2 text-sm text-black/60">
            The link may be incorrect, or the shop is temporarily unavailable. Please check the link you received and try again.
          </p>
        </>
      ) : (
        <SfError error={error} title="Shop unavailable" onRetry={onRetry} />
      )}
    </main>
  );
}

function StorefrontInner({ shop, children }: { shop: PublicShop; children: ReactNode }) {
  const template = useTemplate();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cart = useCart(shop.slug);
  const categoriesQ = useCategoriesQuery(shop.slug);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const onSearch = useCallback(
    (q: string) => navigate(`/shop/${shop.slug}/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    [navigate, shop.slug],
  );

  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const value = useMemo(
    () => ({ shopSlug: shop.slug, shop, categories, template, cartOpen, setCartOpen }),
    [shop, categories, template, cartOpen],
  );

  const title = shop.seo?.title || shop.name;
  const description = shop.seo?.description || shop.description || `Shop ${shop.name} online.`;
  const image = shop.seo?.ogImageUrl || shop.coverUrl || shop.logoUrl;
  const canonical = absoluteUrl(pathname);

  return (
    <StorefrontContext.Provider value={value}>
      <Helmet defaultTitle={title} titleTemplate={`%s | ${shop.name}`}>
        <title>{title}</title>
        <meta name="description" content={description.slice(0, 300)} />
        <link rel="canonical" href={canonical} />
        <meta property="og:site_name" content={shop.name} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description.slice(0, 300)} />
        <meta property="og:url" content={canonical} />
        {image && <meta property="og:image" content={image} />}
        <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
        {shop.theme.primaryColor && <meta name="theme-color" content={shop.theme.primaryColor} />}
        {shop.logoUrl && <link rel="icon" href={shop.logoUrl} />}
      </Helmet>
      <template.Shell shop={shop} cartCount={cart.count} categories={categories} onSearch={onSearch}>
        {children}
      </template.Shell>
      <CartDrawer />
    </StorefrontContext.Provider>
  );
}

export default function StorefrontLayout() {
  const shopSlug = useShopSlug();
  const shopQ = useShopQuery(shopSlug);

  useEffect(() => {
    if (!shopQ.data) return;
    try {
      const key = `vastra-sv-${shopSlug}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage blocked: still track */
    }
    trackEvent(shopSlug, { type: 'SHOP_VIEW' });
  }, [shopQ.data, shopSlug]);

  if (shopQ.isPending) return <ShopSkeleton />;
  if (shopQ.isError || !shopQ.data) {
    const e = shopQ.error;
    const notFound = e instanceof ApiError && (e.code === 'SHOP_NOT_FOUND' || e.status === 404 || e.code === 'SHOP_SUSPENDED');
    return <ShopUnavailable notFound={notFound} error={e} onRetry={() => void shopQ.refetch()} />;
  }

  const shop = shopQ.data;
  return (
    <TemplateProvider
      templateId={shop.theme.templateId}
      primaryColor={shop.theme.primaryColor}
      buttonStyle={shop.theme.buttonStyle}
      fallback={<ShopSkeleton name={shop.name} />}
    >
      <StorefrontInner shop={shop}>
        <Outlet />
      </StorefrontInner>
    </TemplateProvider>
  );
}

/** @deprecated kept for backwards compatibility; the layout provides everything. */
export const StorefrontShopProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
