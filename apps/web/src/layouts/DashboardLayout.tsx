import { useAuthStore } from '@/stores/auth.store';
import AppShell from './AppShell';
import { DASHBOARD_NAV } from './nav';

export default function DashboardLayout() {
  const shop = useAuthStore((s) => s.shop);
  return (
    <AppShell
      nav={DASHBOARD_NAV}
      homePath="/dashboard"
      title={shop?.name ?? 'Your shop'}
      externalHref={shop ? `/shop/${shop.slug}` : undefined}
    />
  );
}
