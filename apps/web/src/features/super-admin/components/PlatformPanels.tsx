import { AlertTriangle, ExternalLink, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import type { AdminAnalytics } from '@/types/admin';
import { formatMoney, formatNumber } from '@/utils/format';
import { LIMIT_TITLES, formatLimitValue, percentTone } from './AdminBits';

export function TopShopsList({ rows }: { rows: AdminAnalytics['topShops'] }) {
  if (!rows.length) return <EmptyState compact icon={Trophy} title="No orders yet" description="Top shops by GMV will appear here." />;
  const max = Math.max(...rows.map((r) => r.gmvMinor), 1);
  return (
    <ol className="space-y-3">
      {rows.slice(0, 8).map((s, i) => (
        <li key={s.shopId} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="truncate font-medium">{s.name}</span>
            </span>
            <span className="shrink-0 tabular-nums">{formatMoney(s.gmvMinor)}</span>
          </div>
          <div className="ml-6 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(s.gmvMinor / max) * 100}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{formatNumber(s.orders)} orders</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function NearLimitsList({ rows }: { rows: AdminAnalytics['shopsNearLimits'] }) {
  if (!rows.length) return <EmptyState compact icon={AlertTriangle} title="All shops have headroom" description="Shops using 80% or more of any limit show up here." />;
  return (
    <ul className="divide-y">
      {rows.slice(0, 8).map((s) => (
        <li key={s.shopId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{s.name}</span>
              {s.plan && <Badge variant="neutral">{s.plan.name}</Badge>}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {s.keys.map((k) => (
                <span key={k.key} className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${percentTone(k.percent)}`} />
                  {LIMIT_TITLES[k.key]} {formatLimitValue(k.key, k.used)}/{formatLimitValue(k.key, k.limit)} ({k.percent}%)
                </span>
              ))}
            </div>
          </div>
          <Link to="/super-admin/shops" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline" aria-label={`Manage ${s.name}`}>
            Manage <ExternalLink className="h-3 w-3" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
