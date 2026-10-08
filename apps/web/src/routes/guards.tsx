import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { GlobalRole, Permission } from '@vastra/shared';
import { Splash } from '@/components/common/Splash';
import { EmptyState } from '@/components/ui/empty-state';
import { ShieldAlert } from 'lucide-react';
import { homePathForRole, useAuthStore } from '@/stores/auth.store';
import { usePermission } from '@/hooks/usePermission';

interface GuardProps {
  children?: ReactNode;
}
const out = (children?: ReactNode) => <>{children ?? <Outlet />}</>;

/** Waits for bootstrap, then requires a signed-in user. */
export function RequireAuth({ children }: GuardProps) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <Splash />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return out(children);
}

export function RequireRole({ roles, children }: GuardProps & { roles: GlobalRole[] }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) return <Navigate to={homePathForRole(role)} replace />;
  return out(children);
}

/** Renders a friendly "no access" state when the permission is missing (does not redirect). */
export function RequirePermission({ permission, children }: GuardProps & { permission: Permission | Permission[] }) {
  const { can } = usePermission();
  const list = Array.isArray(permission) ? permission : [permission];
  if (!can(...list)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Ask the shop owner to update your role if you need it."
      />
    );
  }
  return out(children);
}

/** For /login & /register: bounce signed-in users to their home. */
export function RedirectIfAuthed({ children }: GuardProps) {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  if (status === 'idle' || status === 'loading') return <Splash />;
  if (status === 'authed') return <Navigate to={homePathForRole(role)} replace />;
  return out(children);
}
