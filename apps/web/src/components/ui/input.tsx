import * as React from 'react';
import { cn } from '@/utils/cn';

export const inputClasses =
  'flex w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(inputClasses, 'h-10 file:border-0 file:bg-transparent file:text-sm file:font-medium', className)} {...props} />
));
Input.displayName = 'Input';
