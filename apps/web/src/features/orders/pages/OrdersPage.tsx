import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { PAYMENT_STATUSES, type PaymentStatus } from '@vastra/shared';
import { ordersApi } from '@/api/endpoints/orders';
import { queryKeys } from '@/api/queryKeys';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { PAYMENT_STATUS_LABELS } from '@/utils/labels';
import { formatDateTime } from '@/utils/format';
import type { Order } from '@/types/commerce';
import { CreateOrderDialog } from '../components/CreateOrderDialog';
import { QuickActions } from '../components/QuickActions';
import { ORDER_STATS_KEY } from '../hooks';
import { ORDER_TABS, timeAgo } from '../utils';

const POLL_MS = 30_000;
const PAGE_SIZE = 20;

export default function OrdersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = usePermission();
  const currency = useAuthStore((s) => s.shop?.currency ?? 'INR');
  const [params, setParams] = useSearchParams();
  const tabKey = ORDER_TABS.some((t) => t.key === params.get('tab')) ? params.get('tab')! : 'all';
  const tab = ORDER_TABS.find((t) => t.key === tabKey)!;

  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const query = useMemo(
    () => ({
      status: tab.statuses.length ? tab.statuses.join(',') : undefined,
      paymentStatus: payment === 'all' ? undefined : payment,
      search: search || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [tab, payment, search, from, to, page],
  );

  const orders = useQuery({
    queryKey: queryKeys.orders.list(query),
    queryFn: () => ordersApi.list(query),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
  const stats = useQuery({ queryKey: ORDER_STATS_KEY, queryFn: ordersApi.stats, refetchInterval: POLL_MS });

  // Subtle new-order indicator: compare the polled total with the last seen total.
  const lastTotal = useRef<number | null>(null);
  useEffect(() => {
    const total = stats.data?.total;
    if (total == null) return;
    if (lastTotal.current != null && total > lastTotal.current) {
      const diff = total - lastTotal.current;
      setNewCount((c) => c + diff);
      toast.info(diff === 1 ? 'New order received' : `${diff} new orders received`);
      void qc.invalidateQueries({ queryKey: ['orders', 'list'] });
    }
    lastTotal.current = total;
  }, [stats.data?.total, qc]);

  const countFor = (statuses: string[]): number | undefined => {
    if (!stats.data) return undefined;
    return statuses.length ? statuses.reduce((s, k) => s + (stats.data!.byStatus[k as keyof typeof stats.data.byStatus] ?? 0), 0) : stats.data.total;
  };

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const columns: DataTableColumn<Order>[] = [
    { key: 'no', header: 'Order', mobileTitle: true, cell: (o) => <span className="font-medium">{o.orderNumber}</span> },
    {
      key: 'customer', header: 'Customer',
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{o.customerSnapshot.name}</p>
          <p className="text-xs text-muted-foreground">{o.customerSnapshot.phone}</p>
        </div>
      ),
    },
    { key: 'items', header: 'Items', cell: (o) => o.items?.reduce((s, i) => s + i.qty, 0) ?? 0 },
    { key: 'total', header: 'Total', cell: (o) => <MoneyText minor={o.totalMinor} currency={o.currency || currency} className="font-medium" /> },
    { key: 'payment', header: 'Payment', cell: (o) => <StatusBadge type="payment" status={o.paymentStatus} /> },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge type="order" status={o.status} /> },
    { key: 'time', header: 'Placed', cell: (o) => <span className="whitespace-nowrap text-muted-foreground" title={formatDateTime(o.createdAt)}>{timeAgo(o.createdAt)}</span> },
    { key: 'actions', header: '', className: 'w-px', cell: (o) => <QuickActions order={o} /> },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          stats.data ? `${stats.data.today.orders} order${stats.data.today.orders === 1 ? '' : 's'} today` : 'Manage and fulfil customer orders'
        }
        actions={
          <>
            {newCount > 0 && (
              <Button variant="soft" size="sm" onClick={() => { setNewCount(0); setPage(1); void orders.refetch(); }}>
                <BellRing className="h-4 w-4" /> {newCount} new
              </Button>
            )}
            {can('orders:create') && (
              <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New order</Button>
            )}
          </>
        }
      />

      <Tabs value={tabKey} onValueChange={(v) => { setParams(v === 'all' ? {} : { tab: v }, { replace: true }); setPage(1); }}>
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            {ORDER_TABS.map((t) => {
              const n = countFor(t.statuses);
              return (
                <TabsTrigger key={t.key} value={t.key} className="min-h-8 gap-1.5">
                  {t.label}
                  {n != null && n > 0 && (
                    <Badge variant={t.key === 'pending' ? 'warning' : 'neutral'} className="px-1.5 py-0 text-[10px]">{n}</Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      <div className="my-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_150px_150px]">
        <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Order no., customer name or phone" className="sm:col-span-2 lg:col-span-1" />
        <Select value={payment} onValueChange={(v) => { setPayment(v as 'all' | PaymentStatus); setPage(1); }}>
          <SelectTrigger aria-label="Payment status"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
        <Input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
      </div>

      <DataTable
        columns={columns}
        data={orders.data?.items}
        rowKey={(o) => o.id}
        loading={orders.isLoading}
        error={orders.error}
        onRetry={() => orders.refetch()}
        meta={orders.data?.meta}
        onPageChange={setPage}
        onRowClick={(o) => navigate(`/dashboard/orders/${o.id}`)}
        emptyIcon={ShoppingBag}
        emptyTitle="No orders found"
        emptyDescription={search || from || to || payment !== 'all' || tab.statuses.length ? 'Try changing your filters.' : 'New orders from your storefront will appear here.'}
        emptyAction={can('orders:create') ? <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create walk-in order</Button> : undefined}
        mobileCard={(o) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="truncate text-sm">{o.customerSnapshot.name}</p>
                <p className="text-xs text-muted-foreground">{o.customerSnapshot.phone}</p>
              </div>
              <div className="shrink-0 text-right">
                <MoneyText minor={o.totalMinor} currency={o.currency || currency} className="text-base font-semibold" />
                <p className="text-xs text-muted-foreground">{o.items?.reduce((s, i) => s + i.qty, 0) ?? 0} item(s) · {timeAgo(o.createdAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge type="order" status={o.status} />
              <StatusBadge type="payment" status={o.paymentStatus} />
            </div>
            <QuickActions order={o} large />
          </div>
        )}
      />

      {can('orders:create') && (
        <CreateOrderDialog open={creating} onOpenChange={setCreating} currency={currency} onCreated={(id) => navigate(`/dashboard/orders/${id}`)} />
      )}
    </>
  );
}
