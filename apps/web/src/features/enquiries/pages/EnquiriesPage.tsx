import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Boxes, MessageSquare } from 'lucide-react';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '@vastra/shared';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { enquiriesApi } from '@/api/endpoints/enquiries';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks';
import { formatDateTime } from '@/utils/format';
import { ENQUIRY_STATUS_LABELS } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { EnquiryDetailSheet, splitMessage } from '../components/EnquiryDetailSheet';
import { useEnquiryStats } from '../hooks';

type Tab = EnquiryStatus | 'ALL';

export default function EnquiriesPage() {
  const { can } = usePermission();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const openId = params.get('open');

  const stats = useEnquiryStats();
  const list = useQuery({
    queryKey: queryKeys.enquiries.list({ status: tab, q, page }),
    queryFn: () => enquiriesApi.list({ status: tab, q: q || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('open', id); else next.delete('open');
    setParams(next, { replace: true });
  };

  const counts = stats.data?.counts;
  const countFor = (t: Tab) => (t === 'ALL' ? stats.data?.total : counts?.[t]);

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={
          <span className="inline-flex items-center gap-2">
            Questions from shoppers about your products.
            {!!stats.data?.unreadNew && <Badge variant="info">{stats.data.unreadNew} new</Badge>}
          </span>
        }
      />
      <div className="mb-4 space-y-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setPage(1); }}>
          <div className="overflow-x-auto">
            <TabsList>
              {(['ALL', ...ENQUIRY_STATUSES] as Tab[]).map((t) => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  {t === 'ALL' ? 'All' : ENQUIRY_STATUS_LABELS[t]}
                  {countFor(t) != null && (
                    <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', t === 'NEW' && (countFor(t) ?? 0) > 0 ? 'bg-info/15 text-info' : 'bg-muted-foreground/10 text-muted-foreground')}>{countFor(t)}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <SearchInput className="sm:max-w-sm" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, phone or message" />
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !list.data?.items.length ? (
        <EmptyState icon={MessageSquare} title={q || tab !== 'ALL' ? 'No enquiries found' : 'No enquiries yet'} description={q || tab !== 'ALL' ? 'Try another status or search.' : 'When shoppers ask a question on a product page, it lands here.'} />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {list.data.items.map((e) => {
              const { question } = splitMessage(e.message);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(e.id)}
                    className={cn('flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:p-4', e.status === 'NEW' && 'border-info/30')}
                  >
                    {e.product?.imageUrl ? (
                      <img src={e.product.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg border object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Boxes className="h-5 w-5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{e.name}</p>
                        <StatusBadge type="enquiry" status={e.status} />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{question}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {e.product ? `${e.product.name} · ` : ''}{e.phone} · {formatDateTime(e.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination meta={list.data.meta} onPageChange={setPage} />
        </div>
      )}

      <EnquiryDetailSheet id={openId} onClose={() => setOpen(null)} canWrite={can('enquiries:write')} canViewCustomers={can('customers:read')} />
    </>
  );
}
