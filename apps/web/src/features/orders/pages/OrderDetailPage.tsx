import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { ordersApi } from '@/api/endpoints/orders';
import { queryKeys } from '@/api/queryKeys';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime } from '@/utils/format';
import { OrderActionBar } from '../components/OrderActionBar';
import { OrderCustomerCard } from '../components/OrderCustomerCard';
import { OrderItemsCard } from '../components/OrderItemsCard';
import { OrderNotesCard } from '../components/OrderNotesCard';
import { OrderPaymentCard } from '../components/OrderPaymentCard';
import { OrderTimeline } from '../components/OrderTimeline';
import { PackingSlip } from '../components/PackingSlip';

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { can } = usePermission();
  const shopName = useAuthStore((s) => s.shop?.name);
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
    refetchInterval: 60_000,
  });

  const back = (
    <Link to="/dashboard/orders" className="inline-flex items-center gap-1 hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" /> Orders
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  if (error || !order) {
    return (
      <>
        <PageHeader title="Order" breadcrumb={back} />
        <ErrorState error={error} title="Order not found" onRetry={() => refetch()} />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        breadcrumb={back}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge type="order" status={order.status} />
            <StatusBadge type="payment" status={order.paymentStatus} />
            <span>Placed {formatDateTime(order.createdAt)}{order.source === 'DASHBOARD' ? ' (walk-in)' : ''}</span>
          </span>
        }
        actions={<Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Packing slip</Button>}
      />
      <div className="grid gap-4 pb-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <OrderItemsCard order={order} />
          <OrderTimeline entries={order.timeline} />
        </div>
        <div className="space-y-4">
          <OrderCustomerCard order={order} />
          <OrderPaymentCard order={order} />
          <OrderNotesCard order={order} />
        </div>
      </div>
      {can('orders:write') && <OrderActionBar order={order} />}
      <PackingSlip order={order} shopName={shopName} />
    </div>
  );
}
