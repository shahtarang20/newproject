import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { SAREE_TYPES, SAREE_WORK_TYPES, STANDARD_SIZES } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SAREE_TYPE_LABELS, SAREE_WORK_LABELS, toOptions } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { useWizard } from './context';
import { ChipToggleGroup, EnumSelect, Field, StepCard } from './fields';
import { COLOUR_PRESETS, GARMENT_FITS, NECKS, PATTERNS, SLEEVES, variantKey, type ColourOption, type VariantRow, type WizardValues } from './schema';
import { VariantRowsTable } from './VariantRowsTable';
import type { UseFormReturn } from 'react-hook-form';

/** Merge the colour × size matrix into the variant rows (keeps existing rows, adds missing, drops rows outside the matrix). */
export function applyMatrix(form: UseFormReturn<WizardValues>): { added: number; removed: number } {
  const v = form.getValues();
  if (!v.colours.length && !v.sizes.length) return { added: 0, removed: 0 };
  const colours: (ColourOption | null)[] = v.colours.length ? v.colours : [null];
  const sizes: string[] = v.sizes.length ? v.sizes : [''];
  const existing = new Map(v.variants.map((r) => [variantKey(r), r]));
  const next: VariantRow[] = [];
  let added = 0;
  for (const c of colours) {
    for (const s of sizes) {
      const row = { colourName: c?.name ?? '', size: s };
      const hit = existing.get(variantKey(row));
      if (hit) { next.push({ ...hit, colourHex: c?.hex ?? hit.colourHex }); continue; }
      added++;
      next.push({
        id: '', colourName: row.colourName, colourHex: c?.hex ?? '#9CA3AF', size: s, sku: '', price: v.basePrice, mrp: v.baseMrp,
        cost: '', stock: '0', lowStock: '', barcode: '', isActive: true, imageMediaId: '',
      });
    }
  }
  const keys = new Set(next.map(variantKey));
  const removed = v.variants.filter((r) => !keys.has(variantKey(r))).length;
  const same = removed === 0 && added === 0;
  if (!same) form.setValue('variants', next, { shouldDirty: true });
  return { added, removed };
}

