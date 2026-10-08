import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowUpRight, Bell, CreditCard, Palette, Store, UserCog, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@vastra/shared';
import { pageTitle } from '@/utils/seo';

interface Item { to: string; title: string; description: string; icon: LucideIcon; permission: Permission }

const ITEMS: Item[] = [
  { to: '/dashboard/settings/shop', title: 'Shop settings', description: 'Profile, logo, contact, business hours, public link, SEO, payments and shipping.', icon: Store, permission: 'settings:write' },
  { to: '/dashboard/settings/catalogue', title: 'Storefront design', description: 'Pick a template, brand colour, button style and catalogue layout.', icon: Palette, permission: 'settings:write' },
  { to: '/dashboard/settings/notifications', title: 'Notifications', description: 'Choose in-app, email and WhatsApp alerts and low-stock threshold.', icon: Bell, permission: 'settings:write' },
  { to: '/dashboard/subscription', title: 'Subscription', description: 'Your plan, usage against limits, and upgrades.', icon: CreditCard, permission: 'subscription:manage' },
  { to: '/dashboard/staff', title: 'Staff', description: 'Invite team members and control what they can do.', icon: UserCog, permission: 'staff:manage' },
];

export default function SettingsPage() {
  const { can } = usePermission();
  const items = ITEMS.filter((i) => can(i.permission));
  return (
    <>
      <Helmet><title>{pageTitle('Settings')}</title></Helmet>
      <PageHeader title="Settings" description="Manage your shop, storefront, team and plan." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="flex h-full flex-col gap-3 p-5 transition-all group-hover:border-primary/40 group-hover:shadow-card">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
