import type { EnquiryStatus, OrderStatus, PaymentStatus, ProductStatus, SubscriptionStatus, ShopStatus } from '@vastra/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  ENQUIRY_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PRODUCT_STATUS_LABELS,
  SHOP_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS,
} from '@/utils/labels';

type Variant = NonNullable<BadgeProps['variant']>;
type Entry = { label: string; variant: Variant };

const ORDER: Record<OrderStatus, Variant> = {
  PENDING: 'warning', CONFIRMED: 'info', PROCESSING: 'info', READY_FOR_PICKUP: 'soft', SHIPPED: 'soft',
  OUT_FOR_DELIVERY: 'soft', DELIVERED: 'success', CANCELLED: 'neutral', REJECTED: 'destructive',
};
const PAYMENT: Record<PaymentStatus, Variant> = { PENDING: 'warning', PAID: 'success', FAILED: 'destructive', REFUNDED: 'neutral', COD: 'info' };
const PRODUCT: Record<ProductStatus, Variant> = { DRAFT: 'neutral', ACTIVE: 'success', OUT_OF_STOCK: 'warning', ARCHIVED: 'neutral' };
const ENQUIRY: Record<EnquiryStatus, Variant> = { NEW: 'info', IN_PROGRESS: 'warning', RESPONDED: 'success', CLOSED: 'neutral' };
const SUBSCRIPTION: Record<SubscriptionStatus, Variant> = { TRIALING: 'info', ACTIVE: 'success', PAST_DUE: 'warning', CANCELLED: 'neutral', EXPIRED: 'destructive' };
const SHOP: Record<ShopStatus, Variant> = { ACTIVE: 'success', SUSPENDED: 'destructive', PENDING: 'warning' };

export type StatusBadgeProps =
  | { type: 'order'; status: OrderStatus }
  | { type: 'payment'; status: PaymentStatus }
  | { type: 'product'; status: ProductStatus }
  | { type: 'enquiry'; status: EnquiryStatus }
  | { type: 'subscription'; status: SubscriptionStatus }
  | { type: 'shop'; status: ShopStatus };

function resolve(p: StatusBadgeProps): Entry {
  switch (p.type) {
    case 'order': return { label: ORDER_STATUS_LABELS[p.status], variant: ORDER[p.status] };
    case 'payment': return { label: PAYMENT_STATUS_LABELS[p.status], variant: PAYMENT[p.status] };
    case 'product': return { label: PRODUCT_STATUS_LABELS[p.status], variant: PRODUCT[p.status] };
    case 'enquiry': return { label: ENQUIRY_STATUS_LABELS[p.status], variant: ENQUIRY[p.status] };
    case 'subscription': return { label: SUBSCRIPTION_STATUS_LABELS[p.status], variant: SUBSCRIPTION[p.status] };
    case 'shop': return { label: SHOP_STATUS_LABELS[p.status], variant: SHOP[p.status] };
  }
}

export function StatusBadge(props: StatusBadgeProps & { className?: string }) {
  const { className, ...rest } = props;
  const e = resolve(rest as StatusBadgeProps) ?? { label: String((rest as { status: string }).status), variant: 'neutral' as Variant };
  return (
    <Badge variant={e.variant} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {e.label}
    </Badge>
  );
}
