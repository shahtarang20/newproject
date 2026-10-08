import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/utils/seo';
import { useWizard } from './context';
import { Field, StepCard } from './fields';

export function SeoStep() {
  const { form, shopSlug } = useWizard();
  const name = form.watch('name');
  const slug = form.watch('slug');
  const title = form.watch('seoTitle');
  const desc = form.watch('seoDescription');
  const shownSlug = slug || slugify(name) || 'your-product';
  return (
    <div className="space-y-4">
      <StepCard title="Search appearance" description="How this product looks on Google and when shared. Leave blank to use the product name and description.">
        <Field label="SEO title" path="seoTitle" hint={`${title.length}/120`}>
          <Input {...form.register('seoTitle')} maxLength={120} placeholder={name} />
        </Field>
        <Field label="Meta description" path="seoDescription" hint={`${desc.length}/320`}>
          <Textarea {...form.register('seoDescription')} rows={3} maxLength={320} />
        </Field>
        <Field label="URL slug" path="slug" hint="Lowercase letters, numbers and hyphens.">
          <Input {...form.register('slug')} placeholder={slugify(name)} maxLength={100} />
        </Field>
        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="truncate text-xs text-success">/shop/{shopSlug}/product/{shownSlug}</p>
          <p className="mt-0.5 truncate text-base font-medium text-info">{title || name || 'Product title'}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{desc || form.watch('shortDescription') || 'Your description appears here.'}</p>
        </div>
      </StepCard>
    </div>
  );
}
