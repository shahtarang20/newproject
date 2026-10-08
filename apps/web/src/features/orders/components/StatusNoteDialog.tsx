import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { OrderStatus } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ORDER_STATUS_LABELS } from '@/utils/labels';
import { STATUS_ACTIONS, isStockRestoring } from '../utils';

interface Props {
  status: OrderStatus | null;
  orderNumber: string;
  pending?: boolean;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}

/** Collects an optional note for a status change. Destructive changes are confirmed by the caller afterwards. */
export function StatusNoteDialog({ status, orderNumber, pending, onCancel, onSubmit }: Props) {
  const [note, setNote] = useState('');
  useEffect(() => { if (status) setNote(''); }, [status]);
  const action = status ? STATUS_ACTIONS[status] : null;

  return (
    <Dialog open={!!status} onOpenChange={(o) => !o && !pending && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{action?.label} - {orderNumber}</DialogTitle>
          <DialogDescription>
            {status ? `Order will move to "${ORDER_STATUS_LABELS[status]}". The customer may be notified.` : null}
          </DialogDescription>
        </DialogHeader>
        {status && isStockRestoring(status) && (
          <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>Stock for all items in this order will be restored automatically. This cannot be undone.</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="status-note">Note {status && isStockRestoring(status) ? '(reason)' : '(optional)'}</Label>
          <Textarea id="status-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible in the order timeline" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>Back</Button>
          <Button variant={action?.destructive ? 'destructive' : 'default'} loading={pending} onClick={() => onSubmit(note.trim())}>
            {action?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
