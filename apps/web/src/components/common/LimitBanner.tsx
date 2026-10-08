import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { LimitKey } from '@vastra/shared';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LIMIT_LABELS } from '@/utils/labels';
import { formatBytes, formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

interface LimitBannerProps {
  limitKey: LimitKey;
  used: number;
  /** null = unlimited (banner renders nothing). */
  limit: number | null;
  /** Show only at/above this percent (default 80). */
  threshold?: number;
  upgradeHref?: string;
  className?: string;
}

const fmt = (key: LimitKey, n: number) => (key === 'storageBytes' ? formatBytes(n) : formatNumber(n));

export function LimitBanner({ limitKey, used, limit, threshold = 80, upgradeHref = '/dashboard/subscription', className }: LimitBannerProps) {
  if (limit == null || limit <= 0) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  if (pct < threshold) return null;
  const reached = used >= limit;
  return (
    <div
      role="status"
      className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', reached ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5', className)}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {reached
            ? `You've reached your ${LIMIT_LABELS[limitKey]} limit`
            : `You've used ${pct}% of your ${LIMIT_LABELS[limitKey]}`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fmt(limitKey, used)} of {fmt(limitKey, limit)} used. Upgrade your plan to add more.
        </p>
        <Progress value={pct} className="mt-2.5 h-1.5" indicatorClassName={reached ? 'bg-destructive' : 'bg-warning'} />
      </div>
      <Button asChild size="sm">
        <Link to={upgradeHref}>
          <Sparkles className="h-4 w-4" /> Upgrade plan
        </Link>
      </Button>
    </div>
  );
}
