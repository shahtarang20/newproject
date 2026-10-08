import { Check, X } from 'lucide-react';
import { FEATURE_KEYS, LIMIT_KEYS, type BillingInterval } from '@vastra/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PlanDto } from '@/types/settings';
import { FEATURE_LABELS, LIMIT_TITLES, formatLimit } from '../lib';

interface Props {
  plan: PlanDto;
  interval: BillingInterval;
  isCurrent: boolean;
  currentPrice: number;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
}

export function PlanCard({ plan, interval, isCurrent, currentPrice, busy, disabled, onChoose }: Props) {
  const price = plan.priceMinor[interval];
  const yearlySaving = plan.priceMinor.MONTHLY * 12 - plan.priceMinor.YEARLY;
  const action = price > currentPrice ? 'Upgrade' : price < currentPrice ? 'Downgrade' : 'Switch';
  return (
    <Card className={cn('flex flex-col p-5', isCurrent && 'border-primary ring-2 ring-primary/20')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
        {isCurrent && <Badge variant="soft">Current plan</Badge>}
      </div>
      {plan.description && <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>}
      <p className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight">{price === 0 ? 'Free' : formatMoney(price, plan.currency)}</span>
        {price > 0 && <span className="text-sm text-muted-foreground">/{interval === 'MONTHLY' ? 'month' : 'year'}</span>}
      </p>
      {interval === 'YEARLY' && yearlySaving > 0 && <p className="mt-1 text-xs font-medium text-success">Save {formatMoney(yearlySaving, plan.currency)} a year</p>}
      {plan.trialDays > 0 && <p className="mt-1 text-xs text-muted-foreground">{plan.trialDays}-day free trial</p>}

      <ul className="mt-4 space-y-1.5 text-sm">
        {LIMIT_KEYS.map((k) => (
          <li key={k} className="flex justify-between gap-2"><span className="text-muted-foreground">{LIMIT_TITLES[k]}</span><span className="font-medium tabular-nums">{formatLimit(k, plan.limits[k])}</span></li>
        ))}
      </ul>
      <ul className="mt-4 space-y-1.5 border-t pt-4 text-sm">
        {FEATURE_KEYS.map((k) => (
          <li key={k} className={cn('flex items-center gap-2', !plan.features[k] && 'text-muted-foreground/70')}>
            {plan.features[k] ? <Check className="h-4 w-4 shrink-0 text-success" /> : <X className="h-4 w-4 shrink-0" />}
            {FEATURE_LABELS[k]}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5">
        <Button className="w-full" variant={isCurrent ? 'outline' : action === 'Downgrade' ? 'outline' : 'default'} disabled={isCurrent || disabled} loading={busy} onClick={onChoose}>
          {isCurrent ? 'Current plan' : `${action} to ${plan.name}`}
        </Button>
      </div>
    </Card>
  );
}
