import * as React from 'react';
import { cn } from '@/utils/cn';
import { inputClasses } from './input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(inputClasses, 'min-h-[88px] py-2.5', className)} {...props} />,
);
Textarea.displayName = 'Textarea';
