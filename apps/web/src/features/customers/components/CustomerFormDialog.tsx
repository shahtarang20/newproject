import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { customersApi } from '@/api/endpoints/customers';
import { queryKeys } from '@/api/queryKeys';
import { getErrorMessage } from '@/utils/errors';
import type { Customer } from '@/types/insights';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(120),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{7,16}$/, 'Enter a valid phone number'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  tags: z.string().max(400),
  notes: z.string().max(2000),
});
type Values = z.infer<typeof schema>;

const parseTags = (s: string) => [...new Set(s.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 20);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When provided the dialog edits this customer (phone is read-only). */
  customer?: Customer;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
  const qc = useQueryClient();
  const editing = !!customer;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', tags: '', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: customer?.name ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '',
        tags: customer?.tags.join(', ') ?? '', notes: customer?.notes ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      customer
        ? customersApi.update(customer.id, { name: v.name, email: v.email || null, notes: v.notes || null, tags: parseTags(v.tags) })
        : customersApi.create({ name: v.name, phone: v.phone, email: v.email || undefined, notes: v.notes || undefined, tags: parseTags(v.tags) }),
    onSuccess: () => {
      toast.success(editing ? 'Customer updated' : 'Customer added');
      void qc.invalidateQueries({ queryKey: queryKeys.customers.all });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit customer' : 'Add customer'}</DialogTitle>
          <DialogDescription>{editing ? 'Update profile details, tags and notes.' : 'Save a customer so you can track their orders.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
          <FormField control={form.control} name="name" label="Name" required render={({ field, ...a }) => <Input {...field} {...pick(a)} autoComplete="off" />} />
          <FormField control={form.control} name="phone" label="Phone" required render={({ field, ...a }) => <Input {...field} {...pick(a)} type="tel" inputMode="tel" disabled={editing} />} />
          <FormField control={form.control} name="email" label="Email" render={({ field, ...a }) => <Input {...field} {...pick(a)} type="email" />} />
          <FormField control={form.control} name="tags" label="Tags" hint="Comma separated, e.g. vip, wholesale" render={({ field, ...a }) => <Input {...field} {...pick(a)} />} />
          <FormField control={form.control} name="notes" label="Notes" render={({ field, ...a }) => <Textarea {...field} {...pick(a)} rows={3} />} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>{editing ? 'Save changes' : 'Add customer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function pick(a: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) {
  return { id: a.id, 'aria-invalid': a['aria-invalid'], 'aria-describedby': a['aria-describedby'] };
}
