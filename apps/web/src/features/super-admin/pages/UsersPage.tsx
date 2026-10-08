import { useState } from 'react';
import { Users } from 'lucide-react';
import { GLOBAL_ROLES, type GlobalRole } from '@vastra/shared';
import { adminApi } from '@/api/endpoints/admin';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdminUser } from '@/types/admin';
import { formatDate, formatDateTime } from '@/utils/format';
import { GLOBAL_ROLE_LABELS } from '@/utils/labels';
import { FilterSelect } from '../components/FilterSelect';
import { useAdminMutation, useAdminUsers } from '../hooks/useAdmin';

const ROLE_VARIANT: Record<GlobalRole, NonNullable<BadgeProps['variant']>> = { SUPER_ADMIN: 'default', SHOP_USER: 'soft', CUSTOMER: 'neutral' };

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>();
  const [active, setActive] = useState<string>();
  const [page, setPage] = useState(1);
  const confirm = useConfirm();

  const users = useAdminUsers({ page, limit: 20, q, role, active: active === undefined ? undefined : active === 'true' });
  const toggle = useAdminMutation((u: AdminUser) => adminApi.updateUser(u.id, { isActive: !u.isActive }), {
    success: (u) => (u.isActive ? 'User activated' : 'User deactivated'),
  });

  const onToggle = async (u: AdminUser) => {
    const deactivating = u.isActive;
    const ok = await confirm({
      title: deactivating ? `Deactivate ${u.name}?` : `Activate ${u.name}?`,
      description: deactivating ? 'They will no longer be able to sign in.' : 'They will be able to sign in again.',
      confirmText: deactivating ? 'Deactivate' : 'Activate',
      destructive: deactivating,
    });
    if (ok) toggle.mutate(u);
  };

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      mobileTitle: true,
      cell: (u) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{u.name}</p>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (u) => <Badge variant={ROLE_VARIANT[u.role] ?? 'neutral'}>{GLOBAL_ROLE_LABELS[u.role] ?? u.role}</Badge> },
    { key: 'shop', header: 'Shop', cell: (u) => u.shop?.name ?? <span className="text-muted-foreground">—</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => <Badge variant={u.isActive ? 'success' : 'destructive'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'login', header: 'Last login', className: 'whitespace-nowrap text-muted-foreground', cell: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never') },
    { key: 'joined', header: 'Joined', hideOnMobile: true, className: 'whitespace-nowrap text-muted-foreground', cell: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      cell: (u) => (
        <Button variant="outline" size="sm" disabled={toggle.isPending} onClick={(e) => { e.stopPropagation(); void onToggle(u); }}>
          {u.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Users" description="All accounts across the platform." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput className="sm:w-72" value={q} onChange={reset(setQ)} placeholder="Search name, email or phone" />
        <FilterSelect label="Filter by role" allLabel="All roles" value={role} onChange={reset(setRole)} options={GLOBAL_ROLES.map((r) => ({ value: r, label: GLOBAL_ROLE_LABELS[r] }))} />
        <FilterSelect label="Filter by status" allLabel="Any status" value={active} onChange={reset(setActive)} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
      </div>
      <DataTable
        columns={columns}
        data={users.data?.items}
        rowKey={(u) => u.id}
        loading={users.isLoading}
        error={users.isError ? users.error : undefined}
        onRetry={() => users.refetch()}
        meta={users.data?.meta}
        onPageChange={setPage}
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyDescription="Try changing the search or filters."
      />
    </>
  );
}
