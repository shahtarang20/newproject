import { ArrowDown, MessageCircle, Search, Share2, Store } from 'lucide-react';
import type { FunnelData } from '@/types/insights';
import { formatNumber } from '@/utils/format';
import { pct } from './shared';

const STEP_LABELS: Record<string, string> = {
  CATALOGUE_VIEW: 'Catalogue views',
  PRODUCT_VIEW: 'Product views',
  ADD_TO_CART: 'Added to cart',
  CHECKOUT_START: 'Checkout started',
  ORDER: 'Orders placed',
};

export function FunnelChart({ data }: { data: FunnelData }) {
  const max = Math.max(...data.funnel.map((s) => s.count), 1);
  const last = data.funnel[data.funnel.length - 1];
  const engagement = [
    { label: 'Shop views', value: data.engagement.SHOP_VIEW, icon: Store },
    { label: 'WhatsApp clicks', value: data.engagement.WHATSAPP_CLICK, icon: MessageCircle },
    { label: 'Shares', value: data.engagement.PRODUCT_SHARE, icon: Share2 },
    { label: 'Enquiries', value: data.engagement.ENQUIRY, icon: Search },
  ];
  return (
    <div className="space-y-5">
      <ol aria-label="Conversion funnel" className="space-y-1">
        {data.funnel.map((s, i) => (
          <li key={s.step}>
            {i > 0 && (
              <div className="flex items-center gap-1.5 py-1 pl-2 text-xs text-muted-foreground">
                <ArrowDown className="h-3 w-3" aria-hidden />
                <span className="tabular-nums">{pct(s.conversionFromPreviousPercent)}</span> continue
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-11 rounded-lg bg-muted/60">
                  <div
                    className="flex h-full items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-[width] duration-500"
                    style={{ width: `${Math.max((s.count / max) * 100, 6)}%`, opacity: 1 - i * 0.14 }}
                  >
                    <span className="truncate">{STEP_LABELS[s.step] ?? s.step}</span>
                  </div>
                </div>
              </div>
              <div className="w-24 shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{formatNumber(s.count)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{pct(s.conversionFromStartPercent)} of start</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
        Overall conversion: <strong>{pct(last?.conversionFromStartPercent ?? 0, 2)}</strong> of catalogue visitors placed an order.
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {engagement.map((e) => (
          <div key={e.label} className="rounded-xl border p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><e.icon className="h-3.5 w-3.5" aria-hidden /> {e.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(e.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
