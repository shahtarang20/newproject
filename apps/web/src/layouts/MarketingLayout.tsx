import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { useAuthStore, homePathForRole } from '@/stores/auth.store';
import { Brand } from './Brand';
import { cn } from '@/utils/cn';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground', isActive ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {status === 'authed' && user ? (
              <Button asChild size="sm"><Link to={homePathForRole(user.role)}>Open dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
                <Button asChild size="sm"><Link to="/register">Start free</Link></Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand />
          <nav className="mt-4 flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((n) => (
              <SheetClose asChild key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => cn('rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary')}>
                  {n.label}
                </NavLink>
              </SheetClose>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/register">Start free</Link></Button>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <Brand />
            <p className="max-w-sm text-sm text-muted-foreground">
              Vastra turns any garment or saree shop into a digital catalogue and ordering business, with a storefront, WhatsApp sharing and order management in one place.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm"><Link to="/register">Start free</Link></Button>
              <Button asChild size="sm" variant="outline"><Link to="/shop/shree-fashion">Live demo</Link></Button>
            </div>
          </div>
          <FooterCol title="Product" links={[['Pricing', '/pricing'], ['Live demo', '/shop/shree-fashion'], ['Start free', '/register'], ['Sign in', '/login']]} />
          <FooterCol title="Company" links={[['About', '/about'], ['Contact', '/contact']]} />
          <FooterCol title="Explore" links={[['Storefront templates', '/#templates'], ['How it works', '/#how-it-works'], ['FAQ', '/#faq']]} />
        </div>
        <div className="border-t">
          <p className="container py-5 text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Vastra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
