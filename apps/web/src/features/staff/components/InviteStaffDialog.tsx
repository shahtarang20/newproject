import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StaffRole } from '@vastra/shared';
import { staffApi } from '@/api/endpoints/staff';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage, getFieldErrors } from '@/utils/errors';
import { STAFF_ROLE_LABELS } from '@/utils/labels';
import { RolePermissions } from './RolePermissions';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the person\'s name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().max(20),
  role: z.enum(['MANAGER', 'SALES', 'INVENTORY', 'ORDER_MANAGER']),
});
type Form = z.infer<typeof schema>;

export function InviteStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const perms = useQuery({ queryKey: [...queryKeys.staff.all, 'permissions'], queryFn: staffApi.permissions, staleTime: 10 * 60_000, enabled: open });
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', role: 'SALES' } });
  const role = form.watch('role') as StaffRole;

  useEffect(() => { if (!open) form.reset(); }, [open, form]);

  const invite = useMutation({
    mutationFn: (v: Form) => staffApi.invite({ ...v, phone: v.phone || undefined }),
    onSuccess: async (s) => {
      await qc.invalidateQueries({ queryKey: queryKeys.staff.all });
      await qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
      toast.success(`Invitation sent to ${s.email}`);
      onOpenChange(false);
    },
    onError: (e) => {
      for (const [k, m] of Object.entries(getFieldErrors(e))) if (k in form.getValues()) form.setError(k as keyof Form, { message: m });
      toast.error(getErrorMessage(e, 'Could not send the invitation'));
    },
  });

  const roles = (perms.data?.assignableRoles ?? ['MANAGER', 'SALES', 'INVENTORY', 'ORDER_MANAGER']).filter((r): r is Form['role'] => r !== 'OWNER');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>They'll get an email with a link to set their password. The link is valid for 7 days.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => invite.mutate(v))} noValidate className="space-y-4">
          <FormField control={form.control} name="name" label="Full name" required render={({ field, id, ...a }) => (
            <Input {...field} id={id} autoComplete="off" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
          )} />
          <FormField control={form.control} name="email" label="Email" required render={({ field, id, ...a }) => (
            <Input {...field} id={id} type="email" inputMode="email" autoComplete="off" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
          )} />
          <FormField control={form.control} name="phone" label="Phone (optional)" render={({ field, id, ...a }) => (
            <Input {...field} id={id} type="tel" inputMode="tel" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
          )} />
          <FormField control={form.control} name="role" label="Role" render={({ field, id }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={id}><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{STAFF_ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          <RolePermissions role={role} permissions={perms.data?.roles?.[role]} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={invite.isPending}>Send invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
