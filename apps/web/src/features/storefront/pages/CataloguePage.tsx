import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '@/api/endpoints/storefront';
import { formatDate } from '@/utils/format';
import { useStorefront } from '../hooks/useStorefront';
import { useCatalogueQuery } from '../hooks/useStorefrontApi';
import { ProductListing } from '../components/ProductListing';
import { SfContainer, SfError, SfSkeleton } from '../components/ui-sf';
import { ApiError } from '@/api/client';
import { fetchPriority } from '@/utils/dom';

export default function CataloguePage() {
  const { catalogueSlug = '' } = useParams<{ catalogueSlug: string }>();
  const { shop, shopSlug } = useStorefront();
  const q = useCatalogueQuery(shopSlug, catalogueSlug);
  const catalogue = q.data;

  useEffect(() => {
    if (catalogue) trackEvent(shopSlug, { type: 'CATALOGUE_VIEW', catalogueId: catalogue.id });
  }, [catalogue, shopSlug]);

  if (q.isPending) {
    return (
      <SfContainer className="space-y-4 py-8">
        <SfSkeleton className="h-48 w-full md:h-64" />
        <SfSkeleton className="h-8 w-1/2" />
      </SfContainer>
    );
  }
  if (q.isError || !catalogue) {
    const missing = q.error instanceof ApiError && q.error.status === 404;
    return (
      <SfContainer className="py-12">
        <SfError error={q.error} title={missing ? 'Catalogue not found' : undefined} message={missing ? 'This catalogue is no longer available.' : undefined} onRetry={missing ? undefined : () => void q.refetch()} />
        <p className="mt-6 text-center">
          <Link to={`/shop/${shopSlug}/products`} className="underline underline-offset-4 text-[color:var(--sf-primary)]">Browse all products</Link>
        </p>
      </SfContainer>
    );
  }

  return (
    <div>
      <Helmet>
        <title>{catalogue.name}</title>
        <meta name="description" content={catalogue.description ?? `${catalogue.name} catalogue from ${shop.name}.`} />
        {catalogue.coverUrl && <meta property="og:image" content={catalogue.coverUrl} />}
      </Helmet>
      <header className="relative isolate overflow-hidden bg-[color:var(--sf-muted)]">
        {catalogue.coverUrl && (
          <img src={catalogue.coverUrl} alt="" {...fetchPriority('high')} decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        )}
        <div className={catalogue.coverUrl ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' : ''}>
          <SfContainer className={`flex min-h-[220px] flex-col justify-end py-8 md:min-h-[320px] ${catalogue.coverUrl ? 'text-white' : ''}`}>
            <p className="text-xs uppercase tracking-[0.25em] opacity-80">Catalogue</p>
            <h1 className="mt-2 font-display text-3xl font-semibold md:text-5xl">{catalogue.name}</h1>
            {catalogue.description && <p className="mt-2 max-w-2xl text-sm opacity-90 md:text-base">{catalogue.description}</p>}
            <p className="mt-3 text-sm opacity-80">
              {catalogue.productCount} products
              {catalogue.endDate ? ` · Available until ${formatDate(catalogue.endDate)}` : ''}
            </p>
          </SfContainer>
        </div>
      </header>
      <SfContainer className="py-8 md:py-12">
        <ProductListing key={catalogueSlug} preset={{ catalogue: catalogueSlug }} hideSearch emptyTitle="No products in this catalogue yet" />
      </SfContainer>
    </div>
  );
}
