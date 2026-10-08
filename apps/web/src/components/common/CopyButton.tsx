import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { toast } from 'sonner';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'value'> {
  value: string;
  label?: string;
}

export function CopyButton({ value, label, variant = 'outline', size = 'sm', children, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} copied` : 'Copied to clipboard');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy. Please copy manually.');
    }
  };

  return (
    <Button type="button" variant={variant} size={size} onClick={copy} aria-label={label ? `Copy ${label}` : 'Copy'} {...props}>
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {children ?? (copied ? 'Copied' : 'Copy')}
    </Button>
  );
}
