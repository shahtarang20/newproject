import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface Props {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ id, title, description, children, className }: Props) {
  return (
    <Card id={id} className={cn('scroll-mt-24 p-5 sm:p-6', className)}>
      <div className="mb-5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

/** Label + switch + helper row. */
export function ToggleRow({
  title, description, children, className,
}: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 rounded-xl border p-4', className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
