import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-soft', className)}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 7l7 12 7-12" />
      </svg>
    </span>
  );
}

export function Brand({ to = '/', collapsed, className }: { to?: string; collapsed?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 font-semibold tracking-tight', className)} aria-label="Vastra home">
      <BrandMark />
      {!collapsed && <span className="text-[17px]">Vastra</span>}
    </Link>
  );
}
