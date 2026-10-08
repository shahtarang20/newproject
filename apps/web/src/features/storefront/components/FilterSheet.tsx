import { useEffect, useState, type ReactNode } from 'react';
import type { StorefrontFacets } from '@/types/storefront';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { FilterState } from '../hooks/useProductFilters';
import { SfButton, SfChip, SfDialog, sfFocusRing } from './ui-sf';
import { humanize } from './lib';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  facets?: StorefrontFacets;
  filters: FilterState;
  hideCategory?: boolean;
  currency: string;
  onApply: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-[color:var(--sf-border)] pb-4 last:border-0">
      <legend className="mb-2.5 font-display text-base font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterSheet({ open, onOpenChange, facets, filters, hideCategory, currency, onApply, onClear }: Props) {
  const [draft, setDraft] = useState(filters);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<FilterState>) => setDraft((d) => ({ ...d, ...p }));
  const minBound = facets ? Math.floor(facets.price.minMinor / 100) : 0;
  const maxBound = facets ? Math.ceil(facets.price.maxMinor / 100) : 0;
  const showPrice = !!facets && maxBound > minBound;
  const lo = Math.max(minBound, draft.minPrice ?? minBound);
  const hi = Math.min(maxBound, draft.maxPrice ?? maxBound);
  const step = Math.max(1, Math.round((maxBound - minBound) / 100));

  const chips = (key: 'size' | 'fabric' | 'brand' | 'occasion', items?: { name: string; count: number }[]) =>
    items?.length ? (
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <SfChip key={i.name} active={draft[key].includes(i.name)} onClick={() => patch({ [key]: toggle(draft[key], i.name) })}>
            {humanize(i.name)} <span className="text-xs opacity-70">({i.count})</span>
          </SfChip>
        ))}
      </div>
    ) : null;

  return (
    <SfDialog
      open={open}
      onOpenChange={onOpenChange}
      variant={isDesktop ? 'right' : 'bottom'}
      title="Filters"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <SfButton
            variant="outline"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
          >
            Clear all
          </SfButton>
          <SfButton
            onClick={() => {
              onApply({
                category: draft.category,
                colour: draft.colour,
                size: draft.size,
                fabric: draft.fabric,
                brand: draft.brand,
                occasion: draft.occasion,
                minPrice: draft.minPrice !== undefined && draft.minPrice > minBound ? draft.minPrice : undefined,
                maxPrice: draft.maxPrice !== undefined && draft.maxPrice < maxBound ? draft.maxPrice : undefined,
                inStock: draft.inStock,
                onOffer: draft.onOffer,
              });
              onOpenChange(false);
            }}
          >
            Show results
          </SfButton>
        </div>
      }
    >
      <div className="space-y-5">
        {!hideCategory && facets && facets.categories.length > 0 && (
          <Section title="Category">
            <div className="flex flex-wrap gap-2">
              {facets.categories.map((c) => (
                <SfChip key={c.id} active={draft.category === c.slug} onClick={() => patch({ category: draft.category === c.slug ? undefined : c.slug })}>
                  {c.name}
                </SfChip>
              ))}
            </div>
          </Section>
        )}

        {showPrice && (
          <Section title="Price">
            <p className="mb-2 text-sm text-[color:var(--sf-muted-fg)]" aria-live="polite">
              {formatMoney(lo * 100, currency)} – {formatMoney(hi * 100, currency)}
            </p>
            <div className="space-y-3">
              <label className="block text-xs text-[color:var(--sf-muted-fg)]">
                Minimum
                <input type="range" min={minBound} max={maxBound} step={step} value={lo} onChange={(e) => patch({ minPrice: Math.min(Number(e.target.value), hi) })} className={cn('mt-1 w-full accent-[color:var(--sf-primary)]', sfFocusRing)} />
              </label>
              <label className="block text-xs text-[color:var(--sf-muted-fg)]">
                Maximum
                <input type="range" min={minBound} max={maxBound} step={step} value={hi} onChange={(e) => patch({ maxPrice: Math.max(Number(e.target.value), lo) })} className={cn('mt-1 w-full accent-[color:var(--sf-primary)]', sfFocusRing)} />
              </label>
            </div>
          </Section>
        )}

        {facets && facets.colours.length > 0 && (
          <Section title="Colour">
            <div className="flex flex-wrap gap-2">
              {facets.colours.map((c) => (
                <SfChip key={c.name} active={draft.colour.includes(c.name)} onClick={() => patch({ colour: toggle(draft.colour, c.name) })}>
                  <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: c.hex ?? 'var(--sf-muted)' }} />
                  {c.name}
                </SfChip>
              ))}
            </div>
          </Section>
        )}
        {facets && facets.sizes.length > 0 && <Section title="Size">{chips('size', facets.sizes)}</Section>}
        {facets && facets.fabrics.length > 0 && <Section title="Fabric">{chips('fabric', facets.fabrics)}</Section>}
        {facets && facets.brands.length > 0 && <Section title="Brand">{chips('brand', facets.brands)}</Section>}
        {facets && facets.occasions.length > 0 && <Section title="Occasion">{chips('occasion', facets.occasions)}</Section>}

        <Section title="Availability & offers">
          <div className="flex flex-wrap gap-2">
            <SfChip active={draft.inStock} onClick={() => patch({ inStock: !draft.inStock })}>
              In stock only
            </SfChip>
            <SfChip active={draft.onOffer} onClick={() => patch({ onOffer: !draft.onOffer })}>
              On offer / discounted
            </SfChip>
          </div>
        </Section>
      </div>
    </SfDialog>
  );
}
