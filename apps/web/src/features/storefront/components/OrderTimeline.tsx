import { Check, Circle, XCircle } from 'lucide-react';
import type { TrackedOrder } from '@/types/storefront';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { statusLabel } from './lib';

export function OrderTimeline({ timeline }: { timeline: TrackedOrder['timeline'] }) {
  if (!timeline.length) return null;
  return (
    <ol className="relative space-y-5" aria-label="Order progress">
      {timeline.map((t, i) => {
        const last = i === timeline.length - 1;
        const bad = t.status === 'CANCELLED' || t.status === 'REJECTED';
        return (
          <li key={`${t.status}-${t.at}`} className="relative flex gap-3" aria-current={last ? 'step' : undefined}>
            {i < timeline.length - 1 && <span aria-hidden="true" className="absolute left-[11px] top-6 h-[calc(100%+0.25rem)] w-px bg-[color:var(--sf-border)]" />}
            <span
              className={cn(
                'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                bad ? 'bg-red-600 text-white' : last ? 'bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)]' : 'bg-[color:var(--sf-muted)] text-[color:var(--sf-primary)]',
              )}
            >
              {bad ? <XCircle className="h-4 w-4" aria-hidden="true" /> : last ? <Circle className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div>
              <p className={cn('text-sm', last ? 'font-semibold' : 'font-medium')}>{statusLabel(t.status)}</p>
              <p className="text-xs text-[color:var(--sf-muted-fg)]">{formatDateTime(t.at)}</p>
              {t.note && <p className="mt-0.5 text-sm text-[color:var(--sf-muted-fg)]">{t.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
