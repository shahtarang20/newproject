import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Percentage change vs previous period. Positive = up. */
  delta?: number | null;
  deltaLabel?: string;
  /** Invert colours (e.g. cancellations: up is bad). */
  invertDelta?: boolean;
  /** Small muted line under the value, e.g. a secondary count. */
  hint?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, delta, deltaLabel = 'vs last period', invertDelta, hint, loading, className }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  const good = invertDelta ? !up : up;
  return (
    <Card className={cn('p-5 transition-shadow hover:shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {!loading && hint != null && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {!loading && delta != null && Number.isFinite(delta) && (
        <p className="mt-1.5 flex items-center gap-1 text-xs">
          <span className={cn('inline-flex items-center gap-0.5 font-medium', good ? 'text-success' : 'text-destructive')}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </p>
      )}
    </Card>
  );
}
