import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

interface MoneyTextProps {
  /** Integer minor units (paise). */
  minor: number | null | undefined;
  currency?: string;
  className?: string;
  /** Strike-through (MRP). */
  strike?: boolean;
}

export function MoneyText({ minor, currency = 'INR', className, strike }: MoneyTextProps) {
  if (minor == null) return <span className={cn('text-muted-foreground', className)}>—</span>;
  return <span className={cn('tabular-nums', strike && 'text-muted-foreground line-through', className)}>{formatMoney(minor, currency)}</span>;
}
