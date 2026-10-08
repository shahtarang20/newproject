import { lazy, Suspense, type ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function PageFallback() {
  return (
    <div className="space-y-4 p-1" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** `element: lazyPage(() => import('@/features/x/pages/XPage'))` — code-split + Suspense fallback. */
export function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(loader);
  return (
    <Suspense fallback={<PageFallback />}>
      <Page />
    </Suspense>
  );
}
