import AppShell from './AppShell';
import { SUPER_ADMIN_NAV } from './nav';

export default function SuperAdminLayout() {
  return <AppShell nav={SUPER_ADMIN_NAV} homePath="/super-admin" title="Super admin" subtitle="Platform control" />;
}
