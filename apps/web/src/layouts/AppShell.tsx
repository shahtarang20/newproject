import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, ExternalLink, LogOut, Menu, Monitor, Moon, MoreHorizontal, Sun, UserRound } from 'lucide-react';
import type { Permission } from '@vastra/shared';
import { Avatar, AvatarFallback, AvatarImage, initials } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SimpleTooltip, TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore, type Theme } from '@/stores/ui.store';
import { usePermission } from '@/hooks/usePermission';
import { STAFF_ROLE_LABELS } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { Brand } from './Brand';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import type { NavGroup, NavItem } from './nav';

interface AppShellProps {
  nav: NavGroup[];
  homePath: string;
  /** Shown in the topbar: shop name or "Super admin". */
  title: string;
  subtitle?: string;
  /** Link to the public storefront, if any. */
  externalHref?: string;
}

function useVisibleNav(nav: NavGroup[]): NavGroup[] {
  const { can } = usePermission();
  return useMemo(
    () =>
      nav
        .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(i.permission as Permission)) }))
        .filter((g) => g.items.length > 0),
    [nav, can],
  );
}

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )
      }
      aria-label={collapsed ? item.label : undefined}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
  return collapsed ? <SimpleTooltip label={item.label} side="right">{link}</SimpleTooltip> : link;
}

function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Primary">
      {groups.map((g, i) => (
        <div key={g.label ?? i} className="flex flex-col gap-0.5">
          {g.label && !collapsed && <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>}
          {g.label && collapsed && i > 0 && <div className="mx-2 mb-1 h-px bg-border" />}
          {g.items.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function ThemeItems() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const opts: { v: Theme; label: string; icon: typeof Sun }[] = [
    { v: 'light', label: 'Light', icon: Sun },
    { v: 'dark', label: 'Dark', icon: Moon },
    { v: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="flex gap-1 px-1.5 py-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => setTheme(o.v)}
          aria-label={`${o.label} theme`}
          aria-pressed={theme === o.v}
          className={cn('flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors', theme === o.v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary')}
        >
          <o.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export default function AppShell({ nav, homePath, title, subtitle, externalHref }: AppShellProps) {
  const groups = useVisibleNav(nav);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const [drawer, setDrawer] = useState(false);
  const user = useAuthStore((s) => s.user);
  const staffRole = useAuthStore((s) => s.staffRole);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const flat = groups.flatMap((g) => g.items);
  const bottom = flat.slice(0, 4);
  const current = [...flat].reverse().find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-muted/30">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-background transition-[width] duration-200 lg:flex',
            collapsed ? 'w-[68px]' : 'w-64',
          )}
        >
          <div className={cn('flex h-16 items-center border-b px-4', collapsed && 'justify-center px-0')}>
            <Brand to={homePath} collapsed={collapsed} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
            <NavList groups={groups} collapsed={collapsed} />
          </div>
          <div className="border-t p-3">
            <Button variant="ghost" size={collapsed ? 'icon' : 'sm'} className={cn(!collapsed && 'w-full justify-start text-muted-foreground')} onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
            </Button>
          </div>
        </aside>

        <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-lg sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle ?? current?.label}</p>
            </div>
            {externalHref && (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <a href={externalHref} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> View store</a>
              </Button>
            )}
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-secondary focus-visible:ring-2" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                    <AvatarFallback>{initials(user?.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-0.5 py-2">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="truncate text-xs font-normal">{user?.email}</p>
                  {staffRole && <p className="text-xs font-normal">{STAFF_ROLE_LABELS[staffRole]}</p>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {homePath === '/dashboard' && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings"><UserRound /> Account & settings</Link>
                  </DropdownMenuItem>
                )}
                <ThemeItems />
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={onLogout}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:pb-10">
            <div className="mx-auto w-full max-w-7xl animate-fade-up">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile drawer */}
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center border-b px-4"><Brand to={homePath} /></div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavList groups={groups} onNavigate={() => setDrawer(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile bottom nav */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-lg lg:hidden" aria-label="Quick navigation">
          <ul className="grid grid-cols-5">
            {bottom.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </TooltipProvider>
  );
}
