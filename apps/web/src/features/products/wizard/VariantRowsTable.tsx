import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FormError } from '@/components/ui/form';
import { cn } from '@/utils/cn';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useWizard } from './context';
import type { VariantRow } from './schema';

export type VariantColumn = 'variant' | 'sku' | 'price' | 'mrp' | 'cost' | 'stock' | 'lowStock' | 'barcode' | 'image' | 'active';

const COLS: Record<VariantColumn, { label: string; width: string }> = {
  variant: { label: 'Variant', width: 'minmax(130px,1.3fr)' },
  sku: { label: 'SKU', width: 'minmax(110px,1fr)' },
  price: { label: 'Price (₹)', width: 'minmax(90px,.8fr)' },
  mrp: { label: 'MRP (₹)', width: 'minmax(90px,.8fr)' },
  cost: { label: 'Cost (₹)', width: 'minmax(90px,.8fr)' },
  stock: { label: 'Stock', width: 'minmax(80px,.6fr)' },
  lowStock: { label: 'Low-stock alert', width: 'minmax(90px,.7fr)' },
  barcode: { label: 'Barcode', width: 'minmax(110px,1fr)' },
  image: { label: 'Image', width: 'minmax(120px,1fr)' },
  active: { label: 'Active', width: '64px' },
};

export function VariantRowsTable({ columns, removable }: { columns: VariantColumn[]; removable?: boolean }) {
  const { form, errors, media, canWrite, canStock } = useWizard();
  const confirm = useConfirm();
  const { fields, remove } = useFieldArray({ control: form.control, name: 'variants', keyName: '_k' });
  const rows = form.watch('variants');
  const images = media.filter((m) => m.kind === 'IMAGE');
  const cols = removable ? [...columns, 'x' as const] : columns;
  const template = cols.map((c) => (c === 'x' ? '40px' : COLS[c].width)).join(' ');

  const err = (i: number, k: string) => errors[`variants.${i}.${k}`];

  const cell = (c: VariantColumn, i: number, r: VariantRow) => {
    const reg = (k: keyof VariantRow) => form.register(`variants.${i}.${k}` as const);
    const num = (k: 'price' | 'mrp' | 'cost' | 'stock' | 'lowStock', disabled?: boolean) => (
      <Input {...reg(k)} inputMode="decimal" className="h-9" disabled={disabled} aria-invalid={!!err(i, k)} aria-label={`${COLS[c].label} for variant ${i + 1}`} />
    );
    switch (c) {
      case 'variant':
        return (
          <div className="flex min-w-0 items-center gap-2">
            {r.colourName && <span className="h-5 w-5 shrink-0 rounded-full border" style={{ background: r.colourHex }} aria-hidden />}
            <span className="truncate text-sm font-medium">{[r.colourName, r.size].filter(Boolean).join(' / ') || 'Default'}</span>
          </div>
        );
      case 'sku': return <Input {...reg('sku')} placeholder="Auto" className="h-9" aria-label={`SKU for variant ${i + 1}`} />;
      case 'price': return num('price');
      case 'mrp': return num('mrp');
      case 'cost': return num('cost');
      case 'stock': return num('stock', !canStock);
      case 'lowStock': return num('lowStock');
      case 'barcode': return <Input {...reg('barcode')} className="h-9" aria-label={`Barcode for variant ${i + 1}`} />;
      case 'image': {
        const sel = images.find((m) => m.id === r.imageMediaId);
        return (
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">{sel && <img src={sel.tinyUrl ?? sel.thumbUrl ?? sel.url} alt="" className="h-full w-full object-cover" />}</span>
            <select
              value={r.imageMediaId}
              onChange={(e) => form.setValue(`variants.${i}.imageMediaId`, e.target.value, { shouldDirty: true })}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
              aria-label={`Image for variant ${i + 1}`}
              disabled={!images.length || !canWrite}
            >
              <option value="">{images.length ? 'None' : 'No images'}</option>
              {images.map((m, n) => <option key={m.id} value={m.id}>Image {n + 1}{m.isPrimary ? ' (primary)' : ''}</option>)}
            </select>
          </div>
        );
      }
      case 'active':
        return <Switch checked={r.isActive} onCheckedChange={(v) => form.setValue(`variants.${i}.isActive`, v, { shouldDirty: true })} aria-label={`Variant ${i + 1} active`} />;
    }
  };

  if (!fields.length) return null;
  return (
    <div className="space-y-2">
      <div className="hidden gap-2 px-2 text-xs font-medium text-muted-foreground md:grid md:[grid-template-columns:var(--cols)]" style={{ ['--cols' as string]: template }}>
        {cols.map((c) => <span key={c}>{c === 'x' ? '' : COLS[c].label}</span>)}
      </div>
      {fields.map((f, i) => {
        const r = rows[i] ?? (f as unknown as VariantRow);
        const rowErr = columns.map((c) => (c === 'variant' ? err(i, 'size') : err(i, c))).find(Boolean);
        return (
          <div key={f._k} className={cn('rounded-xl border bg-background p-3 md:p-2', !r.isActive && 'opacity-60')}>
            <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-none md:items-center md:gap-2 md:[grid-template-columns:var(--cols)]" style={{ ['--cols' as string]: template }}>
              {columns.map((c) => (
                <div key={c} className={cn('min-w-0', (c === 'variant' || c === 'image') && 'col-span-2 md:col-span-1')}>
                  {c !== 'variant' && <span className="mb-1 block text-xs text-muted-foreground md:hidden">{COLS[c].label}</span>}
                  {cell(c, i, r)}
                </div>
              ))}
              {removable && (
                <div className="col-span-2 flex justify-end md:col-span-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove variant" disabled={!canWrite}
                    onClick={async () => {
                      if (r.id && !(await confirm({ title: 'Remove this variant?', description: 'It will be deleted (or deactivated if it has sales).', confirmText: 'Remove', destructive: true }))) return;
                      remove(i);
                    }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {rowErr && <FormError message={rowErr} className="mt-1.5" />}
          </div>
        );
      })}
    </div>
  );
}

/** "Set <field> for all variants" helper. */
export function BulkFill({ field, label, placeholder }: { field: 'price' | 'mrp' | 'stock' | 'lowStock' | 'cost'; label: string; placeholder?: string }) {
  const { form, canWrite } = useWizard();
  const [val, setVal] = useState('');
  const apply = () => {
    const n = form.getValues('variants').length;
    for (let i = 0; i < n; i++) form.setValue(`variants.${i}.${field}`, val, { shouldDirty: true });
    setVal('');
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" placeholder={placeholder ?? label} className="h-9 w-32" aria-label={label} />
      <Button type="button" size="sm" variant="outline" disabled={!val.trim() || !canWrite} onClick={apply}>{label}</Button>
    </div>
  );
}
