import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/utils/format';
import type { OrderTimelineEntry } from '@/types/commerce';

export function OrderTimeline({ entries }: { entries?: OrderTimelineEntry[] }) {
  const list = [...(entries ?? [])].reverse();
  return (
    <Card className="print:hidden">
      <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {list.map((e, i) => (
              <li key={`${e.at}-${i}`} className="relative">
                <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge type="order" status={e.status} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(e.at)}{e.byLabel ? ` · ${e.byLabel}` : ''}</span>
                </div>
                {e.note && <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
