import type { Order } from '@/types/commerce';
import { formatDateTime, formatMoney } from '@/utils/format';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/utils/labels';
import { variantLabel } from '../utils';

// TODO(gst-invoice): this is an internal packing slip only, NOT a GST tax invoice (no GSTIN, HSN, tax split).
const PRINT_CSS = `
.packing-slip{display:none}
@media print{
  body *{visibility:hidden}
  .packing-slip,.packing-slip *{visibility:visible}
  .packing-slip{display:block;position:absolute;left:0;top:0;width:100%;padding:24px;color:#000;background:#fff;font-size:12px}
  .packing-slip table{width:100%;border-collapse:collapse;margin-top:12px}
  .packing-slip th,.packing-slip td{border-bottom:1px solid #999;padding:6px 4px;text-align:left}
  .packing-slip .num{text-align:right}
}`;

/** Hidden on screen; shown by window.print() with print CSS. */
export function PackingSlip({ order, shopName }: { order: Order; shopName?: string }) {
  const a = order.address;
  return (
    <div className="packing-slip" aria-hidden>
      <style>{PRINT_CSS}</style>
      <h1 style={{ fontSize: 20, margin: 0 }}>{shopName ?? 'Packing slip'}</h1>
      <p style={{ margin: '2px 0 12px' }}>Packing slip - {order.orderNumber} - {formatDateTime(order.createdAt)}</p>
      <p><strong>{order.customerSnapshot.name}</strong> - {order.customerSnapshot.phone}</p>
      <p>{a ? `${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city}, ${a.state} ${a.pincode}` : 'Store pickup'}</p>
      <p>Status: {ORDER_STATUS_LABELS[order.status]} - Payment: {PAYMENT_METHOD_LABELS[order.paymentMethod]} ({PAYMENT_STATUS_LABELS[order.paymentStatus]})</p>
      <table>
        <thead><tr><th>Item</th><th>Variant</th><th>SKU</th><th className="num">Qty</th></tr></thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.variantId}><td>{i.name}</td><td>{variantLabel(i.colour, i.size)}</td><td>{i.sku ?? ''}</td><td className="num">{i.qty}</td></tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 12 }}>Order total: <strong>{formatMoney(order.totalMinor, order.currency)}</strong>{order.paymentStatus === 'COD' ? ' (collect on delivery)' : ''}</p>
      {(order.customerNote || order.internalNote) && <p>Notes: {[order.customerNote, order.internalNote].filter(Boolean).join(' | ')}</p>}
    </div>
  );
}
