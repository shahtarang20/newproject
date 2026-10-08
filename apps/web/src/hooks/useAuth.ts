import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const shop = useAuthStore((s) => s.shop);
  const staffRole = useAuthStore((s) => s.staffRole);
  const logout = useAuthStore((s) => s.logout);
  return { status, user, shop, staffRole, isAuthed: status === 'authed', logout };
}
