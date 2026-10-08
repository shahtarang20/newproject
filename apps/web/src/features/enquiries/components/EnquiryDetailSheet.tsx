import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, MessageCircle, Phone, Mail, Package, Loader2 } from 'lucide-react';
import type { EnquiryStatus } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';
import { enquiriesApi } from '@/api/endpoints/enquiries';
import { queryKeys } from '@/api/queryKeys';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';
import { telLink, waLink } from '@/features/customers/components/contact';
import type { Enquiry } from '@/types/insights';

/** Storefront appends `[Variant: Red / M]` to the message. */
export function splitMessage(message: string): { question: string; variant?: string } {
  const m = message.match(/\s*\[Variant:\s*([^\]]+)\]\s*$/i);
  return m ? { question: message.slice(0, m.index).trim(), variant: m[1]!.trim() } : { question: message };
}

interface Props {
  id: string | null;
  onClose: () => void;
  canWrite: boolean;
  canViewCustomers: boolean;
}

export function EnquiryDetailSheet({ id, onClose, canWrite, canViewCustomers }: Props) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...queryKeys.enquiries.all, 'detail', id], queryFn: () => enquiriesApi.get(id!), enabled: !!id });
  const e = q.data;
  const [reply, setReply] = useState('');
  useEffect(() => setReply(e?.response ?? ''), [e?.id, e?.response]);

  const mutation = useMutation({
    mutationFn: (body: { status?: EnquiryStatus; response?: string }) => enquiriesApi.update(id!, body),
    onSuccess: (updated: Enquiry, vars) => {
      qc.setQueryData([...queryKeys.enquiries.all, 'detail', id], updated);
      void qc.invalidateQueries({ queryKey: queryKeys.enquiries.all });
      toast.success(vars.response ? 'Reply saved' : 'Status updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const parts = e ? splitMessage(e.message) : null;
  const defaultText = e ? `Hi ${e.name}, regarding your enquiry${e.product ? ` about ${e.product.name}` : ''}: ` : '';
  const waText = reply.trim() || defaultText;
  const dirty = reply.trim() !== (e?.response ?? '').trim();

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Enquiry</SheetTitle>
          <SheetDescription>{e ? `Received ${formatDateTime(e.createdAt)}` : 'Loading…'}</SheetDescription>
        </SheetHeader>

        {q.isLoading && <div className="mt-6 space-y-3"><Skeleton className="h-20" /><Skeleton className="h-24" /><Skeleton className="h-32" /></div>}
        {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} className="mt-6" />}

        {e && parts && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge type="enquiry" status={e.status} />
              {canWrite && e.status === 'NEW' && (
                <Button size="sm" variant="soft" loading={mutation.isPending} onClick={() => mutation.mutate({ status: 'IN_PROGRESS' })}>Mark in progress</Button>
              )}
            </div>

            {e.product && (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                {e.product.imageUrl ? (
                  <img src={e.product.imageUrl} alt="" className="h-14 w-14 rounded-lg border object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Package className="h-5 w-5" /></span>
                )}
                <div className="min-w-0">
                  <Link to={`/dashboard/products/${e.product.id}`} className="block truncate text-sm font-medium hover:underline">{e.product.name}</Link>
                  {parts.variant && <p className="text-xs text-muted-foreground">Variant: {parts.variant}</p>}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question</h3>
              <p className="whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm">{parts.question}</p>
            </div>

            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</h3>
              <p className="text-sm font-medium">
                {canViewCustomers && e.customerId ? <Link to={`/dashboard/customers/${e.customerId}`} className="hover:underline">{e.name}</Link> : e.name}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">{e.phone}</p>
              {e.email && <p className="text-sm text-muted-foreground">{e.email}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={waLink(e.phone, waText)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp</a>
                </Button>
                <Button asChild size="sm" variant="outline"><a href={telLink(e.phone)}><Phone className="h-4 w-4" /> Call</a></Button>
                {e.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${e.email}`}><Mail className="h-4 w-4" /> Email</a></Button>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enq-reply">Your reply</Label>
              <Textarea id="enq-reply" rows={4} value={reply} onChange={(ev) => setReply(ev.target.value)} disabled={!canWrite || e.status === 'CLOSED'} placeholder="Type a reply. It is saved as a note and sent to the customer when possible." maxLength={2000} />
              {e.respondedAt && <p className="text-xs text-muted-foreground">Last responded {formatDateTime(e.respondedAt)}</p>}
              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!reply.trim() || !dirty || e.status === 'CLOSED'} loading={mutation.isPending && !!mutation.variables?.response} onClick={() => mutation.mutate({ response: reply.trim() })}>
                    Save reply
                  </Button>
                  {e.status !== 'CLOSED' ? (
                    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ status: 'CLOSED' })}>
                      <CheckCircle2 className="h-4 w-4" /> Mark closed
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ status: 'IN_PROGRESS' })}>Reopen</Button>
                  )}
                  {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" aria-hidden />}
                </div>
              )}
            </div>

            {e.notes && e.notes.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h3>
                <ul className="space-y-2">
                  {[...e.notes].reverse().map((n, i) => (
                    <li key={i} className="rounded-lg border p-2.5 text-sm">
                      <p className="whitespace-pre-line">{n.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.at)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
