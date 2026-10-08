import { Link } from 'react-router-dom';
import type { PublicCatalogue } from '@/types/storefront';

interface Props {
  shopSlug: string;
  catalogues: PublicCatalogue[];
}

/** Horizontally scrollable row of published catalogues; styled only with template tokens. */
export function CatalogueRow({ shopSlug, catalogues }: Props) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
      {catalogues.map((c) => (
        <li key={c.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
          <Link
            to={`/shop/${shopSlug}/catalogue/${c.slug}`}
            className="group block overflow-hidden border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] [border-radius:var(--sf-radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)]"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--sf-muted)]">
              {c.coverUrl && (
                <img
                  src={c.coverUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
              )}
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg leading-tight">{c.name}</h3>
              <p className="mt-1 text-sm text-[color:var(--sf-muted-fg)]">
                {c.productCount} {c.productCount === 1 ? 'piece' : 'pieces'}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
