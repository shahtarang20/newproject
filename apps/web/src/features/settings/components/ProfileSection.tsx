import { useQueryClient } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { BUSINESS_TYPES } from '@vastra/shared';
import { FormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { shopApi } from '@/api/endpoints/shop';
import { queryKeys } from '@/api/queryKeys';
import { BUSINESS_TYPE_LABELS } from '@/utils/labels';
import type { ShopDto } from '@/types/settings';
import { syncShop } from '../hooks/useShop';
import type { ShopSettingsForm } from '../schemas';
import { SettingsSection } from './SettingsSection';
import { SingleImageUpload } from './SingleImageUpload';
import { TextAreaField, TextField } from './fields';

export function ProfileSection({ shop, disabled }: { shop: ShopDto; disabled?: boolean }) {
  const qc = useQueryClient();
  const { control } = useFormContext<ShopSettingsForm>();

  const patchCache = (patch: Partial<ShopDto>) => {
    const current = qc.getQueryData<ShopDto>(queryKeys.shop.detail()) ?? shop;
    syncShop(qc, { ...current, ...patch });
  };

  return (
    <SettingsSection id="profile" title="Profile" description="How your shop is introduced on your storefront.">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <SingleImageUpload
          label="Logo"
          value={shop.logoUrl}
          disabled={disabled}
          onUpload={async (file, onProgress) => {
            const { logoUrl } = await shopApi.uploadLogo(file, onProgress);
            patchCache({ logoUrl });
          }}
        />
        <SingleImageUpload
          label="Cover image"
          value={shop.coverUrl}
          disabled={disabled}
          shapeClassName="aspect-[16/6] w-full max-w-sm"
          onUpload={async (file, onProgress) => {
            const { coverUrl } = await shopApi.uploadCover(file, onProgress);
            patchCache({ coverUrl });
          }}
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Shop name" maxLength={120} autoComplete="organization" />
        <FormField
          control={control}
          name="businessType"
          label="Business type"
          render={({ field, id }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={id}><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{BUSINESS_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <TextField name="tagline" label="Tagline" maxLength={200} className="sm:col-span-2" placeholder="Sarees & ethnic wear since 1998" />
        <div className="sm:col-span-2">
          <TextAreaField name="description" label="About your shop" maxLength={4000} rows={5} />
        </div>
      </div>
    </SettingsSection>
  );
}
