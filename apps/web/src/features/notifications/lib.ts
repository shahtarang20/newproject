import type { NotificationDto } from '@/types/settings';

/** Dashboard route a notification should open. */
export function notificationLink(n: Pick<NotificationDto, 'type' | 'data'>): string | null {
  const orderId = typeof n.data?.orderId === 'string' ? n.data.orderId : undefined;
  switch (n.type) {
    case 'ORDER_NEW': case 'ORDER_PLACED': case 'ORDER_CONFIRMED': case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED': case 'ORDER_CANCELLED': case 'PAYMENT_RECEIVED':
      return orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders';
    case 'ENQUIRY_NEW': return '/dashboard/enquiries';
    case 'LOW_STOCK': case 'OUT_OF_STOCK': return '/dashboard/inventory';
    case 'LIMIT_WARNING': return '/dashboard/subscription';
    default: return null;
  }
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
