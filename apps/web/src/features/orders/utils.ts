import type { OrderStatus } from '@vastra/shared';
import { ORDER_STATUS_LABELS } from '@/utils/labels';

export interface StatusAction {
  label: string;
  /** Rejecting / cancelling restores stock and cannot be undone. */
  destructive: boolean;
  /** Primary = main forward step. */
  primary: boolean;
}

export const STATUS_ACTIONS: Record<OrderStatus, StatusAction> = {
  PENDING: { label: 'Back to pending', destructive: false, primary: false },
  CONFIRMED: { label: 'Confirm order', destructive: false, primary: true },
  PROCESSING: { label: 'Start processing', destructive: false, primary: true },
  READY_FOR_PICKUP: { label: 'Mark ready', destructive: false, primary: true },
  SHIPPED: { label: 'Ship', destructive: false, primary: true },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', destructive: false, primary: false },
  DELIVERED: { label: 'Mark delivered', destructive: false, primary: true },
  CANCELLED: { label: 'Cancel order', destructive: true, primary: false },
  REJECTED: { label: 'Reject', destructive: true, primary: false },
};

export const isStockRestoring = (s: OrderStatus): boolean => s === 'CANCELLED' || s === 'REJECTED';

export interface OrderTab { key: string; label: string; statuses: OrderStatus[] }
export const ORDER_TABS: OrderTab[] = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'pending', label: 'Pending', statuses: ['PENDING'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['CONFIRMED'] },
  { key: 'processing', label: 'Processing', statuses: ['PROCESSING'] },
  { key: 'ready', label: 'Ready', statuses: ['READY_FOR_PICKUP'] },
  { key: 'shipped', label: 'Shipped', statuses: ['SHIPPED', 'OUT_FOR_DELIVERY'] },
  { key: 'delivered', label: 'Delivered', statuses: ['DELIVERED'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED', 'REJECTED'] },
];

/** Digits only, assume India (+91) for bare 10 digit numbers. */
export function waDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function orderWhatsappText(name: string, orderNumber: string, status: OrderStatus): string {
  return `Hello ${name}, your order ${orderNumber} is ${ORDER_STATUS_LABELS[status].toLowerCase()}. Thank you for shopping with us!`;
}

export function variantLabel(colour?: unknown, size?: string | null): string {
  const c = typeof colour === 'string' ? colour : colour && typeof colour === 'object' ? (colour as { name?: string }).name : undefined;
  return [c, size].filter(Boolean).join(' / ') || 'Default';
}

/** "5 min ago" style relative time. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
