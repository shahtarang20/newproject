import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, BookOpen, Boxes, CreditCard, FolderTree, HardDrive, Layers, LayoutDashboard, MessageSquare, Package,
  Receipt, ScrollText, Settings, ShoppingBag, Store, Tag, UserCog, Users,
} from 'lucide-react';
import type { Permission } from '@vastra/shared';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: Permission;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const DASHBOARD_NAV: NavGroup[] = [
  { items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Catalogue',
    items: [
      { to: '/dashboard/products', label: 'Products', icon: Package, permission: 'products:read' },
      { to: '/dashboard/categories', label: 'Categories', icon: FolderTree, permission: 'products:read' },
      { to: '/dashboard/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory:read' },
      { to: '/dashboard/catalogue', label: 'Catalogues', icon: BookOpen, permission: 'catalogues:write' },
      { to: '/dashboard/bulk', label: 'Bulk tools', icon: Layers, permission: 'products:write' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/dashboard/orders', label: 'Orders', icon: ShoppingBag, permission: 'orders:read' },
      { to: '/dashboard/customers', label: 'Customers', icon: Users, permission: 'customers:read' },
      { to: '/dashboard/enquiries', label: 'Enquiries', icon: MessageSquare, permission: 'enquiries:read' },
      { to: '/dashboard/offers', label: 'Offers', icon: Tag, permission: 'offers:write' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:read' },
      { to: '/dashboard/staff', label: 'Staff', icon: UserCog, permission: 'staff:manage' },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings, permission: 'settings:write' },
      { to: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, permission: 'subscription:manage' },
    ],
  },
];

export const SUPER_ADMIN_NAV: NavGroup[] = [
  { items: [{ to: '/super-admin', label: 'Overview', icon: LayoutDashboard, end: true }] },
  {
    label: 'Platform',
    items: [
      { to: '/super-admin/shops', label: 'Shops', icon: Store },
      { to: '/super-admin/users', label: 'Users', icon: Users },
      { to: '/super-admin/plans', label: 'Plans', icon: CreditCard },
      { to: '/super-admin/subscriptions', label: 'Subscriptions', icon: Receipt },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/super-admin/storage', label: 'Storage', icon: HardDrive },
      { to: '/super-admin/settings', label: 'Settings', icon: Settings },
      { to: '/super-admin/logs', label: 'Audit logs', icon: ScrollText },
    ],
  },
];
