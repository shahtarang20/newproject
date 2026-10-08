import { BrandMark } from '@/layouts/Brand';

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="h-12 w-12 animate-pulse rounded-2xl" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-primary" style={{ transformOrigin: 'left' }} />
        </div>
      </div>
    </div>
  );
}
