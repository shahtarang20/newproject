import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import type { ShopDto } from '@/types/settings';
import type { ShopSettingsForm } from '../schemas';
import { SettingsSection } from './SettingsSection';
import { TextAreaField, TextField } from './fields';

export function SeoSection({ shop }: { shop: ShopDto }) {
  const { setValue } = useFormContext<ShopSettingsForm>();
  return (
    <SettingsSection id="seo" title="SEO & sharing" description="Controls how your shop appears in Google results and when a link is shared.">
      <div className="grid gap-4">
        <TextField name="seo.title" label="Page title" maxLength={120} placeholder={shop.name} />
        <TextAreaField name="seo.description" label="Meta description" rows={3} maxLength={300} hint="Up to 300 characters; aim for about 155." />
        <TextField name="seo.ogImageUrl" label="Share image URL (OG image)" type="url" inputMode="url" placeholder="https://…" />
        {shop.coverUrl && (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setValue('seo.ogImageUrl', shop.coverUrl ?? '', { shouldDirty: true })}>
              Use cover image
            </Button>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
