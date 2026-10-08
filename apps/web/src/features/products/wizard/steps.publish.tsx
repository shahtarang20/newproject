import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeCard } from '@/components/common/QRCodeCard';
import { ShareButtons } from '@/components/common/ShareButtons';
import { CopyButton } from '@/components/common/CopyButton';
import { LimitReachedAlert } from '../components/LimitReached';
import { publicProductUrl } from '../utils';
import { useWizard } from './context';
import { StepCard } from './fields';

interface Props {
  busy: 'draft' | 'publish' | 'unpublish' | null;
  error: unknown;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onCancel: () => void;
}

export function PublishStep({ busy, error, onSaveDraft, onPublish, onUnpublish, onCancel }: Props) {
  const { form, media, product, canWrite, shopSlug } = useWizard();
  const live = product?.status === 'ACTIVE' || product?.status === 'OUT_OF_STOCK';
  const variants = form.watch('variants').filter((r) => r.isActive);
  const images = media.filter((m) => m.kind === 'IMAGE');
  const checks = [
    { ok: variants.length > 0, label: 'At least one active variant' },
    { ok: images.length > 0, label: 'At least one photo' },
    { ok: form.watch('name').trim().length >= 2, label: 'Product name' },
  ];
  const ready = checks.every((c) => c.ok);
  const url = product?.slug ? publicProductUrl(shopSlug, product.slug) : '';
  const msg = error instanceof Error ? error.message : '';

  return (
    <div className="space-y-4">
      <StepCard title={live ? 'Product is live' : 'Ready to publish?'} description={live ? 'Your changes are saved automatically. Share the link below.' : 'Save as draft to keep it private, or publish it to your storefront.'}>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />} {c.label}
            </li>
          ))}
        </ul>
        <LimitReachedAlert error={error} />
        {error != null && !(error instanceof Error && !msg) && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{msg}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          {canWrite && <Button variant="outline" loading={busy === 'draft'} disabled={!!busy} onClick={onSaveDraft}>{live ? 'Save & close' : 'Save draft'}</Button>}
          {canWrite && live && <Button variant="outline" loading={busy === 'unpublish'} disabled={!!busy} onClick={onUnpublish}>Unpublish</Button>}
          {canWrite && !live && <Button loading={busy === 'publish'} disabled={!!busy || !ready} onClick={onPublish}>Publish</Button>}
        </div>
      </StepCard>

      {live && url && (
        <StepCard title="Share your product">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-3">
            <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
            <CopyButton value={url} label="Link">Copy</CopyButton>
          </div>
          <ShareButtons url={url} text={`Check out ${form.getValues('name')}`} />
          <div className="flex justify-center"><QRCodeCard url={url} fileName={`qr-${product?.slug}`} /></div>
        </StepCard>
      )}
    </div>
  );
}
