import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/api/endpoints/notifications';
import { queryKeys } from '@/api/queryKeys';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/utils/format';
import { pageTitle } from '@/utils/seo';
import { cn } from '@/utils/cn';
import { useNotificationMutations } from '../hooks';
import { notificationLink } from '../lib';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { markRead, markAll } = useNotificationMutations();
  const params = { page, limit: 20, ...(filter === 'unread' ? { unread: true } : {}) };
  const q = useQuery({ queryKey: [...queryKeys.notifications.all, 'list', params], queryFn: () => notificationsApi.list(params), placeholderData: (prev) => prev });
  const items = q.data?.data.items ?? [];
  const unread = q.data?.data.unreadCount ?? 0;
  const meta = q.data?.meta;

  return (
    <>
      <Helmet><title>{pageTitle('Notifications')}</title></Helmet>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : 'Everything is read'}
        actions={<Button variant="outline" size="sm" disabled={unread === 0} loading={markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      />
      <Tabs value={filter} onValueChange={(v) => { setFilter(v as 'all' | 'unread'); setPage(1); }} className="mb-4">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList>
      </Tabs>
      {q.isLoading && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {!q.isLoading && !q.isError && items.length === 0 && <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="Order, enquiry and stock alerts will appear here." />}
      {items.length > 0 && (
        <Card className="divide-y overflow-hidden">
          {items.map((n) => {
            const href = notificationLink(n);
            return (
              <div key={n.id} className={cn('flex items-start gap-3 p-4', !n.read && 'bg-accent/40')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-muted' : 'bg-primary')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  {href && <Button asChild size="sm" variant="outline" onClick={() => !n.read && markRead.mutate(n.id)}><Link to={href}>View</Link></Button>}
                  {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Mark read</Button>}
                </div>
              </div>
            );
          })}
        </Card>
      )}
      {meta && meta.totalPages > 1 && <Pagination className="mt-4" meta={meta} onPageChange={setPage} />}
    </>
  );
}
