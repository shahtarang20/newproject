import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tag, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { offersApi } from '@/api/endpoints/offers';
import { queryKeys } from '@/api/queryKeys';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/utils/errors';
import { formatDate, formatMoney } from '@/utils/format';
import type { Coupon, Offer } from '@/types/commerce';
import { CouponFormDialog } from '../components/CouponFormDialog';
import { OfferFormDialog } from '../components/OfferFormDialog';
import { PROMO_STATE_LABEL, PROMO_STATE_VARIANT, describeDiscount, promoState } from '../utils';

function Row({ title, sub, meta, state, active, onToggle, onEdit, onDelete, busy, disabled }: {
  title: React.ReactNode; sub: string; meta: string; state: ReturnType<typeof promoState>; active: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; busy: boolean; disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{title}</span>
          <Badge variant={PROMO_STATE_VARIANT[state]}>{PROMO_STATE_LABEL[state]}</Badge>
        </div>
        <p className="text-sm">{sub}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Switch checked={active} disabled={busy || disabled || state === 'expired'} onCheckedChange={onToggle} aria-label="Toggle active" />
        {!disabled && (
          <div className="flex gap-1">
            <Button variant="outline" size="icon" aria-label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label="Delete" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        )}
      </div>
    </Card>
  );
}

const range = (s?: string | null, e?: string | null) =>
  s || e ? `${s ? `From ${formatDate(s)}` : ''}${s && e ? ' ' : ''}${e ? `until ${formatDate(e)}` : ''}` : 'No date limit';

export default function OffersPage() {
  const { can } = usePermission();
  const canWrite = can('offers:write');
  const qc = useQueryClient();
  const confirm = useConfirm();
  const currency = useAuthStore((s) => s.shop?.currency ?? 'INR');
  const [tab, setTab] = useState('offers');
  const [offerDlg, setOfferDlg] = useState<{ open: boolean; offer: Offer | null }>({ open: false, offer: null });
  const [couponDlg, setCouponDlg] = useState<{ open: boolean; coupon: Coupon | null }>({ open: false, coupon: null });

  const offers = useQuery({ queryKey: queryKeys.offers.list({ kind: 'offers' }), queryFn: () => offersApi.list() });
  const coupons = useQuery({ queryKey: queryKeys.offers.list({ kind: 'coupons' }), queryFn: () => offersApi.coupons() });

  const done = () => void qc.invalidateQueries({ queryKey: queryKeys.offers.all });
  const onError = (e: unknown) => toast.error(getErrorMessage(e));
  const toggleOffer = useMutation({ mutationFn: offersApi.toggle, onSuccess: done, onError });
  const toggleCoupon = useMutation({ mutationFn: offersApi.toggleCoupon, onSuccess: done, onError });
  const delOffer = useMutation({ mutationFn: offersApi.remove, onSuccess: () => { toast.success('Offer deleted'); done(); }, onError });
  const delCoupon = useMutation({ mutationFn: offersApi.removeCoupon, onSuccess: () => { toast.success('Coupon deleted'); done(); }, onError });

  const askDelete = async (what: string, run: () => void) => {
    if (await confirm({ title: `Delete ${what}?`, description: 'This cannot be undone.', confirmText: 'Delete', destructive: true })) run();
  };

  const skeleton = <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>;

  return (
    <>
      <PageHeader
        title="Offers & coupons"
        description="Automatic discounts and coupon codes for your storefront."
        actions={canWrite && (
          tab === 'offers'
            ? <Button onClick={() => setOfferDlg({ open: true, offer: null })}><Plus className="h-4 w-4" /> New offer</Button>
            : <Button onClick={() => setCouponDlg({ open: true, coupon: null })}><Plus className="h-4 w-4" /> New coupon</Button>
        )}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="space-y-3">
          {offers.isLoading ? skeleton : offers.error ? <ErrorState error={offers.error} onRetry={() => offers.refetch()} /> :
            offers.data!.items.length === 0 ? (
              <EmptyState icon={Tag} title="No offers yet" description="Create an automatic discount such as Festive 20% off."
                action={canWrite ? <Button onClick={() => setOfferDlg({ open: true, offer: null })}><Plus className="h-4 w-4" /> New offer</Button> : undefined} />
            ) : offers.data!.items.map((o) => (
              <Row key={o.id} title={o.name} state={promoState(o)} active={o.isActive} busy={toggleOffer.isPending} disabled={!canWrite}
                sub={`${describeDiscount(o.discountType, o.value, o.buyQty, o.getQty, currency)}${o.minOrderMinor ? ` on orders above ${formatMoney(o.minOrderMinor, currency)}` : ''} - ${o.scope === 'ALL' ? 'all products' : o.scope === 'PRODUCTS' ? `${o.productIds.length} product(s)` : `${o.categoryIds.length} categor${o.categoryIds.length === 1 ? 'y' : 'ies'}`}`}
                meta={range(o.startsAt, o.endsAt)}
                onToggle={() => toggleOffer.mutate(o.id)} onEdit={() => setOfferDlg({ open: true, offer: o })}
                onDelete={() => askDelete(`"${o.name}"`, () => delOffer.mutate(o.id))} />
            ))}
        </TabsContent>

        <TabsContent value="coupons" className="space-y-3">
          {coupons.isLoading ? skeleton : coupons.error ? <ErrorState error={coupons.error} onRetry={() => coupons.refetch()} /> :
            coupons.data!.items.length === 0 ? (
              <EmptyState icon={Ticket} title="No coupons yet" description="Create a code your customers can enter at checkout."
                action={canWrite ? <Button onClick={() => setCouponDlg({ open: true, coupon: null })}><Plus className="h-4 w-4" /> New coupon</Button> : undefined} />
            ) : coupons.data!.items.map((c) => (
              <Row key={c.id} title={<span className="font-mono">{c.code}</span>} state={promoState(c)} active={c.isActive} busy={toggleCoupon.isPending} disabled={!canWrite}
                sub={`${describeDiscount(c.discountType, c.value, undefined, undefined, currency)}${c.minOrderMinor ? ` on orders above ${formatMoney(c.minOrderMinor, currency)}` : ''}`}
                meta={`Used ${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''} - ${range(c.startsAt, c.endsAt)}`}
                onToggle={() => toggleCoupon.mutate(c.id)} onEdit={() => setCouponDlg({ open: true, coupon: c })}
                onDelete={() => askDelete(`coupon ${c.code}`, () => delCoupon.mutate(c.id))} />
            ))}
        </TabsContent>
      </Tabs>
      {canWrite && (
        <>
          <OfferFormDialog open={offerDlg.open} offer={offerDlg.offer} onOpenChange={(o) => setOfferDlg((s) => ({ ...s, open: o }))} />
          <CouponFormDialog open={couponDlg.open} coupon={couponDlg.coupon} onOpenChange={(o) => setCouponDlg((s) => ({ ...s, open: o }))} />
        </>
      )}
    </>
  );
}
