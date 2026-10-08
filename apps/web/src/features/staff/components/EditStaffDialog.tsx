import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StaffRole } from '@vastra/shared';
import { staffApi } from '@/api/endpoints/staff';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getErrorMessage } from '@/utils/errors';
import { STAFF_ROLE_LABELS } from '@/utils/labels';
import type { StaffDto } from '@/types/settings';
import { RolePermissions } from './RolePermissions';

export function EditStaffDialog({ staff, onClose }: { staff: StaffDto | null; onClose: () => void }) {
  const qc = useQueryClient();
  const perms = useQuery({ queryKey: [...queryKeys.staff.all, 'permissions'], queryFn: staffApi.permissions, staleTime: 10 * 60_000, enabled: !!staff });
  const [role, setRole] = useState<StaffRole>('SALES');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (staff) { setRole(staff.role); setActive(staff.status === 'ACTIVE'); }
  }, [staff]);

  const save = useMutation({
    mutationFn: () => staffApi.update(staff!.id, { ...(role !== staff!.role ? { role } : {}), ...(active !== (staff!.status === 'ACTIVE') ? { active } : {}) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.staff.all });
      toast.success('Team member updated. They will need to sign in again.');
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not update this team member')),
  });

  const roles = (perms.data?.assignableRoles ?? ['MANAGER', 'SALES', 'INVENTORY', 'ORDER_MANAGER']).filter((r) => r !== 'OWNER');
  const unchanged = !staff || (role === staff.role && active === (staff.status === 'ACTIVE'));

  return (
    <Dialog open={!!staff} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {staff?.name}</DialogTitle>
          <DialogDescription>{staff?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staff-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger id="staff-role"><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{STAFF_ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <RolePermissions role={role} permissions={perms.data?.roles?.[role]} />
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <Label htmlFor="staff-active">Active</Label>
              <p className="text-xs text-muted-foreground">Disabled team members cannot sign in.</p>
            </div>
            <Switch id="staff-active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={unchanged} loading={save.isPending}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
