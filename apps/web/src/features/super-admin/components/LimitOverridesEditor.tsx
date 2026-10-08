import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { LIMIT_KEYS, type LimitKey } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AdminShopDetail, ShopLimitsPayload } from '@/types/admin';
import { useAdminMutation, useAdminPlans } from '../hooks/useAdmin';
import { LIMIT_TITLES, formatLimitValue } from './AdminBits';
import { LimitField } from './LimitField';

type Draft = Partial<Record<LimitKey, number | null>>;

/** Per-shop limit overrides: effective vs plan values, apply instantly (no deploy). */
export function LimitOverridesEditor({ detail }: { detail: AdminShopDetail }) {
  const plans = useAdminPlans();
  const sub = detail.subscription;
  const plan = plans.data?.find((p) => p.id === sub?.plan?.id);
  const saved: Draft = sub?.limitOverrides ?? {};
  const [draft, setDraft] = useState<Draft>(saved);
  // bump to remount LimitFields after an external reset
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setDraft(sub?.limitOverrides ?? {});
    setRev((r) => r + 1);
  }, [sub?.limitOverrides, detail.shop.id]);

  const save = useAdminMutation((payload: ShopLimitsPayload) => adminApi.setShopLimits(detail.shop.id, payload), { success: 'Limits updated. Applied instantly.' });

  if (!sub) {
    return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">This shop has no subscription yet. Assign a plan before setting limit overrides.</p>;
  }

  const has = (k: LimitKey) => draft[k] !== undefined;
  const dirty = LIMIT_KEYS.some((k) => draft[k] !== saved[k]);

  const submit = () => {
    const limitOverrides: Draft = {};
    const clearOverrides: LimitKey[] = [];
    for (const k of LIMIT_KEYS) {
      if (draft[k] !== undefined) {
        if (draft[k] !== saved[k]) limitOverrides[k] = draft[k];
      } else if (saved[k] !== undefined) clearOverrides.push(k);
    }
    save.mutate({ ...(Object.keys(limitOverrides).length ? { limitOverrides } : {}), ...(clearOverrides.length ? { clearOverrides } : {}) });
  };

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_6rem_6rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
        <span>Limit</span>
        <span className="text-right">Plan</span>
        <span className="text-right">Effective</span>
      </div>
      <ul className="divide-y rounded-xl border">
        {LIMIT_KEYS.map((k) => {
          const planVal = plan ? plan.limits[k] : undefined;
          const effective = has(k) ? draft[k] : (planVal ?? detail.limits[k]);
          const overridden = has(k);
          return (
            <li key={k} className="space-y-2 p-3">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:grid-cols-[1fr_6rem_6rem]">
                <div className="flex min-w-0 items-center gap-2">
                  <Switch
                    checked={overridden}
                    onCheckedChange={(on) => {
                      setDraft((d) => {
                        const n = { ...d };
                        if (on) n[k] = detail.limits[k];
                        else delete n[k];
                        return n;
                      });
                      setRev((r) => r + 1);
                    }}
                    aria-label={`Override ${LIMIT_TITLES[k]}`}
                  />
                  <span className="truncate text-sm font-medium">{LIMIT_TITLES[k]}</span>
                  {overridden && <Badge variant="info">Override</Badge>}
                </div>
                <span className="text-right text-sm tabular-nums text-muted-foreground">{plan ? formatLimitValue(k, planVal) : '…'}</span>
                <span className={`text-right text-sm font-medium tabular-nums ${overridden ? 'text-info' : ''}`}>{formatLimitValue(k, effective ?? null)}</span>
              </div>
              {overridden && (
                <div className="pl-12">
                  <LimitField key={`${k}-${rev}`} limitKey={k} value={draft[k] ?? null} hideLabel onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Overrides take priority over the plan and apply immediately.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!dirty}
            onClick={() => {
              setDraft(saved);
              setRev((r) => r + 1);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Discard
          </Button>
          <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={submit}>
            Save overrides
          </Button>
        </div>
      </div>
    </div>
  );
}
