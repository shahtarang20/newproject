import { AlertTriangle } from 'lucide-react';
import { LIMIT_KEYS, type LimitKey, type PlanLimits } from '@vastra/shared';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';
import type { UsageRow } from '@/types/settings';
import { LIMIT_TITLES, formatLimit, formatLimitValue, toneFor } from '../lib';

export function UsageMeters({ usage, limits }: { usage: UsageRow[]; limits: PlanLimits }) {
  const byKey = new Map(usage.map((u) => [u.key, u]));
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {LIMIT_KEYS.map((key: LimitKey) => {
        const used = byKey.get(key)?.used ?? 0;
        const limit = byKey.get(key)?.limit ?? limits[key] ?? null;
        const tone = toneFor(used, limit);
        const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        return (
          <li key={key} className="space-y-2 rounded-xl border p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{LIMIT_TITLES[key]}</span>
              <span className={cn('text-sm tabular-nums', tone === 'full' ? 'font-semibold text-destructive' : tone === 'warn' ? 'font-semibold text-warning' : 'text-muted-foreground')}>
                {formatLimitValue(key, used)} / {formatLimit(key, limit)}
              </span>
            </div>
            {limit != null ? (
              <Progress value={pct} className="h-2" aria-label={`${LIMIT_TITLES[key]} usage`} indicatorClassName={tone === 'full' ? 'bg-destructive' : tone === 'warn' ? 'bg-warning' : undefined} />
            ) : (
              <p className="text-xs text-muted-foreground">No limit on your plan</p>
            )}
            {tone !== 'ok' && (
              <p className={cn('flex items-center gap-1 text-xs', tone === 'full' ? 'text-destructive' : 'text-warning')}>
                <AlertTriangle className="h-3 w-3" /> {tone === 'full' ? 'Limit reached' : `${pct}% used`}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
