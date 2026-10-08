import { useId } from 'react';
import { Check } from 'lucide-react';
import type { PublicProduct, PublicVariant } from '@/types/storefront';
import { cn } from '@/utils/cn';
import { sfFocusRing } from './ui-sf';
import type { Selection } from './lib';

interface Props {
  product: PublicProduct;
  selection: Selection;
  onChange: (next: Selection, variant?: PublicVariant) => void;
  variant?: PublicVariant;
}

const eq = (a?: string, b?: string) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

export function VariantPicker({ product, selection, onChange, variant }: Props) {
  const uid = useId();
  const { variants, colours, sizes } = product;

  const colourAvailable = (name: string) =>
    variants.some((v) => eq(v.colour, name) && v.inStock && (!selection.size || !sizes.length || eq(v.size, selection.size)));
  const colourAnyStock = (name: string) => variants.some((v) => eq(v.colour, name) && v.inStock);
  const sizeAvailable = (name: string) =>
    variants.some((v) => eq(v.size, name) && v.inStock && (!selection.colour || !colours.length || eq(v.colour, selection.colour)));

  const pickColour = (name: string) => {
    let size = selection.size;
    if (sizes.length && !variants.some((v) => eq(v.colour, name) && eq(v.size, size) && v.inStock)) {
      size = variants.find((v) => eq(v.colour, name) && v.inStock)?.size ?? size;
    }
    const next = { colour: name, size };
    onChange(next, variants.find((v) => eq(v.colour, name) && (!sizes.length || eq(v.size, size))));
  };
  const pickSize = (name: string) => {
    const next = { ...selection, size: name };
    onChange(next, variants.find((v) => (!colours.length || eq(v.colour, selection.colour)) && eq(v.size, name)));
  };

  if (!colours.length && !sizes.length) return null;

  return (
    <div className="space-y-5">
      {colours.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm">
            <span className="font-medium">Colour:</span> <span className="text-[color:var(--sf-muted-fg)]">{selection.colour ?? 'Select'}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
            {colours.map((c) => {
              const selected = eq(c.name, selection.colour);
              const unavailable = !colourAnyStock(c.name);
              const softUnavailable = !unavailable && !colourAvailable(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${c.name}${unavailable ? ' (sold out)' : ''}`}
                  title={c.name}
                  disabled={unavailable}
                  onClick={() => pickColour(c.name)}
                  className={cn(
                    'relative flex h-10 min-w-10 items-center justify-center gap-2 overflow-hidden rounded-full border-2 p-0.5 transition',
                    sfFocusRing,
                    selected ? 'border-[color:var(--sf-primary)]' : 'border-[color:var(--sf-border)] hover:border-[color:var(--sf-fg)]/50',
                    (unavailable || softUnavailable) && 'opacity-45',
                  )}
                >
                  <span
                    className="relative flex h-full w-full min-w-8 items-center justify-center rounded-full border border-black/10"
                    style={{ background: c.hex ?? 'var(--sf-muted)', aspectRatio: '1' }}
                  >
                    {selected && <Check className="h-4 w-4 mix-blend-difference text-white" aria-hidden="true" />}
                    {unavailable && <span aria-hidden="true" className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-[color:var(--sf-fg)]" />}
                  </span>
                  {!c.hex && <span className="pr-2 text-xs">{c.name}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm">
            <span className="font-medium">Size:</span> <span className="text-[color:var(--sf-muted-fg)]">{selection.size ?? 'Select'}</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size" id={uid}>
            {sizes.map((s) => {
              const selected = eq(s, selection.size);
              const unavailable = !sizeAvailable(s);
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${s}${unavailable ? ' (sold out)' : ''}`}
                  disabled={unavailable}
                  onClick={() => pickSize(s)}
                  className={cn(
                    'min-h-10 min-w-12 rounded-[var(--sf-radius,6px)] border px-3 text-sm transition',
                    sfFocusRing,
                    selected
                      ? 'border-[color:var(--sf-primary)] bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)]'
                      : 'border-[color:var(--sf-border)] bg-[color:var(--sf-card)] hover:border-[color:var(--sf-fg)]',
                    unavailable && 'text-[color:var(--sf-muted-fg)] line-through opacity-50',
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {variant && (
        <p className="text-sm" aria-live="polite">
          {!variant.inStock ? (
            <span className="font-medium text-red-600">Out of stock</span>
          ) : variant.stockLeft !== undefined ? (
            <span className="font-medium text-[color:var(--sf-primary)]">Only {variant.stockLeft} left</span>
          ) : (
            <span className="text-[color:var(--sf-muted-fg)]">In stock</span>
          )}
        </p>
      )}
    </div>
  );
}
