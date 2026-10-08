import { MapPin, MessageCircle, Phone, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DELIVERY_TYPE_LABELS } from '@/utils/labels';
import type { Order } from '@/types/commerce';
import { orderWhatsappText, whatsappUrl } from '../utils';

export function OrderCustomerCard({ order }: { order: Order }) {
  const c = order.customerSnapshot;
  const a = order.address;
  return (
    <>
      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-muted-foreground">{c.phone}</p>
            {c.email && <p className="truncate text-sm text-muted-foreground">{c.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="lg"><a href={`tel:${c.phone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" /> Call</a></Button>
            <Button asChild variant="outline" size="lg">
              <a href={whatsappUrl(c.phone, orderWhatsappText(c.name, order.orderNumber, order.status))} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </div>
          {order.customerNote && (
            <p className="rounded-lg bg-muted p-3 text-sm"><span className="font-medium">Customer note: </span>{order.customerNote}</p>
          )}
        </CardContent>
      </Card>
      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-base">{a ? 'Delivery address' : 'Pickup'}</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {a ? (
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <address className="not-italic leading-relaxed">
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                {a.landmark ? <>{a.landmark}<br /></> : null}
                {a.city}, {a.state} {a.pincode}
              </address>
            </div>
          ) : (
            <div className="flex gap-2 text-muted-foreground">
              <Store className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{DELIVERY_TYPE_LABELS[order.deliveryType ?? 'PICKUP']} - customer collects from the shop.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
