import { useCallback } from 'react';
import type { Permission } from '@vastra/shared';
import { useAuthStore } from '@/stores/auth.store';

/** `const { can } = usePermission(); can('orders:write')`. Super admins pass everything. */
export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions);
  const role = useAuthStore((s) => s.user?.role);
  const staffRole = useAuthStore((s) => s.staffRole);
  const can = useCallback(
    (...required: Permission[]) =>
      role === 'SUPER_ADMIN' || staffRole === 'OWNER' || required.every((p) => permissions.includes(p)),
    [permissions, role, staffRole],
  );
  const canAny = useCallback(
    (...required: Permission[]) =>
      role === 'SUPER_ADMIN' || staffRole === 'OWNER' || required.some((p) => permissions.includes(p)),
    [permissions, role, staffRole],
  );
  return { can, canAny, permissions, staffRole };
}
