import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, ExternalLink, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RESERVED_SHOP_SLUGS } from '@vastra/shared';
import { api, ApiError } from '@/api/client';
import { shopApi } from '@/api/endpoints/shop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { QRCodeCard } from '@/components/common/QRCodeCard';
import { ShareButtons } from '@/components/common/ShareButtons';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/errors';
import type { ShopDto } from '@/types/settings';
import { syncShop, useUpdateShop } from '../hooks/useShop';
import { SettingsSection } from './SettingsSection';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'unknown';

export const storefrontUrl = (slug: string) => `${window.location.origin}/shop/${slug}`;

export function PublicLinkSection({ shop, disabled }: { shop: ShopDto; disabled?: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const update = useUpdateShop();
  const [slug, setSlug] = useState(shop.slug);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [downloading, setDownloading] = useState(false);
  const debounced = useDebounce(slug.trim().toLowerCase(), 400);

  useEffect(() => setSlug(shop.slug), [shop.slug]);

  useEffect(() => {
    if (debounced === shop.slug) return setAvailability('idle');
    if (debounced.length < 3 || debounced.length > 60 || !SLUG_RE.test(debounced)) return setAvailability('invalid');
    if ((RESERVED_SHOP_SLUGS as readonly string[]).includes(debounced)) return setAvailability('reserved');
    let alive = true;
    setAvailability('checking');
    // The public storefront endpoint is the only unauthenticated lookup: 404 means nobody uses the slug.
    api.get(`/shop/public/${debounced}`)
      .then(() => alive && setAvailability('taken'))
      .catch((e: unknown) => alive && setAvailability(e instanceof ApiError && e.status === 404 ? 'available' : 'unknown'));
    return () => { alive = false; };
  }, [debounced, shop.slug]);

  const changed = slug.trim().toLowerCase() !== shop.slug;
  const canSave = changed && (availability === 'available' || availability === 'unknown') && !disabled;

  const save = async () => {
    const next = slug.trim().toLowerCase();
    const ok = await confirm({
      title: 'Change your shop link?',
      description: `Your old link (${storefrontUrl(shop.slug)}) will stop working immediately. QR codes, printed material and links you've already shared will break.`,
      confirmText: 'Change link',
      destructive: true,
    });
    if (!ok) return;
    try {
      const updated = await update.mutateAsync({ slug: next });
      syncShop(qc, updated);
      toast.success('Shop link updated');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not change the link'));
    }
  };

  const downloadServerQr = async () => {
    setDownloading(true);
    try {
      const blob = await shopApi.qrBlob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `shop-${shop.slug}-qr.png`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not download the QR code'));
    } finally {
      setDownloading(false);
    }
  };

  const url = storefrontUrl(shop.slug);
  const status = {
    checking: <span className="flex items-center gap-1 text-muted-foreground"><Spinner className="h-3 w-3" /> Checking…</span>,
    available: <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Available</span>,
    taken: <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> Already taken</span>,
    reserved: <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> Reserved word</span>,
    invalid: <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> 3-60 characters: lowercase letters, numbers, hyphens</span>,
    unknown: <span className="text-muted-foreground">Could not pre-check; the server will confirm on save.</span>,
    idle: null,
  }[availability];

  return (
    <SettingsSection id="link" title="Public link" description="The address customers use to reach your storefront.">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="shop-slug">Shop link</Label>
            <div className="flex items-stretch gap-2">
              <span className="hidden items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground sm:flex">{window.location.host}/shop/</span>
              <Input id="shop-slug" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={disabled} autoCapitalize="none" spellCheck={false} aria-invalid={availability === 'taken' || availability === 'invalid' || availability === 'reserved'} />
            </div>
            <p className="min-h-[1rem] text-xs" aria-live="polite">{status}</p>
          </div>
          <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>Changing your link takes effect immediately and breaks the old one. Anything you've already shared or printed (including QR codes) will stop working.</p>
          </div>
          <Button type="button" onClick={save} disabled={!canSave} loading={update.isPending}>Update link</Button>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Share your shop</p>
            <p className="break-all text-xs text-muted-foreground">{url}</p>
            <ShareButtons url={url} text={`Shop at ${shop.name}:`} />
            <Button asChild variant="ghost" size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open storefront</a>
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <QRCodeCard url={url} title="Shop QR code" fileName={`${shop.slug}-qr`} description="Print it for your counter or packaging." />
          <Button type="button" variant="ghost" size="sm" onClick={downloadServerQr} loading={downloading}>
            <Download className="h-4 w-4" /> High-res QR from server
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