function ColourPicker() {
  const { form, canWrite } = useWizard();
  const colours = form.watch('colours');
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#C0392B');
  const set = (c: ColourOption[]) => form.setValue('colours', c, { shouldDirty: true });
  const add = (c: ColourOption) => {
    const n = c.name.trim();
    if (!n) return;
    if (colours.some((x) => x.name.toLowerCase() === n.toLowerCase())) return toast.info(`${n} is already added`);
    set([...colours, { name: n, hex: c.hex }]);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {COLOUR_PRESETS.map((c) => {
          const on = colours.some((x) => x.name.toLowerCase() === c.name.toLowerCase());
          return (
            <button key={c.name} type="button" disabled={!canWrite} title={c.name} aria-label={`${on ? 'Remove' : 'Add'} ${c.name}`} aria-pressed={on}
              onClick={() => (on ? set(colours.filter((x) => x.name.toLowerCase() !== c.name.toLowerCase())) : add(c))}
              className={cn('h-8 w-8 rounded-full border-2 transition-transform hover:scale-110', on ? 'border-primary ring-2 ring-primary/30' : 'border-border')}
              style={{ background: c.hex }} />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border bg-background p-1" aria-label="Pick colour" disabled={!canWrite} />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom colour name" className="h-9 w-48" maxLength={60}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add({ name, hex }); setName(''); } }} />
        <Button type="button" size="sm" variant="outline" disabled={!name.trim() || !canWrite} onClick={() => { add({ name, hex }); setName(''); }}><Plus className="h-4 w-4" /> Add colour</Button>
      </div>
      {colours.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {colours.map((c) => (
            <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full border bg-secondary py-1 pl-1.5 pr-2 text-xs">
              <span className="h-3.5 w-3.5 rounded-full border" style={{ background: c.hex }} /> {c.name}
              <button type="button" aria-label={`Remove ${c.name}`} onClick={() => set(colours.filter((x) => x.name !== c.name))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SizePicker() {
  const { form, canWrite } = useWizard();
  const type = form.watch('type');
  const sizes = form.watch('sizes');
  const [custom, setCustom] = useState('');
  const toggle = (s: string) => form.setValue('sizes', sizes.some((x) => x.toLowerCase() === s.toLowerCase()) ? sizes.filter((x) => x.toLowerCase() !== s.toLowerCase()) : [...sizes, s], { shouldDirty: true });
  const std: string[] = type === 'SAREE' ? ['FREE'] : STANDARD_SIZES.filter((s) => s !== 'FREE');
  const customSizes = sizes.filter((s) => !(STANDARD_SIZES as readonly string[]).includes(s));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[...std, ...(type === 'SAREE' ? [] : ['FREE']), ...customSizes].map((s) => {
          const on = sizes.some((x) => x.toLowerCase() === s.toLowerCase());
          return (
            <button key={s} type="button" aria-pressed={on} disabled={!canWrite} onClick={() => toggle(s)}
              className={cn('min-w-12 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors', on ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary')}>
              {s}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder='Custom size, e.g. 38 or "5.5 m"' className="h-9 w-64" maxLength={40}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (custom.trim() && !sizes.includes(custom.trim())) toggle(custom.trim()); setCustom(''); } }} />
        <Button type="button" size="sm" variant="outline" disabled={!custom.trim() || !canWrite} onClick={() => { toggle(custom.trim()); setCustom(''); }}>Add size</Button>
      </div>
    </div>
  );
}

function AttrsSection() {
  const { form } = useWizard();
  const { register, control, watch } = form;
  const type = watch('type');
  if (type === 'SAREE') {
    return (
      <StepCard title="Saree details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Saree type"><Controller control={control} name="saree.sareeType" render={({ field }) => <EnumSelect value={field.value} onChange={field.onChange} options={toOptions(SAREE_TYPE_LABELS).filter((o) => SAREE_TYPES.includes(o.value))} />} /></Field>
          <Field label="Length (metres)"><Input {...register('saree.lengthMeters')} inputMode="decimal" placeholder="5.5" /></Field>
          <Field label="Blouse piece included">
            <Controller control={control} name="saree.blouseIncluded" render={({ field }) => (
              <div className="flex h-10 items-center"><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Blouse included" /></div>
            )} />
          </Field>
          {watch('saree.blouseIncluded') && (
            <Field label="Blouse length / details" className="sm:col-span-3"><Input {...register('saree.blouseDescription')} placeholder="e.g. 0.8 m, contrast silk" maxLength={500} /></Field>
          )}
        </div>
        <Field label="Work type">
          <Controller control={control} name="saree.workTypes" render={({ field }) => <ChipToggleGroup value={field.value} onChange={field.onChange} options={toOptions(SAREE_WORK_LABELS).filter((o) => SAREE_WORK_TYPES.includes(o.value))} />} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Border"><Input {...register('saree.border')} maxLength={200} /></Field>
          <Field label="Pallu / pattern"><Input {...register('saree.pallu')} maxLength={200} /></Field>
          <Field label="Weave"><Input {...register('saree.weave')} maxLength={200} /></Field>
        </div>
        <Field label="Wash care"><Textarea {...register('saree.careInstructions')} rows={2} maxLength={1000} placeholder="Dry clean only" /></Field>
      </StepCard>
    );
  }
  const g = (k: 'fit' | 'sleeveType' | 'neckType' | 'pattern', opts: string[], label: string) => (
    <Field label={label}>
      <Input {...register(`garment.${k}` as const)} list={`dl-${k}`} maxLength={100} />
      <datalist id={`dl-${k}`}>{opts.map((o) => <option key={o} value={o} />)}</datalist>
    </Field>
  );
  return (
    <StepCard title="Garment details">
      <div className="grid gap-4 sm:grid-cols-2">
        {g('fit', GARMENT_FITS, 'Fit')}
        {g('sleeveType', SLEEVES, 'Sleeve')}
        {g('neckType', NECKS, 'Neck')}
        {g('pattern', PATTERNS, 'Pattern')}
        <Field label="Fabric composition"><Input {...register('garment.fabricComposition')} placeholder="e.g. 100% cotton" maxLength={200} /></Field>
        <Field label="Wash care"><Input {...register('garment.washCare')} placeholder="Machine wash cold" maxLength={500} /></Field>
      </div>
    </StepCard>
  );
}

export function VariantsStep() {
  const { form, canWrite } = useWizard();
  const colours = form.watch('colours');
  const sizes = form.watch('sizes');
  const variants = form.watch('variants');
  const combos = Math.max(1, colours.length) * Math.max(1, sizes.length);
  const hasMatrix = colours.length > 0 || sizes.length > 0;

  const generate = () => {
    const { added, removed } = applyMatrix(form);
    toast.success(`${added} variant${added === 1 ? '' : 's'} added${removed ? `, ${removed} removed` : ''}`);
  };

  return (
    <div className="space-y-4">
      <StepCard title="Colours" description="Pick from presets or add your own. Skip if the product comes in one colour.">
        <ColourPicker />
      </StepCard>
      <StepCard title="Sizes" description={form.watch('type') === 'SAREE' ? 'Sarees usually use a single FREE size.' : 'Choose every size you stock.'}>
        <SizePicker />
      </StepCard>

      <StepCard title="Variants" description="One row per colour × size. Review and edit each one.">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Default price (₹)" className="w-36"><Input {...form.register('basePrice')} inputMode="decimal" className="h-9" /></Field>
          <Field label="Default MRP (₹)" className="w-36"><Input {...form.register('baseMrp')} inputMode="decimal" className="h-9" /></Field>
          <Button type="button" onClick={generate} disabled={!hasMatrix || !canWrite}>
            Generate {hasMatrix ? `${combos} variant${combos === 1 ? '' : 's'}` : 'variants'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">New rows start with the default price and MRP. Existing rows keep their own values.</p>
        {variants.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No variants yet. Choose colours and sizes above, then generate.</p>
        ) : (
          <VariantRowsTable columns={['variant', 'sku', 'price', 'mrp', 'stock', 'lowStock', 'barcode', 'image', 'active']} removable />
        )}
      </StepCard>

      <AttrsSection />
    </div>
  );
}
