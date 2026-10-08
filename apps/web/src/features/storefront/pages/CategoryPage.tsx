import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useStorefront } from '../hooks/useStorefront';
import { CategoryRail } from '../components/CategoryRail';
import { ProductListing } from '../components/ProductListing';
import { SfContainer } from '../components/ui-sf';
import { humanize } from '../components/lib';

export default function CategoryPage() {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const { shop, shopSlug, categories, template } = useStorefront();
  const { SectionHeading } = template;
  const category = categories.find((c) => c.slug === categorySlug);
  const title = category?.name ?? humanize(categorySlug.replace(/-/g, ' '));

  return (
    <SfContainer className="py-8 md:py-12">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={`Shop ${title} at ${shop.name}.`} />
      </Helmet>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[color:var(--sf-muted-fg)]">
        <Link to={`/shop/${shopSlug}`} className="hover:underline">Home</Link> / <Link to={`/shop/${shopSlug}/products`} className="hover:underline">Products</Link> /{' '}
        <span aria-current="page" className="text-[color:var(--sf-fg)]">{title}</span>
      </nav>
      <SectionHeading eyebrow="Category" title={title} subtitle={category?.productCount !== undefined ? `${category.productCount} products` : undefined} />
      <CategoryRail shopSlug={shopSlug} categories={categories.filter((c) => !c.parentId)} activeSlug={categorySlug} className="mt-5" />
      <div className="mt-6">
        <ProductListing key={categorySlug} preset={{ category: categorySlug }} hideCategory emptyTitle="Nothing here yet" />
      </div>
    </SfContainer>
  );
}
