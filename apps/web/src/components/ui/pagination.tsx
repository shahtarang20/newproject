import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@vastra/shared';
import { Button } from './button';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

interface PaginationProps {
  meta?: Pick<PaginationMeta, 'page' | 'limit' | 'total' | 'totalPages'>;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-3 text-sm', className)}>
      <p className="text-muted-foreground">
        <span className="hidden sm:inline">Showing </span>
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(meta.total)}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted-foreground">
          {meta.page} / {Math.max(1, meta.totalPages)}
        </span>
        <Button variant="outline" size="icon-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
