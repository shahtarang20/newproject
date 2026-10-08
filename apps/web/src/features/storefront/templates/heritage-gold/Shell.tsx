import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, MessageCircle, Phone, Search, ShoppingBag, Store, X, Instagram, Facebook } from 'lucide-react';
import type { ShellProps } from '../types';
import { Divider, addressLine, dayLabel, hoursLabel, socialHref, waHref } from './lib';

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)]';

export default function Shell({ shop, cartCount, categories, children, onSearch }: ShellProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const base = `/shop/${shop.slug}`;
  const wa = waHref(shop);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
    setOpen(false);
  };
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap py-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors hover:text-[color:var(--sf-accent)] ${focus} ${
      isActive ? 'text-[color:var(--sf-primary)] border-b border-[color:var(--sf-accent)]' : 'text-[color:var(--sf-fg)]'
    }`;
  const ig = socialHref(shop.instagram, 'https://instagram.com/');
  const fb = socialHref(shop.facebook, 'https://facebook.com/');

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-[color:var(--sf-primary)] px-4 py-1.5 text-center text-[11px] tracking-[0.2em] text-[color:var(--sf-accent)]">
        <span className="uppercase">Handpicked with love</span>
        {shop.phone && <span className="hidden sm:inline"> &nbsp;·&nbsp; Call {shop.phone}</span>}
        <Link to={`${base}/track-order`} className={`ml-3 underline-offset-4 hover:underline ${focus}`}>Track order</Link>
      </div>

      <header className="sticky top-0 z-40 border-b border-[color:var(--sf-border)] bg-[color:var(--sf-bg)]/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 pt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close search' : 'Open search'}
            aria-expanded={open}
            className={`justify-self-start rounded-full p-2 text-[color:var(--sf-primary)] ${focus}`}
          >
            {open ? <X size={20} /> : <Search size={20} />}
          </button>
          <Link to={base} aria-label={`${shop.name} home`} className={`flex flex-col items-center ${focus}`}>
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="h-12 max-w-[180px] object-contain md:h-16" />
            ) : (
              <span className="font-display text-2xl font-semibold tracking-wide text-[color:var(--sf-primary)] md:text-4xl">{shop.name}</span>
            )}
          </Link>
          <Link
            to={`${base}/cart`}
            aria-label={`Bag, ${cartCount} items`}
            className={`relative justify-self-end rounded-full p-2 text-[color:var(--sf-primary)] ${focus}`}
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--sf-accent)] px-1 text-[10px] font-semibold text-[#2a1a14]">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
        <Divider className="mx-auto mt-1 hidden h-4 w-40 md:block" />
        <nav aria-label="Categories" className="mx-auto max-w-7xl overflow-x-auto px-4 [scrollbar-width:none]">
          <ul className="flex items-center gap-6 md:justify-center md:gap-9">
            <li><NavLink end to={base} className={navCls}>Home</NavLink></li>
            <li><NavLink to={`${base}/products`} className={navCls}>All</NavLink></li>
            {categories.slice(0, 8).map((c) => (
              <li key={c.id}><NavLink to={`${base}/category/${c.slug}`} className={navCls}>{c.name}</NavLink></li>
            ))}
          </ul>
        </nav>
        {open && (
          <form onSubmit={submit} role="search" className="border-t border-[color:var(--sf-border)] bg-[color:var(--sf-card)] px-4 py-3">
            <div className="mx-auto flex max-w-xl items-center gap-2 border border-[color:var(--sf-accent)] px-3">
              <Search size={16} className="text-[color:var(--sf-accent)]" aria-hidden="true" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search products"
                placeholder="Search sarees, kurtas, lehengas…"
                className="w-full bg-transparent py-2.5 font-display text-lg outline-none placeholder:italic placeholder:text-[color:var(--sf-muted-fg)]"
              />
            </div>
          </form>
        )}
      </header>

      <main id="main" className="flex-1 pb-16 md:pb-0">{children}</main>

      <footer className="relative mt-16 bg-[color:var(--sf-primary)] pb-24 text-[#fbf5ea] md:pb-10">
        <div className="h-1 bg-[color:var(--sf-accent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 text-center">
          <p className="font-display text-3xl font-semibold text-[color:var(--sf-accent)]">{shop.name}</p>
          <Divider className="mx-auto mt-2 h-5 w-52" />
          <div className="mt-8 grid gap-8 text-sm md:grid-cols-3 md:text-left">
            <div>
              <h2 className="font-display text-xl text-[color:var(--sf-accent)]">Visit us</h2>
              <address className="mt-2 not-italic leading-relaxed opacity-85">{addressLine(shop) || 'Visit our store'}</address>
            </div>
            <div>
              <h2 className="font-display text-xl text-[color:var(--sf-accent)]">Hours</h2>
              <ul className="mx-auto mt-2 max-w-[220px] space-y-0.5 opacity-85 md:mx-0">
                {shop.businessHours.map((h) => (
                  <li key={h.day} className="flex justify-between"><span>{dayLabel(h)}</span><span>{hoursLabel(h)}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-xl text-[color:var(--sf-accent)]">Connect</h2>
              <ul className="mt-2 space-y-1.5 opacity-90">
                {wa && <li><a href={wa} target="_blank" rel="noreferrer" className="hover:text-[color:var(--sf-accent)]">WhatsApp us</a></li>}
                {shop.phone && <li><a href={`tel:${shop.phone}`} className="hover:text-[color:var(--sf-accent)]">{shop.phone}</a></li>}
                <li><Link to={`${base}/track-order`} className="hover:text-[color:var(--sf-accent)]">Track your order</Link></li>
              </ul>
              <div className="mt-3 flex justify-center gap-3 md:justify-start">
                {ig && <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full border border-[color:var(--sf-accent)] p-2 text-[color:var(--sf-accent)]"><Instagram size={16} /></a>}
                {fb && <a href={fb} target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full border border-[color:var(--sf-accent)] p-2 text-[color:var(--sf-accent)]"><Facebook size={16} /></a>}
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-[color:var(--sf-accent)]/30 pt-4 text-xs opacity-70">
            © {new Date().getFullYear()} {shop.name} · Powered by Vastra
          </p>
        </div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-[calc(5rem+var(--sf-sticky-h,0px))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg md:bottom-6">
          <MessageCircle size={22} />
        </a>
      )}
      {!wa && shop.phone && (
        <a href={`tel:${shop.phone}`} aria-label="Call shop" className="fixed bottom-[calc(5rem+var(--sf-sticky-h,0px))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--sf-primary)] text-[color:var(--sf-accent)] shadow-lg md:bottom-6">
          <Phone size={20} />
        </a>
      )}

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[color:var(--sf-accent)] bg-[color:var(--sf-bg)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { to: base, label: 'Home', icon: Home, end: true },
          { to: `${base}/products`, label: 'Shop', icon: Store },
          { to: `${base}/cart`, label: 'Bag', icon: ShoppingBag, badge: cartCount },
        ].map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-widest ${focus} ${isActive ? 'text-[color:var(--sf-primary)]' : 'text-[color:var(--sf-muted-fg)]'}`}>
            <Icon size={19} aria-hidden="true" />
            {label}
            {!!badge && <span className="absolute right-[28%] top-1 rounded-full bg-[color:var(--sf-primary)] px-1 text-[9px] text-[color:var(--sf-primary-fg)]">{badge}</span>}
          </NavLink>
        ))}
        <button type="button" onClick={() => { setOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-widest text-[color:var(--sf-muted-fg)] ${focus}`}>
          <Search size={19} aria-hidden="true" />Search
        </button>
      </nav>
    </div>
  );
}
