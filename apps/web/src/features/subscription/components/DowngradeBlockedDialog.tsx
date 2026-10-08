import type { LimitKey } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ExceededLimit } from '../hooks/usePlanChange';
import { LIMIT_TITLES, formatLimitValue } from '../lib';

interface Props { open: boolean; planName: string; items: ExceededLimit[]; onClose: () => void }

export function DowngradeBlockedDialog({ open, planName, items, onClose }: Props) {
  const label = (k: string) => LIMIT_TITLES[k as LimitKey] ?? k;
  const fmt = (k: string, n: number) => (k in LIMIT_TITLES ? formatLimitValue(k as LimitKey, n) : String(n));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>You can't switch to {planName} yet</DialogTitle>
          <DialogDescription>Your shop currently uses more than this plan allows. Reduce the following, then try again:</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-xl border text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="font-medium">{label(i.key)}</span>
              <span className="text-muted-foreground">
                using <strong className="text-destructive">{fmt(i.key, i.used)}</strong>, plan allows {fmt(i.key, i.limit)}
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter><Button onClick={onClose}>Got it</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
