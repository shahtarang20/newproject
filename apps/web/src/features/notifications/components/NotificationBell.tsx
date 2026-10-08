import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/api/endpoints/notifications';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import type { NotificationDto } from '@/types/settings';
import { useNotificationMutations } from '../hooks';
import { notificationLink, timeAgo } from '../lib';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { markRead, markAll } = useNotificationMutations();
  const q = useQuery({
    queryKey: [...queryKeys.notifications.all, 'bell'],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const unread = q.data?.data.unreadCount ?? 0;
  const items = q.data?.data.items ?? [];

  const openItem = (n: NotificationDto) => {
    if (!n.read) markRead.mutate(n.id);
    const href = notificationLink(n);
    setOpen(false);
    if (href) navigate(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" disabled={unread === 0} loading={markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {q.isLoading && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {q.isError && <p className="p-4 text-center text-sm text-muted-foreground">Could not load notifications.</p>}
          {!q.isLoading && !q.isError && items.length === 0 && (
            <EmptyState compact icon={Bell} title="You're all caught up" description="Order and stock alerts will show up here." className="border-0 bg-transparent" />
          )}
          <ul>
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => openItem(n)} className={cn('flex w-full gap-2 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-secondary', !n.read && 'bg-accent/40')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link to="/dashboard/notifications">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
