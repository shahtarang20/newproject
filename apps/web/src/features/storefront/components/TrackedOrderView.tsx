import type { TrackedOrder } from '@/types/storefront';
import { formatDateTime, formatMoney } from '@/utils/format';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/utils/labels';
import type { PaymentMethod, PaymentStatus } from '@vastra/shared';
import { OrderTimeline } from './OrderTimeline';
import { SfBadge } from './ui-sf';
import { humanize, statusLabel } from './lib';

export function TrackedOrderView({ order, showItems = true }: { order: TrackedOrder; showItems?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <SfBadge className="bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)]">{statusLabel(order.status)}</SfBadge>
        <SfBadge>{PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ?? humanize(order.paymentStatus)}</SfBadge>
        <SfBadge>{PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? humanize(order.paymentMethod)}</SfBadge>
        <span className="text-xs text-[color:var(--sf-muted-fg)]">Placed {formatDateTime(order.createdAt)}</span>
      </div>
      {showItems && (
        <ul className="divide-y divide-[color:var(--sf-border)] border-y border-[color:var(--sf-border)]">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex gap-3 py-3 text-sm">
              <div className="h-16 w-14 shrink-0 overflow-hidden rounded bg-[color:var(--sf-muted)]">
                {i.imageUrl && <img src={i.imageUrl} alt="" width={56} height={64} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-[color:var(--sf-muted-fg)]">{[i.colour, i.size].filter(Boolean).join(' · ')} × {i.quantity}</p>
              </div>
              <span className="font-medium">{formatMoney(i.unitPriceMinor * i.quantity, order.currency)}</span>
            </li>
          ))}
          <li className="flex justify-between py-3 font-display text-lg font-semibold">
            <span>Total</span>
            <span className="text-[color:var(--sf-primary)]">{formatMoney(order.totalMinor, order.currency)}</span>
          </li>
        </ul>
      )}
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">Order progress</h3>
        <OrderTimeline timeline={order.timeline} />
      </div>
    </div>
  );
}
