import { useState } from 'react';
import { Copy, Layers, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { LIMIT_KEYS } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/utils/format';
import type { AdminPlan } from '@/types/admin';
import { FEATURE_KEYS } from '@vastra/shared';
import { useAdminMutation, useAdminPlans } from '../hooks/useAdmin';
import { FEATURE_TITLES, LIMIT_TITLES, formatLimitValue } from '../components/AdminBits';
import { PlanFormDialog } from '../components/PlanFormDialog';

export default function PlansPage() {
  const plans = useAdminPlans();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit' | 'duplicate'; plan?: AdminPlan } | null>(null);

  const remove = useAdminMutation((p: AdminPlan) => adminApi.deletePlan(p.id), {
    success: (r) => `Plan deactivated${r.shopCount ? ` (${r.shopCount} shop${r.shopCount === 1 ? '' : 's'} keep it until moved)` : ''}`,
  });
  const toggleActive = useAdminMutation((p: AdminPlan) => adminApi.updatePlan(p.id, { isActive: !p.isActive }), { success: 'Plan updated' });

  const onDeactivate = async (p: AdminPlan) => {
    const ok = await confirm({
      title: `Deactivate ${p.name}?`,
      description: `The plan is soft-deleted and hidden from shops. ${p.shopCount} shop(s) currently on it keep their limits. You can reactivate it later.`,
      confirmText: 'Deactivate',
      destructive: true,
    });
    if (ok) remove.mutate(p);
  };

  const sorted = [...(plans.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Plans"
        description="Pricing, limits and features. Edits apply instantly to every shop on the plan, with no deploy."
        actions={
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <Plus className="h-4 w-4" /> New plan
          </Button>
        }
      />

      {plans.isError ? (
        <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
      ) : plans.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Layers} title="No plans yet" description="Create your first subscription plan." action={<Button onClick={() => setDialog({ mode: 'create' })}>New plan</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => (
            <Card key={p.id} className={`flex flex-col p-5 ${p.isActive ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-lg font-semibold tracking-tight">{p.name}</h3>
                    {p.isDefault && <Badge variant="soft">Default</Badge>}
                    {!p.isActive && <Badge variant="neutral">Inactive</Badge>}
                    {!p.isPublic && <Badge variant="outline">Hidden</Badge>}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog({ mode: 'edit', plan: p })}>
                      <Pencil className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog({ mode: 'duplicate', plan: p })}>
                      <Copy className="h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    {!p.isDefault && (
                      <>
                        <DropdownMenuSeparator />
                        {p.isActive ? (
                          <DropdownMenuItem className="text-destructive" onSelect={() => void onDeactivate(p)}>
                            <Trash2 className="h-4 w-4" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => toggleActive.mutate(p)}>Reactivate</DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}

              <div className="mt-4 flex items-end gap-4">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{formatMoney(p.priceMinor.MONTHLY, p.currency)}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
                <div>
                  <p className="text-sm font-medium tabular-nums">{formatMoney(p.priceMinor.YEARLY, p.currency)}</p>
                  <p className="text-xs text-muted-foreground">per year</p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {LIMIT_KEYS.map((k) => (
                  <div key={k} className="flex items-baseline justify-between gap-2">
                    <dt className="truncate text-muted-foreground">{LIMIT_TITLES[k]}</dt>
                    <dd className="font-medium tabular-nums">{formatLimitValue(k, p.limits[k])}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {FEATURE_KEYS.filter((k) => p.features[k]).map((k) => (
                  <Badge key={k} variant="success">
                    {FEATURE_TITLES[k]?.title ?? k}
                  </Badge>
                ))}
                {FEATURE_KEYS.every((k) => !p.features[k]) && <span className="text-xs text-muted-foreground">No premium features</span>}
              </div>

              <div className="mt-auto flex items-center justify-between border-t pt-4 text-sm">
                <span className="text-muted-foreground">
                  {p.shopCount} shop{p.shopCount === 1 ? '' : 's'}
                </span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Public
                  <Switch checked={p.isPublic} disabled aria-label="Public plan" />
                </label>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PlanFormDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} plan={dialog?.plan} mode={dialog?.mode ?? 'create'} />
    </>
  );
}
