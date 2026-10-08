import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useStorefront } from '../hooks/useStorefront';
import { useCataloguesQuery, useOffersQuery, useProductsQuery } from '../hooks/useStorefrontApi';
import { useQuickAdd } from '../hooks/useQuickAdd';
import { CatalogueRow } from '../components/CatalogueRow';
import { OfferStrip } from '../components/OfferStrip';
import { ProductGrid } from '../components/ProductGrid';
import { ShopInfoBlock } from '../components/ShopInfoBlock';
import { SfContainer, SfError, SfSkeleton } from '../components/ui-sf';

export default function HomePage() {
  const { shop, shopSlug, categories, template } = useStorefront();
  const { Hero, SectionHeading, CategoryTile } = template;
  const featuredQ = useProductsQuery(shopSlug, { sort: 'popular', limit: 8 });
  const newQ = useProductsQuery(shopSlug, { sort: 'newest', limit: 8 });
  const offersQ = useOffersQuery(shopSlug);
  const cataloguesQ = useCataloguesQuery(shopSlug);
  const { onQuickAdd, dialog } = useQuickAdd();

  const featured = featuredQ.data?.data ?? [];
  const arrivals = newQ.data?.data ?? [];
  const topCategories = categories.filter((c) => !c.parentId).slice(0, 8);
  const base = `/shop/${shopSlug}`;
  const viewAll = (
    <div className="mt-8 text-center">
      <Link to={`${base}/products`} className="text-sm font-medium underline underline-offset-4 text-[color:var(--sf-primary)]">
        View all products
      </Link>
    </div>
  );

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: shop.name,
            description: shop.description,
            image: shop.logoUrl ?? shop.coverUrl,
            telephone: shop.phone,
            address: { '@type': 'PostalAddress', streetAddress: shop.address.line1, addressLocality: shop.address.city, addressRegion: shop.address.state, postalCode: shop.address.pincode },
          })}
        </script>
      </Helmet>

      <Hero shop={shop} featured={featured.slice(0, 5)} />
      {offersQ.data && offersQ.data.length > 0 && <OfferStrip offers={offersQ.data} currency={shop.currency} />}

      {topCategories.length > 0 && (
        <SfContainer className="py-10 md:py-14">
          <SectionHeading eyebrow="Browse" title="Shop by category" align="center" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {topCategories.map((c) => (
              <CategoryTile key={c.id} category={c} shop={shop} />
            ))}
          </div>
        </SfContainer>
      )}

      {cataloguesQ.data && cataloguesQ.data.length > 0 && (
        <SfContainer className="py-8 md:py-12">
          <SectionHeading eyebrow="Collections" title="Our catalogues" align="center" />
          <div className="mt-6">
            <CatalogueRow shopSlug={shopSlug} catalogues={cataloguesQ.data} />
          </div>
        </SfContainer>
      )}

      <SfContainer className="py-8 md:py-12">
        <SectionHeading eyebrow="Handpicked" title="Featured collection" align="center" />
        <div className="mt-6">
          {featuredQ.isError ? (
            <SfError error={featuredQ.error} onRetry={() => void featuredQ.refetch()} />
          ) : (
            <ProductGrid products={featured} shop={shop} isLoading={featuredQ.isPending} onQuickAdd={onQuickAdd} priorityCount={4} emptyTitle="Products coming soon" emptyDescription="This shop is still adding its collection. Please check back shortly." />
          )}
        </div>
        {featured.length > 0 && viewAll}
      </SfContainer>

      {(newQ.isPending || arrivals.length > 0) && (
        <SfContainer className="py-8 md:py-12">
          <SectionHeading eyebrow="Just in" title="New arrivals" align="center" />
          <div className="mt-6">
            {newQ.isPending ? <SfSkeleton className="h-64 w-full" /> : <ProductGrid products={arrivals} shop={shop} onQuickAdd={onQuickAdd} priorityCount={0} />}
          </div>
          {viewAll}
        </SfContainer>
      )}

      <SfContainer className="py-8 md:py-14">
        <ShopInfoBlock shop={shop} />
      </SfContainer>
      {dialog}
    </>
  );
}
