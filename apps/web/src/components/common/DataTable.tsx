import type { ReactNode } from 'react';
import type { PaginationMeta } from '@vastra/shared';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorState } from './ErrorState';
import { cn } from '@/utils/cn';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hide this column in the mobile card layout. */
  hideOnMobile?: boolean;
  /** Use as the card title on mobile (first column by default). */
  mobileTitle?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  meta?: Pick<PaginationMeta, 'page' | 'limit' | 'total' | 'totalPages'>;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  emptyIcon?: React.ComponentProps<typeof EmptyState>['icon'];
  /** Custom mobile card; defaults to a stacked label/value list. */
  mobileCard?: (row: T) => ReactNode;
  skeletonRows?: number;
  className?: string;
}

export function DataTable<T>({
  columns, data, rowKey, loading, error, onRetry, meta, onPageChange, onRowClick,
  emptyTitle = 'Nothing here yet', emptyDescription, emptyAction, emptyIcon, mobileCard, skeletonRows = 6, className,
}: DataTableProps<T>) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  const rows = data ?? [];
  const isEmpty = !loading && rows.length === 0;
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  const titleCol = columns.find((c) => c.mobileTitle) ?? columns[0];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[calc(100vh-18rem)] min-h-[8rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.headerClassName}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: skeletonRows }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      {columns.map((c) => (
                        <TableCell key={c.key}>
                          <Skeleton className="h-4 w-full max-w-[160px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow
                      key={rowKey(row)}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(onRowClick && 'cursor-pointer')}
                    >
                      {columns.map((c) => (
                        <TableCell key={c.key} className={c.className}>
                          {c.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: Math.min(skeletonRows, 4) }).map((_, i) => (
              <Card key={i} className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
              </Card>
            ))
          : rows.map((row) => (
              <Card
                key={rowKey(row)}
                className={cn('p-4', onRowClick && 'cursor-pointer active:bg-muted/50')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {mobileCard ? (
                  mobileCard(row)
                ) : (
                  <div className="space-y-2">
                    <div className="font-medium">{titleCol?.cell(row)}</div>
                    {columns
                      .filter((c) => c !== titleCol && !c.hideOnMobile)
                      .map((c) => (
                        <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{c.header}</span>
                          <span className="min-w-0 text-right">{c.cell(row)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            ))}
      </div>

      {onPageChange && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
}
