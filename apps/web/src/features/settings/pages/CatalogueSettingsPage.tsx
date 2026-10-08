import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { BUTTON_STYLES, CATALOGUE_LAYOUTS, type ButtonStyle, type CatalogueLayout, type TemplateId } from '@vastra/shared';
import { shopApi } from '@/api/endpoints/shop';
import { queryKeys } from '@/api/queryKeys';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getCachedTemplate } from '@/features/storefront/templates/registry';
import { usePermission } from '@/hooks/usePermission';
import { getErrorMessage } from '@/utils/errors';
import { pageTitle } from '@/utils/seo';
import { cn } from '@/utils/cn';
import { SettingsSection } from '../components/SettingsSection';
import { TemplateCard } from '../components/TemplateCard';
import { useShopQuery, useUpdateShop } from '../hooks/useShop';

const BUTTON_LABELS: Record<ButtonStyle, string> = { rounded: 'Rounded', pill: 'Pill', square: 'Square' };
const BUTTON_RADIUS: Record<ButtonStyle, string> = { rounded: '10px', pill: '9999px', square: '0' };
const LAYOUT_INFO: Record<CatalogueLayout, { label: string; hint: string }> = {
  grid: { label: 'Grid', hint: 'Even rows of product cards' },
  masonry: { label: 'Masonry', hint: 'Staggered, image-led columns' },
  list: { label: 'List', hint: 'One product per row with details' },
  editorial: { label: 'Editorial', hint: 'Large featured cards, magazine feel' },
};
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export default function CatalogueSettingsPage() {
  const { can } = usePermission();
  const canWrite = can('settings:write');
  const confirm = useConfirm();
  const shopQ = useShopQuery();
  const templatesQ = useQuery({ queryKey: [...queryKeys.shop.all, 'templates'], queryFn: shopApi.templates, staleTime: 5 * 60_000 });
  const update = useUpdateShop();

  const shop = shopQ.data;
  const appliedId = shop?.theme?.templateId;
  const themeKey = JSON.stringify(shop?.theme ?? null);
  const [selected, setSelected] = useState<TemplateId | undefined>();
  const [color, setColor] = useState('');
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>('rounded');
  const [layout, setLayout] = useState<CatalogueLayout>('grid');

  useEffect(() => {
    if (!shop) return;
    setSelected((s) => s ?? shop.theme?.templateId);
    setColor(shop.theme?.primaryColor ?? '');
    setButtonStyle(shop.theme?.buttonStyle ?? 'rounded');
    setLayout(shop.theme?.catalogueLayout ?? 'grid');
    // Only re-sync when the saved theme actually changes, so a background refetch never clobbers edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey]);

  const colorValid = color === '' || HEX.test(color);
  const styleDirty = useMemo(
    () => !!shop && ((shop.theme?.primaryColor ?? '') !== color || (shop.theme?.buttonStyle ?? 'rounded') !== buttonStyle || (shop.theme?.catalogueLayout ?? 'grid') !== layout),
    [shop, color, buttonStyle, layout],
  );
  const defaultColor = getCachedTemplate(selected ?? appliedId)?.tokens.vars['--sf-primary'] ?? '#7a1f2b';
  const pickerValue = HEX.test(color) && color.length === 7 ? color : /^#[0-9a-f]{6}$/i.test(defaultColor) ? defaultColor : '#7a1f2b';

  const applyTemplate = async () => {
    if (!selected || selected === appliedId) return;
    const name = templatesQ.data?.find((t) => t.id === selected)?.name ?? selected;
    const ok = await confirm({
      title: `Apply the ${name} template?`,
      description: 'Your storefront switches to this look immediately. Your shop was given a template automatically when you signed up; you can change it again any time. Products and settings are not affected.',
      confirmText: 'Apply template',
    });
    if (!ok) return;
    try {
      await update.mutateAsync({ theme: { templateId: selected } });
      toast.success(`${name} is now live on your storefront`);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not apply the template'));
    }
  };

  const saveStyle = async () => {
    if (!colorValid) return void toast.error('Enter a valid hex colour like #7a1f2b.');
    try {
      await update.mutateAsync({ theme: { primaryColor: color, buttonStyle, catalogueLayout: layout } });
      toast.success('Storefront style saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save style'));
    }
  };

  const loading = shopQ.isLoading || templatesQ.isLoading;
  const error = shopQ.error ?? templatesQ.error;
  const previewColor = colorValid ? color || undefined : undefined;

  return (
    <>
      <Helmet><title>{pageTitle('Storefront design')}</title></Helmet>
      <PageHeader
        title="Storefront design"
        description="Choose how your public shop looks."
        breadcrumb={<Link to="/dashboard/settings" className="inline-flex items-center gap-0.5 hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Settings</Link>}
        actions={shop && (
          <Button asChild variant="outline" size="sm">
            <a href={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open storefront</a>
          </Button>
        )}
      />

      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>}
      {error && !loading && <ErrorState error={error} onRetry={() => { void shopQ.refetch(); void templatesQ.refetch(); }} />}

      {shop && templatesQ.data && (
        <div className="space-y-5 pb-6">
          <SettingsSection
            title="Template"
            description="Previews use sample products so you can compare styles; they are rendered live from each template. Your colour and button choices below are applied to the previews."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templatesQ.data.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  shopName={shop.name}
                  applied={t.id === appliedId}
                  selected={t.id === selected}
                  onSelect={() => setSelected(t.id)}
                  primaryColor={previewColor}
                  buttonStyle={buttonStyle}
                  layout={layout}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3">
              <p className="text-sm text-muted-foreground">
                {selected === appliedId ? 'This template is currently applied.' : <>Selected: <strong className="text-foreground">{templatesQ.data.find((t) => t.id === selected)?.name}</strong></>}
              </p>
              <Button onClick={applyTemplate} disabled={!canWrite || !selected || selected === appliedId} loading={update.isPending && update.variables?.theme?.templateId !== undefined}>
                Apply template
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection title="Style" description="Fine-tune colours, buttons and how products are arranged.">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primary-hex">Primary colour</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label="Pick primary colour"
                    value={pickerValue}
                    disabled={!canWrite}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border bg-background p-1 disabled:cursor-not-allowed"
                  />
                  <Input id="primary-hex" value={color} disabled={!canWrite} onChange={(e) => setColor(e.target.value.trim())} placeholder="Template default" className="w-40 font-mono" aria-invalid={!colorValid} />
                  <Button type="button" variant="ghost" size="sm" disabled={!color || !canWrite} onClick={() => setColor('')}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reset to template colour
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{colorValid ? 'Overrides the template\'s primary colour on buttons and highlights.' : 'Use a hex colour like #7a1f2b.'}</p>
              </div>

              <div className="space-y-2">
                <Label>Button style</Label>
                <div role="radiogroup" aria-label="Button style" className="flex flex-wrap gap-2">
                  {BUTTON_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={buttonStyle === s}
                      disabled={!canWrite}
                      onClick={() => setButtonStyle(s)}
                      className={cn('flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors disabled:opacity-60', buttonStyle === s ? 'border-primary bg-accent' : 'hover:bg-secondary')}
                    >
                      <span className="h-6 w-14 bg-primary" style={{ borderRadius: BUTTON_RADIUS[s] }} />
                      {BUTTON_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catalogue layout</Label>
                <div role="radiogroup" aria-label="Catalogue layout" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {CATALOGUE_LAYOUTS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={layout === l}
                      disabled={!canWrite}
                      onClick={() => setLayout(l)}
                      className={cn('rounded-xl border p-3 text-left transition-colors disabled:opacity-60', layout === l ? 'border-primary bg-accent' : 'hover:bg-secondary')}
                    >
                      <LayoutGlyph layout={l} />
                      <p className="mt-2 text-sm font-medium">{LAYOUT_INFO[l].label}</p>
                      <p className="text-xs text-muted-foreground">{LAYOUT_INFO[l].hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveStyle} disabled={!canWrite || !styleDirty || !colorValid} loading={update.isPending && update.variables?.theme?.buttonStyle !== undefined}>Save style</Button>
                <Button variant="ghost" disabled={!styleDirty} onClick={() => { setColor(shop.theme?.primaryColor ?? ''); setButtonStyle(shop.theme?.buttonStyle ?? 'rounded'); setLayout(shop.theme?.catalogueLayout ?? 'grid'); }}>Discard</Button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}
    </>
  );
}

function LayoutGlyph({ layout }: { layout: CatalogueLayout }) {
  const block = 'rounded bg-muted-foreground/25';
  if (layout === 'list') return <div className="space-y-1">{[0, 1, 2].map((i) => <div key={i} className={cn(block, 'h-3')} />)}</div>;
  if (layout === 'masonry')
    return (
      <div className="flex h-12 gap-1">
        <div className="flex flex-1 flex-col gap-1"><div className={cn(block, 'h-7')} /><div className={cn(block, 'flex-1')} /></div>
        <div className="flex flex-1 flex-col gap-1"><div className={cn(block, 'h-4')} /><div className={cn(block, 'flex-1')} /></div>
        <div className="flex flex-1 flex-col gap-1"><div className={cn(block, 'h-8')} /><div className={cn(block, 'flex-1')} /></div>
      </div>
    );
  if (layout === 'editorial')
    return (
      <div className="grid h-12 grid-cols-3 gap-1"><div className={cn(block, 'col-span-2 row-span-2')} /><div className={block} /><div className={block} /></div>
    );
  return <div className="grid h-12 grid-cols-3 gap-1">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={block} />)}</div>;
}
