import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';
import { isLimitError } from '../utils';

/** Shows the server's *_LIMIT_REACHED / FEATURE_NOT_IN_PLAN message with an upgrade CTA. Renders nothing for other errors. */
export function LimitReachedAlert({ error, className }: { error: unknown; className?: string }) {
  if (!isLimitError(error)) return null;
  return (
    <div role="alert" className={cn('flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center', className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{error.code === 'FEATURE_NOT_IN_PLAN' ? 'Not included in your plan' : 'Plan limit reached'}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      <Button asChild size="sm">
        <Link to="/dashboard/subscription">
          <Sparkles className="h-4 w-4" /> Upgrade plan
        </Link>
      </Button>
    </div>
  );
}
