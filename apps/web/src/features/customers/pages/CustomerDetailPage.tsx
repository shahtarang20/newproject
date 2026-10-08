import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Boxes, MessageCircle, Pencil, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/common/ErrorState';
import { MoneyText } from '@/components/common/MoneyText';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { customersApi } from '@/api/endpoints/customers';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks';
import { formatDate, formatDateTime, formatNumber } from '@/utils/format';
import { PAYMENT_METHOD_LABELS, labelOf } from '@/utils/labels';
import type { CustomerProductStat } from '@/types/insights';
import { CustomerFormDialog } from '../components/CustomerFormDialog';
import { telLink, waLink } from '../components/contact';

export default function CustomerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { can } = usePermission();
  const [editOpen, setEditOpen] = useState(false);
  const q = useQuery({ queryKey: queryKeys.customers.detail(id), queryFn: () => customersApi.get(id), enabled: !!id });

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
      <Link to="/dashboard/customers"><ArrowLeft className="h-4 w-4" /> Customers</Link>
    </Button>
  );

  if (q.isLoading) {
    return (
      <>
        {back}
        <Skeleton className="mb-4 h-24 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </>
    );
  }
  if (q.isError || !q.data) {
    return <>{back}<ErrorState error={q.error} onRetry={() => q.refetch()} title="Customer not found" /></>;
  }

  const { customer: c, orderStats: st } = q.data;
  const favourites = q.data.favouriteProducts;

  return (
    <div className="space-y-6">
      <div>
        {back}
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar className="h-14 w-14"><AvatarFallback className="text-base">{initials(c.name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{c.name}</h1>
              {c.isBlocked && <Badge variant="destructive">Blocked</Badge>}
              {c.hasAccount && <Badge variant="soft">Has account</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="tabular-nums">{c.phone}</span>{c.email && <> · {c.email}</>} · Customer since {formatDate(c.createdAt)}
            </p>
            {c.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{c.tags.map((t) => <Badge key={t} variant="neutral">{t}</Badge>)}</div>
            )}
            {c.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{c.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp</a>
            </Button>
            <Button asChild size="sm" variant="outline"><a href={telLink(c.phone)}><Phone className="h-4 w-4" /> Call</a></Button>
            {can('customers:write') && <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
          </div>
        </Card>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Customer stats">
        <StatCard label="Orders" value={formatNumber(st.ordersCount)} />
        <StatCard label="Total spent" value={<MoneyText minor={st.totalSpentMinor} />} />
        <StatCard label="Average order" value={<MoneyText minor={st.averageOrderMinor} />} />
        <StatCard label="Last order" value={st.lastOrderAt ? formatDate(st.lastOrderAt) : '—'} />
      </section>

      <Tabs defaultValue="orders">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="orders">Orders ({q.data.recentOrders.length})</TabsTrigger>
            <TabsTrigger value="enquiries">Enquiries ({q.data.enquiries.length})</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="addresses">Addresses ({q.data.addresses.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders">
          {q.data.recentOrders.length === 0 ? <EmptyState compact title="No orders yet" /> : (
            <Card className="divide-y">
              {q.data.recentOrders.map((o) => (
                <Link key={o.id} to={`/dashboard/orders/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">#{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {labelOf(PAYMENT_METHOD_LABELS, o.paymentMethod)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MoneyText minor={o.totalMinor} currency={o.currency} className="text-sm font-medium" />
                    <StatusBadge type="order" status={o.status} />
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enquiries">
          {q.data.enquiries.length === 0 ? <EmptyState compact title="No enquiries" /> : (
            <Card className="divide-y">
              {q.data.enquiries.map((e) => (
                <Link key={e.id} to={`/dashboard/enquiries?open=${e.id}`} className="flex items-start gap-3 p-4 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{e.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                  </div>
                  <StatusBadge type="enquiry" status={e.status} />
                </Link>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {favourites.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">Favourites (bought 2+ times)</h2>
              <ProductList items={favourites} />
            </div>
          )}
          <div>
            <h2 className="mb-2 text-sm font-semibold">Purchased products</h2>
            {q.data.purchasedProducts.length === 0 ? <EmptyState compact title="Nothing purchased yet" /> : <ProductList items={q.data.purchasedProducts} />}
          </div>
        </TabsContent>

        <TabsContent value="addresses">
          {q.data.addresses.length === 0 ? <EmptyState compact title="No addresses on file" /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {q.data.addresses.map((a, i) => (
                <Card key={a.id ?? i} className="p-4 text-sm">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-medium">{a.label ?? a.name}</span>
                    {a.isDefault && <Badge variant="soft">Default</Badge>}
                    <Badge variant="neutral" className="ml-auto">{a.source === 'SAVED' ? 'Saved' : 'From order'}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}<br />
                    {a.city}, {a.state} {a.pincode}<br />{a.country}<br />
                    <span className="tabular-nums">{a.phone}</span>
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={c} />
    </div>
  );
}

function ProductList({ items }: { items: CustomerProductStat[] }) {
  return (
    <Card className="divide-y">
      {items.map((p) => (
        <div key={p.productId} className="flex items-center gap-3 p-3">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" loading="lazy" className="h-10 w-10 rounded-lg border object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Boxes className="h-4 w-4" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(p.quantity)} pcs · {formatNumber(p.ordersCount)} orders · last {formatDate(p.lastPurchasedAt)}</p>
          </div>
          <MoneyText minor={p.spentMinor} className="text-sm font-medium" />
        </div>
      ))}
    </Card>
  );
}
