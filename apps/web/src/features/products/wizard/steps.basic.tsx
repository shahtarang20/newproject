import { Controller } from 'react-hook-form';
import { PRODUCT_TYPES, GENDERS, FABRICS, OCCASIONS, SEASONS } from '@vastra/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FABRIC_LABELS, GENDER_LABELS, OCCASION_LABELS, PRODUCT_TYPE_LABELS, SEASON_LABELS, toOptions } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { useWizard } from './context';
import { ChipToggleGroup, EnumSelect, Field, StepCard, TagsInput } from './fields';

export function BasicInfoStep() {
  const { form } = useWizard();
  const { register, control, watch } = form;
  const type = watch('type');
  return (
    <div className="space-y-4">
      <StepCard title="What are you selling?" description="The product type decides which details you fill in later.">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Product type">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={field.value === t}
                  onClick={() => field.onChange(t)}
                  className={cn('rounded-xl border p-4 text-left transition-colors', field.value === t ? 'border-primary bg-accent/50 ring-2 ring-primary/20' : 'hover:bg-secondary/60')}
                >
                  <p className="font-medium">{PRODUCT_TYPE_LABELS[t]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t === 'SAREE' ? 'Saree type, length, blouse, work…' : 'Fit, sleeve, neck, sizes…'}</p>
                </button>
              ))}
            </div>
          )}
        />
      </StepCard>

      <StepCard title="Basic information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name" path="name" required className="sm:col-span-2">
            <Input {...register('name')} placeholder={type === 'SAREE' ? 'e.g. Banarasi Silk Saree' : 'e.g. Cotton Kurta'} maxLength={200} />
          </Field>
          <Field label="Product code / SKU" path="sku" hint="Leave blank to auto-generate.">
            <Input {...register('sku')} placeholder="Auto" maxLength={60} />
          </Field>
          <Field label="Brand" path="brand">
            <Input {...register('brand')} maxLength={100} />
          </Field>
          <Field label="Short description" path="shortDescription" className="sm:col-span-2" hint="One line shown on product cards.">
            <Input {...register('shortDescription')} maxLength={500} />
          </Field>
          <Field label="Description" path="description" className="sm:col-span-2">
            <Textarea {...register('description')} rows={5} placeholder="Fabric feel, styling tips, care…" />
          </Field>
        </div>
      </StepCard>

      <StepCard title="Details" description="Helps customers filter and find this product.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Gender">
            <Controller control={control} name="gender" render={({ field }) => <EnumSelect value={field.value} onChange={field.onChange} options={toOptions(GENDER_LABELS).filter((o) => GENDERS.includes(o.value))} />} />
          </Field>
          <Field label="Fabric">
            <Controller control={control} name="fabric" render={({ field }) => <EnumSelect value={field.value} onChange={field.onChange} options={toOptions(FABRIC_LABELS).filter((o) => FABRICS.includes(o.value))} />} />
          </Field>
          <Field label="Season">
            <Controller control={control} name="season" render={({ field }) => <EnumSelect value={field.value} onChange={field.onChange} options={toOptions(SEASON_LABELS).filter((o) => SEASONS.includes(o.value))} />} />
          </Field>
        </div>
        <Field label="Occasion">
          <Controller control={control} name="occasions" render={({ field }) => <ChipToggleGroup value={field.value} onChange={field.onChange} options={toOptions(OCCASION_LABELS).filter((o) => OCCASIONS.includes(o.value))} />} />
        </Field>
        <Field label="Tags" path="tags" hint="Press Enter or comma to add. Used for search.">
          <Controller control={control} name="tags" render={({ field }) => <TagsInput value={field.value} onChange={field.onChange} />} />
        </Field>
      </StepCard>
    </div>
  );
}
