import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { ApiError } from '@/api/client';
import { formatMoney, formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

/** Categorical palette from design tokens (light/dark safe because the vars switch per theme). */
export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export const isPlanGated = (err: unknown): boolean => err instanceof ApiError && err.code === 'FEATURE_NOT_IN_PLAN';

/** `YYYY-MM-DD` (UTC day) -> "7 Oct". */
export function fmtDay(date: string, withYear = false): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(withYear ? { year: '2-digit' } : {}), timeZone: 'UTC' });
}

/** Compact rupee amounts with units Indian shop owners expect (K / L / Cr). Intl's en-IN compact uses "T" for thousand, which reads as trillion. */
export function compactMoney(minor: number): string {
  const major = minor / 100;
  const abs = Math.abs(major);
  const trim = (n: number): string => `${Number.isInteger(n) ? n : n.toFixed(1)}`;
  if (abs >= 1e7) return `₹${trim(major / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(major / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(major / 1e3)}K`;
  return `₹${Math.round(major)}`;
}

export const pct = (n: number | null | undefined, digits = 1): string => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)}%`);

// ---------------------------------------------------------------- panel
interface PanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function Panel({ title, description, actions, children, className }: PanelProps) {
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

/** Elegant per-panel prompt shown when the plan does not include a feature. */
export function UpgradePrompt({ feature, className }: { feature: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-accent/30 px-6 py-10 text-center', className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Lock className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">{feature} is not included in your plan</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">Upgrade to unlock deeper insights into how customers browse and buy.</p>
      </div>
      <Button asChild size="sm">
        <Link to="/dashboard/subscription">
          <Sparkles className="h-4 w-4" /> View plans
        </Link>
      </Button>
    </div>
  );
}

/** Renders loading / gated / error / content for one query-backed panel. */
export function PanelBody({
  loading, error, onRetry, feature, height = 260, children,
}: { loading?: boolean; error?: unknown; onRetry?: () => void; feature?: string; height?: number; children: ReactNode }) {
  if (error) {
    if (isPlanGated(error)) return <UpgradePrompt feature={feature ?? 'This report'} />;
    return <ErrorState error={error} onRetry={onRetry} className="py-8" />;
  }
  if (loading) return <Skeleton className="w-full" style={{ height }} />;
  return <>{children}</>;
}

export function RangeSwitcher<T extends string>({
  value, onChange, options, label = 'Date range',
}: { value: T; onChange: (v: T) => void; options: readonly T[]; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            value === o && 'bg-background text-foreground shadow-soft',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- charts
interface Point { date: string; value: number }
interface TimeSeriesProps {
  data: Point[];
  kind: 'money' | 'count';
  label: string;
  variant?: 'area' | 'bar';
  color?: string;
  height?: number;
  currency?: string;
  /** Format the x-axis/tooltip date (e.g. week/month buckets). */
  dateFormat?: (d: string) => string;
}

function TooltipBox({ active, payload, label, kind, name, currency, dateFormat }: {
  active?: boolean; payload?: { value?: number }[]; label?: string; kind: 'money' | 'count'; name: string; currency: string; dateFormat: (d: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-card">
      <p className="text-muted-foreground">{label ? dateFormat(label) : ''}</p>
      <p className="mt-0.5 font-semibold tabular-nums">
        {kind === 'money' ? formatMoney(v, currency) : formatNumber(v)} <span className="font-normal text-muted-foreground">{name}</span>
      </p>
    </div>
  );
}

export function TimeSeriesChart({ data, kind, label, variant = 'area', color = CHART_COLORS[0], height = 260, currency = 'INR', dateFormat = fmtDay }: TimeSeriesProps) {
  const total = data.reduce((s, p) => s + p.value, 0);
  const summary = `${label}: ${kind === 'money' ? formatMoney(total, currency) : formatNumber(total)} across ${data.length} points`;
  const gid = `g-${label.replace(/\W/g, '')}`;
  const common = {
    data,
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
      <XAxis
        dataKey="date" tickFormatter={dateFormat} tickLine={false} axisLine={false} minTickGap={24}
        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
      />
      <YAxis
        tickLine={false} axisLine={false} width={kind === 'money' ? 52 : 36} allowDecimals={false}
        tickFormatter={(v: number) => (kind === 'money' ? compactMoney(v) : formatNumber(v))}
        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
      />
      <Tooltip
        cursor={{ stroke: 'hsl(var(--border))' }}
        content={(p) => <TooltipBox {...(p as object)} kind={kind} name={label} currency={currency} dateFormat={dateFormat} />}
      />
    </>
  );
  return (
    <div role="img" aria-label={summary} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'area' ? (
          <AreaChart {...common}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {axes}
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gid})`} dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        ) : (
          <BarChart {...common}>
            {axes}
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

interface DonutProps {
  data: { name: string; value: number; secondary?: string }[];
  label: string;
  height?: number;
}
export function DonutSplit({ data, label, height = 200 }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No data for this period.</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${formatNumber(d.value)}`).join(', ')}`} className="w-full max-w-[200px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-card">
                    <span className="font-semibold">{String(payload[0]?.name)}</span>: {formatNumber(Number(payload[0]?.value ?? 0))}
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(d.value)} <span className="text-xs">({Math.round((d.value / total) * 100)}%)</span>
              {d.secondary && <span className="ml-2 text-foreground">{d.secondary}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
