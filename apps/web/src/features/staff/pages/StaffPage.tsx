import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, MailPlus, MoreHorizontal, Pencil, Send, Trash2, UserPlus, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { staffApi } from '@/api/endpoints/staff';
import { subscriptionApi } from '@/api/endpoints/subscription';
import { queryKeys } from '@/api/queryKeys';
import { ErrorState } from '@/components/common/ErrorState';
import { LimitBanner } from '@/components/common/LimitBanner';
import { PageHeader } from '@/components/common/PageHeader';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { STAFF_ROLE_LABELS } from '@/utils/labels';
import { pageTitle } from '@/utils/seo';
import type { StaffDto } from '@/types/settings';
import { EditStaffDialog } from '../components/EditStaffDialog';
import { InviteStaffDialog } from '../components/InviteStaffDialog';

function statusBadge(s: StaffDto) {
  if (s.invitePending) return <Badge variant="warning">Invite pending</Badge>;
  if (s.status === 'DISABLED') return <Badge variant="neutral">Disabled</Badge>;
  return <Badge variant="success">Active</Badge>;
}

export default function StaffPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const me = useAuthStore((s) => s.user);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDto | null>(null);

  const listQ = useQuery({ queryKey: [...queryKeys.staff.all, 'list'], queryFn: staffApi.list });
  const subQ = useQuery({ queryKey: queryKeys.subscription.current(), queryFn: subscriptionApi.current });
  const staffUsage = subQ.data?.usage.find((u) => u.key === 'staff');
  const atLimit = !!staffUsage && staffUsage.limit != null && staffUsage.used >= staffUsage.limit;

  const resend = useMutation({
    mutationFn: (id: string) => staffApi.resendInvite(id),
    onSuccess: () => toast.success('Invitation sent again'),
    onError: (e) => toast.error(getErrorMessage(e, 'Could not resend the invitation')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.staff.all });
      await qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
      toast.success('Team member removed');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not remove this team member')),
  });

  const onRemove = async (s: StaffDto) => {
    const ok = await confirm({
      title: `Remove ${s.name}?`,
      description: 'They will be signed out and lose access to this shop immediately. This frees up a staff slot.',
      confirmText: 'Remove',
      destructive: true,
    });
    if (ok) remove.mutate(s.id);
  };

  const rows = listQ.data ?? [];

  return (
    <>
      <Helmet><title>{pageTitle('Staff')}</title></Helmet>
      <PageHeader
        title="Staff"
        description="Invite your team and decide what each person can do."
        actions={<Button onClick={() => setInviteOpen(true)} disabled={atLimit}><UserPlus className="h-4 w-4" /> Invite staff</Button>}
      />
      {staffUsage && <LimitBanner className="mb-4" limitKey="staff" used={staffUsage.used} limit={staffUsage.limit} />}

      {listQ.isLoading && <Card className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</Card>}
      {listQ.error && <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />}
      {!listQ.isLoading && !listQ.error && rows.length === 0 && (
        <EmptyState icon={UserCog} title="No team members yet" description="Invite staff to help manage orders, products and enquiries." action={<Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" /> Invite staff</Button>} />
      )}
      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const owner = s.role === 'OWNER';
                const self = s.userId === me?.id;
                const protectedRow = owner || self;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback>{initials(s.name)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}{self && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                          <div className="mt-1 md:hidden">{statusBadge(s)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={owner ? 'default' : 'soft'}>{owner && <Crown className="h-3 w-3" />}{STAFF_ROLE_LABELS[s.role]}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{statusBadge(s)}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{s.lastLoginAt ? formatDate(s.lastLoginAt) : 'Never'}</TableCell>
                    <TableCell>
                      {protectedRow ? (
                        <span className="text-xs text-muted-foreground">{owner ? 'Owner' : ''}</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(s)}><Pencil className="h-4 w-4" /> Edit role / access</DropdownMenuItem>
                            {s.invitePending && <DropdownMenuItem onSelect={() => resend.mutate(s.id)}><Send className="h-4 w-4" /> Resend invite</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void onRemove(s)}><Trash2 className="h-4 w-4" /> Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditStaffDialog staff={editing} onClose={() => setEditing(null)} />
    </>
  );
}
