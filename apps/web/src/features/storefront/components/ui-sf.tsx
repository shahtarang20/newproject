import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/errors';

/* ------------------------------------------------------------------ buttons */
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)]';

export type SfVariant = 'primary' | 'outline' | 'ghost' | 'accent' | 'link';
export type SfSize = 'sm' | 'md' | 'lg';

export function sfButtonClass(variant: SfVariant = 'primary', size: SfSize = 'md', className?: string) {
  const v: Record<SfVariant, string> = {
    primary:
      'bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)] border border-[color:var(--sf-primary)] hover:opacity-90',
    accent: 'bg-[color:var(--sf-accent)] text-[color:var(--sf-fg)] border border-[color:var(--sf-accent)] hover:opacity-90',
    outline:
      'bg-transparent text-[color:var(--sf-fg)] border border-[color:var(--sf-fg)]/40 hover:border-[color:var(--sf-primary)] hover:text-[color:var(--sf-primary)]',
    ghost: 'bg-transparent text-[color:var(--sf-fg)] border border-transparent hover:bg-[color:var(--sf-muted)]',
    link: 'bg-transparent border-0 text-[color:var(--sf-primary)] underline underline-offset-4 px-0 hover:opacity-80',
  };
  const s: Record<SfSize, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-sm sm:text-base',
  };
  return cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--sf-btn-radius,8px)] font-medium tracking-wide transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    focusRing,
    v[variant],
    variant === 'link' ? 'h-auto' : s[size],
    className,
  );
}

interface SfButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SfVariant;
  size?: SfSize;
  loading?: boolean;
}
export const SfButton = forwardRef<HTMLButtonElement, SfButtonProps>(
  ({ variant, size, loading, className, children, disabled, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={sfButtonClass(variant, size, className)} {...rest}>
      {loading && <Spin />}
      {children}
    </button>
  ),
);
SfButton.displayName = 'SfButton';

export function SfLinkButton({ variant, size, className, ...rest }: LinkProps & { variant?: SfVariant; size?: SfSize }) {
  return <Link className={sfButtonClass(variant, size, className)} {...rest} />;
}

export function Spin({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}

/* ------------------------------------------------------------------- fields */
const fieldBase =
  'w-full rounded-[var(--sf-radius,6px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] px-3 text-sm text-[color:var(--sf-fg)] placeholder:text-[color:var(--sf-muted-fg)] transition focus-visible:border-[color:var(--sf-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--sf-primary)] aria-[invalid=true]:border-red-600 disabled:opacity-60';

export const SfInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(fieldBase, 'h-11', className)} {...p} />
));
SfInput.displayName = 'SfInput';

export const SfTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-[88px] py-2.5', className)} {...p} />
));
SfTextarea.displayName = 'SfTextarea';

export const SfSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(fieldBase, 'h-11 appearance-none bg-no-repeat pr-8', className)} {...p}>
    {children}
  </select>
));
SfSelect.displayName = 'SfSelect';

export function SfField({ label, error, hint, htmlFor, children, className }: { label: string; error?: string; hint?: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-wider text-[color:var(--sf-muted-fg)]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[color:var(--sf-muted-fg)]">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hidden honeypot field — bots fill it, humans never see it. */
export const Honeypot = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label>
      Website
      <input ref={ref} type="text" tabIndex={-1} autoComplete="off" {...props} />
    </label>
  </div>
));
Honeypot.displayName = 'Honeypot';

/* ------------------------------------------------------------------ misc UI */
export function SfContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function SfSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)]', className)} />;
}

export function SfChip({ active, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm transition',
        focusRing,
        active
          ? 'border-[color:var(--sf-primary)] bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)]'
          : 'border-[color:var(--sf-border)] bg-[color:var(--sf-card)] text-[color:var(--sf-fg)] hover:border-[color:var(--sf-primary)]',
        className,
      )}
      {...p}
    >
      {children}
    </button>
  );
}

export function SfBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-[color:var(--sf-muted)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--sf-fg)]', className)}>
      {children}
    </span>
  );
}

export function SfEmpty({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--sf-radius,6px)] border border-dashed border-[color:var(--sf-border)] px-6 py-14 text-center">
      {icon && <div className="mb-3 text-[color:var(--sf-muted-fg)]">{icon}</div>}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[color:var(--sf-muted-fg)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SfError({ error, title = "We couldn't load this", message, onRetry }: { error?: unknown; title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[var(--sf-radius,6px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-muted)] px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-red-600" aria-hidden="true" />
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[color:var(--sf-muted-fg)]">{message ?? getErrorMessage(error)}</p>
      {onRetry && (
        <SfButton variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </SfButton>
      )}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 99, label = 'Quantity', size = 'md' }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label?: string; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const btn = cn('flex aspect-square items-center justify-center text-[color:var(--sf-fg)] transition hover:bg-[color:var(--sf-muted)] disabled:opacity-40', h, focusRing);
  return (
    <div role="group" aria-label={label} className="inline-flex items-center overflow-hidden rounded-[var(--sf-btn-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)]">
      <button type="button" className={btn} aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- dialog */
function useTemplateRoot() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.querySelector<HTMLElement>('[data-template]'));
  }, []);
  return el;
}

type DialogVariant = 'center' | 'bottom' | 'right';

interface SfDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  variant?: DialogVariant;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Radix dialog portalled INTO the template root so `--sf-*` tokens apply. */
export function SfDialog({ open, onOpenChange, title, description, variant = 'center', children, footer, className }: SfDialogProps) {
  const root = useTemplateRoot();
  const pos: Record<DialogVariant, string> = {
    center:
      'left-1/2 top-1/2 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--sf-radius,10px)] data-[state=open]:zoom-in-95',
    bottom: 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl data-[state=open]:slide-in-from-bottom',
    right: 'inset-y-0 right-0 h-full w-full max-w-md data-[state=open]:slide-in-from-right',
  };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={root ?? undefined}>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-[61] flex flex-col bg-[color:var(--sf-bg)] text-[color:var(--sf-fg)] shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'font-[family-name:var(--sf-font-body)]',
            pos[variant],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[color:var(--sf-border)] px-5 py-4">
            <div>
              <DialogPrimitive.Title className="font-display text-xl font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-[color:var(--sf-muted-fg)]">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close aria-label="Close" className={cn('rounded-full p-1.5 hover:bg-[color:var(--sf-muted)]', focusRing)}>
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-[color:var(--sf-border)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const sfFocusRing = focusRing;
