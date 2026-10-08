import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Minus, Tags, AlertTriangle } from 'lucide-react';
import { FEATURE_KEYS, LIMIT_KEYS, type FeatureKey, type LimitKey } from '@vastra/shared';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBytes, formatMoney, formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';
import { Seo } from '../components/Seo';
import { Reveal } from '../components/Reveal';

interface NormPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  monthly: number;
  yearly: number;
  limits: Partial<Record<LimitKey, number | null>>;
  features: Partial<Record<FeatureKey, boolean>>;
  popular: boolean;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : 0);

/** Defensive: the API may expose prices as priceMinor{monthly,yearly} or monthly/yearlyPriceMinor. */
function normalise(raw: unknown[]): NormPlan[] {
  const plans = raw
    .filter((r): r is Record<string, any> => !!r && typeof r === 'object') // eslint-disable-line @typescript-eslint/no-explicit-any
    .map((p) => {
      const pm = (p.priceMinor ?? p.price ?? {}) as Record<string, unknown>;
      return {
        id: String(p.id ?? p.code ?? p.name),
        name: String(p.name ?? p.code ?? 'Plan'),
        code: String(p.code ?? p.id ?? ''),
        description: typeof p.description === 'string' ? p.description : undefined,
        monthly: num(p.monthlyPriceMinor ?? pm.monthly),
        yearly: num(p.yearlyPriceMinor ?? pm.yearly),
        limits: (p.limits && typeof p.limits === 'object' ? p.limits : {}) as NormPlan['limits'],
        features: (p.features && typeof p.features === 'object' ? p.features : {}) as NormPlan['features'],
        popular: !!(p.isPopular ?? false),
      } satisfies NormPlan;
    });
  if (plans.length > 1 && !plans.some((p) => p.popular)) plans[1].popular = true;
  return plans;
}

const LIMIT_LABEL: Record<LimitKey, (n: number) => string> = {
  products: (n) => `${formatNumber(n)} products`,
  images: (n) => `${formatNumber(n)} images`,
  videos: (n) => `${formatNumber(n)} videos`,
  storageBytes: (n) => `${formatBytes(n)} storage`,
  customers: (n) => `${formatNumber(n)} customers`,
  ordersPerMonth: (n) => `${formatNumber(n)} orders per month`,
  staff: (n) => `${formatNumber(n)} staff accounts`,
  catalogues: (n) => `${formatNumber(n)} catalogues`,
};
const LIMIT_NOUN: Record<LimitKey, string> = {
  products: 'products', images: 'images', videos: 'videos', storageBytes: 'storage', customers: 'customers',
  ordersPerMonth: 'orders per month', staff: 'staff accounts', catalogues: 'catalogues',
};
const LIMIT_TITLE: Record<LimitKey, string> = {
  products: 'Products', images: 'Images', videos: 'Videos', storageBytes: 'Storage', customers: 'Customers',
  ordersPerMonth: 'Orders per month', staff: 'Staff accounts', catalogues: 'Catalogues',
};
const FEATURE_LABEL: Record<FeatureKey, string> = {
  customDomain: 'Custom domain', whatsappIntegration: 'WhatsApp integration', analytics: 'Analytics', advancedAnalytics: 'Advanced analytics',
  apiAccess: 'API access', customBranding: 'Custom branding', bulkImport: 'Bulk CSV import', prioritySupport: 'Priority support',
};

