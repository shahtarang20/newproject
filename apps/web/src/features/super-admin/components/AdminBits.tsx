import type { ReactNode } from 'react';
import type { LimitKey } from '@vastra/shared';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes, formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

/** Friendly labels for plan limits / features (UI only, keyed by shared constants). */
export const LIMIT_TITLES: Record<LimitKey, string> = {
  products: 'Products',
  images: 'Images',
  videos: 'Videos',
  storageBytes: 'Storage',
  customers: 'Customers',
  ordersPerMonth: 'Orders / month',
  staff: 'Staff members',
  catalogues: 'Catalogues',
};

export const FEATURE_TITLES: Record<string, { title: string; hint: string }> = {
  customDomain: { title: 'Custom domain', hint: 'Serve the storefront on the shop’s own domain.' },
  whatsappIntegration: { title: 'WhatsApp integration', hint: 'WhatsApp order and enquiry notifications.' },
  analytics: { title: 'Analytics', hint: 'Basic shop analytics dashboard.' },
  advancedAnalytics: { title: 'Advanced analytics', hint: 'Funnels, cohorts and exports.' },
  apiAccess: { title: 'API access', hint: 'Programmatic access for integrations.' },
  customBranding: { title: 'Custom branding', hint: 'Remove Vastra branding, custom themes.' },
  bulkImport: { title: 'Bulk import', hint: 'CSV / Excel product import.' },
  prioritySupport: { title: 'Priority support', hint: 'Faster support response times.' },
};

export const GB = 1024 ** 3;
export const MB = 1024 ** 2;

export function formatLimitValue(key: LimitKey, v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Unlimited';
  return key === 'storageBytes' ? formatBytes(v) : formatNumber(v);
}

export const percentTone = (p: number) => (p >= 90 ? 'bg-destructive' : p >= 80 ? 'bg-warning' : 'bg-primary');

export function UsageBar({ limitKey, used, limit, percent, compact, label }: { limitKey: LimitKey; used: number; limit: number | null; percent: number; compact?: boolean; label?: string }) {
  const unlimited = limit === null;
  return (
    <div className={cn('min-w-0', compact ? 'space-y-0.5' : 'space-y-1.5')}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={cn('truncate', compact ? 'text-muted-foreground' : 'font-medium text-foreground')}>{label ?? LIMIT_TITLES[limitKey]}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatLimitValue(limitKey, used)} / {unlimited ? '∞' : formatLimitValue(limitKey, limit)}
        </span>
      </div>
      <Progress
        value={unlimited ? 0 : percent}
        className={compact ? 'h-1.5' : 'h-2'}
        indicatorClassName={percentTone(percent)}
        aria-label={`${LIMIT_TITLES[limitKey]} usage ${unlimited ? 'unlimited' : `${percent}%`}`}
      />
    </div>
  );
}

export function SectionCard({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Colours used by charts (CSS tokens so light/dark both work). */
export const CHART = {
  primary: 'hsl(var(--primary))',
  info: 'hsl(var(--info))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
};

export const chartTooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
} as const;

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Native <select>-free filter wrapper: Radix Select cannot hold '' so we use 'all'. */
export const ALL = 'all';
