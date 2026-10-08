import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '@/api/endpoints/shop';
import { queryKeys } from '@/api/queryKeys';
import { loadTemplate } from '@/features/storefront/templates/registry';
import { Monitor, Smartphone } from 'lucide-react';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toMinor } from '@vastra/shared';
import { useWizard } from './context';
import { StepCard } from './fields';
import { discountPercent } from './schema';

function useShopTheme() {
  const shopQ = useQuery({ queryKey: queryKeys.shop.detail(), queryFn: shopApi.get, staleTime: 60_000 });
  const theme = shopQ.data?.theme;
  const tplQ = useQuery({ queryKey: ['shop', 'template-def', theme?.templateId ?? 'default'], queryFn: () => loadTemplate(theme?.templateId), enabled: shopQ.isSuccess, staleTime: Infinity });
  const tokens = tplQ.data?.tokens;
  useEffect(() => {
    const href = tokens?.fontsHref;
    if (!href || document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }, [tokens?.fontsHref]);
  const style: CSSProperties = { ...(tokens?.vars as CSSProperties | undefined) };
  if (theme?.primaryColor) (style as Record<string, string>)['--sf-primary'] = theme.primaryColor;
  const btnRadius = theme?.buttonStyle === 'pill' ? '9999px' : theme?.buttonStyle === 'square' ? '0' : '8px';
  return { style, btnRadius, currency: shopQ.data?.currency };
}

function PreviewBody({ compact }: { compact: boolean }) {
  const { form, media } = useWizard();
  const { style, btnRadius, currency } = useShopTheme();
  const v = form.watch();
  const imgs = media.filter((m) => m.kind === 'IMAGE');
  const [active, setActive] = useState(0);
  const prices = v.variants.filter((r) => r.isActive && r.price !== '' && Number.isFinite(Number(r.price))).map((r) => Number(r.price));
  const lo = prices.length ? Math.min(...prices) : Number(v.basePrice) || 0;
  const hi = prices.length ? Math.max(...prices) : lo;
  const mrp = Math.max(0, ...v.variants.map((r) => Number(r.mrp) || 0), Number(v.baseMrp) || 0);
  const disc = discountPercent(lo, mrp);
  const cur = currency ?? 'INR';
  const radius = btnRadius;
  const colours = v.colours.length ? v.colours : [];
  const sizes = v.sizes;
  const img = imgs[Math.min(active, Math.max(0, imgs.length - 1))];
  return (
    <div style={{ ...style, background: 'var(--sf-bg, #fff)', color: 'var(--sf-fg, #18181b)', fontFamily: 'var(--sf-font-body, inherit)' }} className={compact ? 'space-y-3 p-3' : 'grid grid-cols-2 gap-8 p-8'}>
      <div className="space-y-2">
        <div className="aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100">
          {img ? <img src={img.url} alt={v.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-zinc-400">No image yet</div>}
        </div>
        {imgs.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {imgs.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setActive(i)} aria-label={`Image ${i + 1}`} className={cn('h-12 w-12 shrink-0 overflow-hidden rounded border-2', i === active ? 'border-zinc-900' : 'border-transparent')}>
                <img src={m.tinyUrl ?? m.thumbUrl ?? m.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        {v.brand && <p className="text-xs uppercase tracking-wider text-zinc-500">{v.brand}</p>}
        <h3 style={{ fontFamily: 'var(--sf-font-display, inherit)' }} className={cn('font-semibold', compact ? 'text-lg' : 'text-2xl')}>{v.name || 'Product name'}</h3>
        {v.hidePrice ? (
          <p className="text-sm text-zinc-600">Contact shop for price</p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold">{formatMoney(toMinor(lo), cur)}{hi > lo ? ` – ${formatMoney(toMinor(hi), cur)}` : ''}</span>
            {mrp > lo && <span className="text-sm text-zinc-400 line-through">{formatMoney(toMinor(mrp), cur)}</span>}
            {disc > 0 && <span className="text-sm font-medium text-green-600">{disc}% off</span>}
          </div>
        )}
        {colours.length > 0 && (
          <div className="flex gap-1.5">{colours.map((c) => <span key={c.name} title={c.name} className="h-6 w-6 rounded-full border" style={{ background: c.hex }} />)}</div>
        )}
        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{sizes.map((s) => <span key={s} className="rounded border px-2.5 py-1 text-xs">{s}</span>)}</div>
        )}
        <button type="button" className="w-full rounded-lg py-2.5 text-sm font-medium text-white" style={{ background: 'var(--sf-primary, #18181b)', borderRadius: radius }}>
          {v.hidePrice ? 'Send enquiry' : 'Add to cart'}
        </button>
        {(v.shortDescription || v.description) && <p className="whitespace-pre-line text-sm text-zinc-600">{v.description || v.shortDescription}</p>}
      </div>
    </div>
  );
}

export function PreviewStep() {
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  return (
    <StepCard title="Preview" description="A simplified view of how customers will see this product.">
      <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
        {([['mobile', Smartphone, 'Mobile'], ['desktop', Monitor, 'Desktop']] as const).map(([k, Icon, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', mode === k && 'bg-background shadow-soft')}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl bg-muted/50 p-4">
        {mode === 'mobile' ? (
          <div className="mx-auto w-[360px] max-w-full overflow-hidden rounded-[2rem] border-8 border-zinc-900 shadow-lg"><PreviewBody compact /></div>
        ) : (
          <div className="mx-auto w-full min-w-[720px] max-w-4xl overflow-hidden rounded-xl border shadow-lg">
            <div className="flex h-7 items-center gap-1.5 bg-zinc-200 px-3">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-zinc-400" />)}</div>
            <PreviewBody compact={false} />
          </div>
        )}
      </div>
    </StepCard>
  );
}