function limitText(key: LimitKey, v: number | null | undefined): string | null {
  if (v === undefined) return null;
  if (v === null) return `Unlimited ${LIMIT_NOUN[key]}`;
  return LIMIT_LABEL[key](v);
}
function limitCell(key: LimitKey, v: number | null | undefined): string {
  if (v === undefined) return '-';
  if (v === null) return 'Unlimited';
  return key === 'storageBytes' ? formatBytes(v) : formatNumber(v);
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const q = useQuery({
    queryKey: ['subscription', 'public-plans'],
    queryFn: async () => normalise(((await api.get<unknown[]>('/subscription/public-plans')).data as unknown[]) ?? []),
    staleTime: 5 * 60_000,
  });
  const plans = q.data ?? [];
  const showYearlyToggle = useMemo(() => plans.some((p) => p.yearly > 0), [plans]);
  const price = (p: NormPlan) => (yearly && showYearlyToggle ? p.yearly : p.monthly);

  return (
    <>
      <Seo title="Pricing" description="Simple plans for garment and saree shops. Start free and upgrade when you need more." path="/pricing" />
      <section className="container py-16 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Plans that grow with your shop</h1>
          <p className="mt-4 text-lg text-muted-foreground">Start free, upgrade only when you need more room.</p>
          {showYearlyToggle && (
            <div role="group" aria-label="Billing interval" className="mt-8 inline-flex rounded-full border bg-card p-1 shadow-soft">
              {(['Monthly', 'Yearly'] as const).map((l) => {
                const active = (l === 'Yearly') === yearly;
                return (
                  <button key={l} type="button" aria-pressed={active} onClick={() => setYearly(l === 'Yearly')}
                    className={cn('rounded-full px-5 py-1.5 text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                    {l}
                  </button>
                );
              })}
            </div>
          )}
        </Reveal>

        <div className="mt-14">
          {q.isLoading ? (
            <div className="grid gap-5 md:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[460px] rounded-3xl" />)}
            </div>
          ) : q.isError ? (
            <EmptyState icon={AlertTriangle} title="We could not load the plans" description="Please check your connection and try again."
              action={<Button onClick={() => q.refetch()} loading={q.isFetching}>Retry</Button>} />
          ) : plans.length === 0 ? (
            <EmptyState icon={Tags} title="Plans coming soon" description="We are finalising our plans. You can still create your shop for free."
              action={<Button asChild><Link to="/register">Start free</Link></Button>} />
          ) : (
            <>
              <div className={cn('mx-auto grid gap-5', plans.length === 1 ? 'max-w-md' : plans.length === 2 ? 'max-w-3xl md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3')}>
                {plans.map((p) => (
                  <div key={p.id} className={cn('relative flex flex-col rounded-3xl border bg-card p-7 shadow-soft', p.popular && 'border-primary shadow-float ring-1 ring-primary/30')}>
                    {p.popular && <Badge className="absolute -top-3 left-7">Most popular</Badge>}
                    <h2 className="text-lg font-semibold tracking-tight">{p.name}</h2>
                    {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                    <p className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight">{price(p) === 0 ? 'Free' : formatMoney(price(p))}</span>
                      {price(p) > 0 && <span className="text-sm text-muted-foreground">/{yearly && showYearlyToggle ? 'year' : 'month'}</span>}
                    </p>
                    <Button asChild className="mt-6" variant={p.popular ? 'default' : 'outline'} size="lg">
                      <Link to={`/register?plan=${encodeURIComponent(p.code)}`}>Choose {p.name}</Link>
                    </Button>
                    <ul className="mt-6 space-y-2.5 text-sm">
                      {LIMIT_KEYS.map((k) => {
                        const t = limitText(k, p.limits[k]);
                        return t ? <li key={k} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t}</li> : null;
                      })}
                    </ul>
                    <ul className="mt-4 space-y-2.5 border-t pt-4 text-sm">
                      {FEATURE_KEYS.map((k) => (
                        <li key={k} className={cn('flex gap-2', !p.features[k] && 'text-muted-foreground/60')}>
                          {p.features[k] ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0" />}
                          {FEATURE_LABEL[k]}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mx-auto mt-20 max-w-5xl">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight">Compare plans</h2>
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th scope="col" className="p-4 font-medium text-muted-foreground">Plan</th>
                        {plans.map((p) => <th key={p.id} scope="col" className="p-4 font-semibold">{p.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <th scope="row" className="p-4 text-left font-medium">Price</th>
                        {plans.map((p) => <td key={p.id} className="p-4">{price(p) === 0 ? 'Free' : formatMoney(price(p))}</td>)}
                      </tr>
                      {LIMIT_KEYS.map((k) => (
                        <tr key={k} className="border-b">
                          <th scope="row" className="p-4 text-left font-medium">{LIMIT_TITLE[k]}</th>
                          {plans.map((p) => <td key={p.id} className="p-4">{limitCell(k, p.limits[k])}</td>)}
                        </tr>
                      ))}
                      {FEATURE_KEYS.map((k) => (
                        <tr key={k} className="border-b last:border-0">
                          <th scope="row" className="p-4 text-left font-medium">{FEATURE_LABEL[k]}</th>
                          {plans.map((p) => (
                            <td key={p.id} className="p-4">
                              {p.features[k] ? <Check className="h-4 w-4 text-success" aria-label="Included" /> : <Minus className="h-4 w-4 text-muted-foreground/50" aria-label="Not included" />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
