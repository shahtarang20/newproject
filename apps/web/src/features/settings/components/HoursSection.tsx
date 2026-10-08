import { Copy } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ShopSettingsForm } from '../schemas';
import { SettingsSection } from './SettingsSection';

const DAY_LABEL: Record<string, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

export function HoursSection() {
  const { control, register, setValue, getValues, formState: { errors } } = useFormContext<ShopSettingsForm>();
  const { fields } = useFieldArray({ control, name: 'businessHours' });
  const hours = useWatch({ control, name: 'businessHours' });

  const copyToAll = () => {
    const first = getValues('businessHours.0');
    getValues('businessHours').forEach((_, i) => {
      if (i === 0) return;
      setValue(`businessHours.${i}.open`, first.open, { shouldDirty: true });
      setValue(`businessHours.${i}.close`, first.close, { shouldDirty: true });
      setValue(`businessHours.${i}.closed`, first.closed, { shouldDirty: true });
    });
  };

  return (
    <SettingsSection
      id="hours"
      title="Business hours"
      description="Customers see when you are open."
      className="[&_input[type=time]]:w-full"
    >
      <ul className="divide-y rounded-xl border">
        {fields.map((f, i) => {
          const closed = hours?.[i]?.closed;
          const err = errors.businessHours?.[i];
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 sm:px-4">
              <span className="w-24 text-sm font-medium">{DAY_LABEL[f.day]}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={!closed}
                  onCheckedChange={(open) => setValue(`businessHours.${i}.closed`, !open, { shouldDirty: true })}
                  aria-label={`${DAY_LABEL[f.day]} open`}
                />
                {closed ? 'Closed' : 'Open'}
              </label>
              {!closed && (
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
                  <Input type="time" aria-label={`${DAY_LABEL[f.day]} opens`} aria-invalid={!!err?.open} {...register(`businessHours.${i}.open`)} />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="time" aria-label={`${DAY_LABEL[f.day]} closes`} aria-invalid={!!err?.close} {...register(`businessHours.${i}.close`)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copyToAll}>
        <Copy className="h-4 w-4" /> Copy Monday to all days
      </Button>
    </SettingsSection>
  );
}
