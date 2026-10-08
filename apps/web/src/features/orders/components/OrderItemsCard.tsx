import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyText } from '@/components/common/MoneyText';
import type { Order } from '@/types/commerce';
import { Thumb } from './VariantPicker';
import { variantLabel } from '../utils';

export function OrderItemsCard({ order }: { order: Order }) {
  const cur = order.currency;
  const Row = ({ label, minor, strong, negative }: { label: string; minor: number; strong?: boolean; negative?: boolean }) => (
    <div className={`flex justify-between ${strong ? 'text-base font-semibold' : 'text-sm text-muted-foreground'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'text-foreground'}>{negative && minor > 0 ? '-' : ''}<MoneyText minor={minor} currency={cur} /></span>
    </div>
  );
  return (
    <Card className="print:hidden">
      <CardHeader><CardTitle className="text-base">Items ({order.items.reduce((s, i) => s + i.qty, 0)})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {order.items.map((it) => (
            <li key={`${it.variantId}`} className="flex gap-3 py-3 first:pt-0">
              <Thumb src={it.imageUrl} size="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.name}</p>
                <p className="text-sm text-muted-foreground">{variantLabel(it.colour, it.size)}{it.sku ? ` · ${it.sku}` : ''}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {it.qty} x <MoneyText minor={it.unitPriceMinor} currency={cur} />
                  {it.mrpMinor && it.mrpMinor > it.unitPriceMinor ? <> <MoneyText minor={it.mrpMinor} currency={cur} strike /></> : null}
                </p>
              </div>
              <MoneyText minor={it.lineTotalMinor} currency={cur} className="font-medium" />
            </li>
          ))}
        </ul>
        <div className="space-y-1.5 border-t pt-3">
          <Row label="Subtotal" minor={order.subtotalMinor} />
          <Row label={order.couponCode ? `Discount (${order.couponCode})` : 'Discount'} minor={order.discountMinor} negative />
          <Row label="Shipping" minor={order.shippingMinor} />
          <Row label="Tax (included)" minor={order.taxMinor} />
          <div className="border-t pt-2"><Row label="Total" minor={order.totalMinor} strong /></div>
        </div>
      </CardContent>
    </Card>
  );
}
