import { useState } from 'react';
import { ChevronDown, ScrollText } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditLogEntry, LogsQuery } from '@/types/admin';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { JsonDiff } from '../components/JsonDiff';
import { useAdminLogs } from '../hooks/useAdmin';

const OID = /^[a-f\d]{24}$/i;
type Filters = { shopId: string; userId: string; action: string; entity: string; from: string; to: string };
const EMPTY: Filters = { shopId: '', userId: '', action: '', entity: '', from: '', to: '' };

function LogRow({ log, onFilter }: { log: AuditLogEntry; onFilter: (patch: Partial<Filters>) => void }) {
  const [open, setOpen] = useState(false);
  const hasDetail = log.before != null || log.after != null || log.meta != null;
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')} />
        <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center sm:gap-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-medium">{log.action}</p>
            <p className="truncate text-xs text-muted-foreground">
              {log.entity}
              {log.entityId ? ` · ${log.entityId}` : ''}
            </p>
          </div>
          <p className="truncate text-sm">{log.user ? log.user.name : <span className="text-muted-foreground">System</span>}</p>
          <p className="truncate text-sm text-muted-foreground">{log.shop?.name ?? '—'}</p>
          <p className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {log.user && (
              <Button variant="outline" size="sm" onClick={() => onFilter({ userId: log.user!.id })}>
                Filter by user {log.user.email}
              </Button>
            )}
            {log.shop && (
              <Button variant="outline" size="sm" onClick={() => onFilter({ shopId: log.shop!.id })}>
                Filter by shop {log.shop.name}
              </Button>
            )}
            {log.ip && <Badge variant="neutral">IP {log.ip}</Badge>}
          </div>
          {hasDetail ? (
            <>
              <JsonDiff before={log.before} after={log.after} />
              {log.meta != null && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Meta</summary>
                  <pre className="mt-1 overflow-x-auto rounded-lg border bg-background p-3">{JSON.stringify(log.meta, null, 2)}</pre>
                </details>
              )}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Raw JSON</summary>
                <pre className="mt-1 max-h-72 overflow-auto rounded-lg border bg-background p-3">{JSON.stringify({ before: log.before, after: log.after }, null, 2)}</pre>
              </details>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No payload recorded for this event.</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function LogsPage() {
  const [f, setF] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const idError = (v: string) => (v && !OID.test(v) ? 'Enter a 24-character id' : undefined);
  const query: LogsQuery = {
    page,
    limit: 25,
    shopId: OID.test(f.shopId) ? f.shopId : undefined,
    userId: OID.test(f.userId) ? f.userId : undefined,
    action: f.action.trim() || undefined,
    entity: f.entity.trim() || undefined,
    from: f.from ? new Date(`${f.from}T00:00:00`).toISOString() : undefined,
    to: f.to ? new Date(`${f.to}T23:59:59.999`).toISOString() : undefined,
  };
  const logs = useAdminLogs(query);
  const set = (patch: Partial<Filters>) => {
    setF((p) => ({ ...p, ...patch }));
    setPage(1);
  };
  const active = Object.values(f).some(Boolean);

  const text = (key: keyof Filters, label: string, ph: string, err?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`log-${key}`}>{label}</Label>
      <Input id={`log-${key}`} value={f[key]} onChange={(e) => set({ [key]: e.target.value })} placeholder={ph} aria-invalid={!!err} />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );

  return (
    <>
      <PageHeader title="Audit logs" description="Every administrative and security-relevant action on the platform." />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {text('action', 'Action (prefix)', 'e.g. admin.shop')}
          {text('entity', 'Entity', 'e.g. Shop, Plan')}
          {text('shopId', 'Shop id', '24-char id', idError(f.shopId))}
          {text('userId', 'User id', '24-char id', idError(f.userId))}
          <div className="space-y-1.5">
            <Label htmlFor="log-from">From</Label>
            <Input id="log-from" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-to">To</Label>
            <Input id="log-to" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </div>
        </div>
        {active && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => { setF(EMPTY); setPage(1); }}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {logs.isError ? (
        <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
      ) : logs.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : !logs.data?.items.length ? (
        <EmptyState icon={ScrollText} title="No log entries" description="Nothing matches these filters." />
      ) : (
        <div className="space-y-3">
          {logs.data.items.map((l) => (
            <LogRow key={l.id} log={l} onFilter={set} />
          ))}
          <Pagination meta={logs.data.meta} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}
