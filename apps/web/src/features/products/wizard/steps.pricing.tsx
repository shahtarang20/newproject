import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWizard } from './context';
import { Field, StepCard } from './fields';
import { discountPercent } from './schema';
import { BulkFill, VariantRowsTable } from './VariantRowsTable';

const GST_PRESETS = ['0', '5', '12', '18'];

export function PricingStep() {
  const { form, canWrite } = useWizard();
  const { register, watch, control } = form;
  const price = Number(watch('basePrice'));
  const mrp = Number(watch('baseMrp'));
  const disc = Number.isFinite(price) && Number.isFinite(mrp) ? discountPercent(price, mrp) : 0;
  const variants = watch('variants');
  const gst = watch('taxPercent');

  const applyAll = () => {
    const base = form.getValues();
    base.variants.forEach((_, i) => {
      form.setValue(`variants.${i}.price`, base.basePrice, { shouldDirty: true });
      form.setValue(`variants.${i}.mrp`, base.baseMrp, { shouldDirty: true });
    });
    toast.success(`Applied to ${base.variants.length} variant${base.variants.length === 1 ? '' : 's'}`);
  };

  return (
    <div className="space-y-4">
      <StepCard title="Pricing" description="Prices are in rupees. Customers see the selling price; MRP is shown struck through.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Selling price (₹)" path="basePrice"><Input {...register('basePrice')} inputMode="decimal" placeholder="1499" /></Field>
          <Field label="MRP (₹)" path="baseMrp"><Input {...register('baseMrp')} inputMode="decimal" placeholder="1999" /></Field>
          <Field label="Discount">
            <div className="flex h-10 items-center">{disc > 0 ? <Badge variant="success">{disc}% off</Badge> : <span className="text-sm text-muted-foreground">No discount</span>}</div>
          </Field>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={applyAll} disabled={!variants.length || !canWrite}>
          Apply price & MRP to all {variants.length} variant{variants.length === 1 ? '' : 's'}
        </Button>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GST %" path="taxPercent">
            <div className="flex flex-wrap items-center gap-2">
              <Input {...register('taxPercent')} inputMode="decimal" className="w-24" placeholder="5" />
              {GST_PRESETS.map((g) => (
                <button key={g} type="button" onClick={() => form.setValue('taxPercent', g, { shouldDirty: true })}
                  className={`rounded-full border px-2.5 py-1 text-xs ${gst === g ? 'border-primary bg-accent' : 'hover:bg-secondary'}`}>{g}%</button>
              ))}
            </div>
          </Field>
          <Field label="Contact shop for price" hint="Hides the price on your storefront; customers send an enquiry instead.">
            <Controller control={control} name="hidePrice" render={({ field }) => (
              <div className="flex h-10 items-center"><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Hide price" /></div>
            )} />
          </Field>
        </div>
      </StepCard>

      <StepCard title="Variant prices" description="Fine-tune price per variant, or bulk-apply a value.">
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add variants in the previous step to set individual prices. A product needs at least one variant to be published.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <BulkFill field="price" label="Set price for all" placeholder="Price" />
              <BulkFill field="mrp" label="Set MRP for all" placeholder="MRP" />
            </div>
            <VariantRowsTable columns={['variant', 'price', 'mrp', 'cost']} />
          </>
        )}
      </StepCard>
    </div>
  );
}
