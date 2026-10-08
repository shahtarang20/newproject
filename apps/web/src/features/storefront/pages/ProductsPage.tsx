import { Helmet } from 'react-helmet-async';
import { useStorefront } from '../hooks/useStorefront';
import { CategoryRail } from '../components/CategoryRail';
import { ProductListing } from '../components/ProductListing';
import { SfContainer } from '../components/ui-sf';

export default function ProductsPage() {
  const { shop, shopSlug, categories, template } = useStorefront();
  const { SectionHeading } = template;
  return (
    <SfContainer className="py-8 md:py-12">
      <Helmet>
        <title>All products</title>
        <meta name="description" content={`Browse the full collection at ${shop.name}.`} />
      </Helmet>
      <SectionHeading eyebrow={shop.name} title="All products" subtitle="Browse the full collection" />
      <CategoryRail shopSlug={shopSlug} categories={categories.filter((c) => !c.parentId)} className="mt-5" />
      <div className="mt-6">
        <ProductListing />
      </div>
    </SfContainer>
  );
}
