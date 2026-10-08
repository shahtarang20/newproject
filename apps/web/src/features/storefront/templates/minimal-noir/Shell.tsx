import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, Store, X } from 'lucide-react';
import type { ShellProps } from '../types';
import { MONO, addressLine, dayLabel, hoursLabel, socialHref, waHref } from './lib';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-fg)]';

export default function Shell({ shop, cartCount, categories, children, onSearch }: ShellProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const base = `/shop/${shop.slug}`;
  const wa = waHref(shop);
  const ig = socialHref(shop.instagram, 'https://instagram.com/');
  const fb = socialHref(shop.facebook, 'https://facebook.com/');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
    setOpen(false);
  };
  const link = ({ isActive }: { isActive: boolean }) =>
    `text-[11px] uppercase tracking-[0.14em] ${focus} ${isActive ? 'underline underline-offset-[6px] decoration-1' : 'hover:underline underline-offset-[6px]'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[color:var(--sf-fg)] focus:p-2 focus:text-[color:var(--sf-bg)]">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-[color:var(--sf-fg)] bg-[color:var(--sf-bg)]">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 md:px-8">
          <Link to={base} aria-label={`${shop.name} home`} className={`flex items-center gap-2 ${focus}`}>
            {shop.logoUrl && <img src={shop.logoUrl} alt="" className="h-6 w-6 object-cover grayscale" />}
            <span className="font-display text-lg font-bold uppercase tracking-[-0.04em]">{shop.name}</span>
          </Link>
          <nav aria-label="Categories" className="hidden flex-1 items-center gap-6 lg:flex">
            <NavLink to={`${base}/products`} className={link}>All</NavLink>
            {categories.slice(0, 6).map((c) => (
              <NavLink key={c.id} to={`${base}/category/${c.slug}`} className={link}>{c.name}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5" style={MONO}>
            <Link to={`${base}/track-order`} className={`hidden text-[11px] uppercase tracking-[0.14em] hover:underline sm:inline ${focus}`}>Track</Link>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Close search' : 'Open search'} className={`text-[11px] uppercase tracking-[0.14em] ${focus}`}>
              {open ? <X size={16} /> : <span>Search</span>}
            </button>
            <Link to={`${base}/cart`} aria-label={`Bag, ${cartCount} items`} className={`text-[11px] uppercase tracking-[0.14em] ${focus}`}>
              Bag ({cartCount})
            </Link>
          </div>
        </div>
        {categories.length > 0 && (
          <nav aria-label="Categories" className="overflow-x-auto border-t border-[color:var(--sf-border)] px-4 [scrollbar-width:none] lg:hidden">
            <ul className="flex gap-5 py-2.5">
              <li><NavLink to={`${base}/products`} className={link}>All</NavLink></li>
              {categories.map((c) => <li key={c.id} className="whitespace-nowrap"><NavLink to={`${base}/category/${c.slug}`} className={link}>{c.name}</NavLink></li>)}
            </ul>
          </nav>
        )}
        {open && (
          <form role="search" onSubmit={submit} className="border-t border-[color:var(--sf-fg)] px-4 md:px-8">
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="SEARCH…"
              className="w-full bg-transparent py-5 font-display text-3xl font-bold uppercase tracking-[-0.03em] outline-none placeholder:text-[color:var(--sf-border)] md:text-6xl"
            />
          </form>
        )}
      </header>

      <main id="main" className="flex-1 pb-14 md:pb-0">{children}</main>

      <footer className="border-t border-[color:var(--sf-fg)] bg-[color:var(--sf-bg)] pb-20 md:pb-0">
        <div className="mx-auto max-w-[1600px] px-4 pt-10 md:px-8">
          <p className="break-words font-display text-[14vw] font-bold uppercase leading-[0.85] tracking-[-0.06em]">{shop.name}</p>
          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-[color:var(--sf-border)] py-8 text-xs md:grid-cols-4" style={MONO}>
            <div>
              <h2 className="mb-2 uppercase tracking-[0.15em] text-[color:var(--sf-muted-fg)]">Address</h2>
              <address className="not-italic leading-relaxed">{addressLine(shop) || '—'}</address>
            </div>
            <div>
              <h2 className="mb-2 uppercase tracking-[0.15em] text-[color:var(--sf-muted-fg)]">Hours</h2>
              <ul className="space-y-0.5">{shop.businessHours.map((h) => <li key={h.day}>{dayLabel(h)} {hoursLabel(h)}</li>)}</ul>
            </div>
            <div>
              <h2 className="mb-2 uppercase tracking-[0.15em] text-[color:var(--sf-muted-fg)]">Contact</h2>
              <ul className="space-y-1">
                {wa && <li><a href={wa} target="_blank" rel="noreferrer" className="hover:underline">WhatsApp</a></li>}
                {shop.phone && <li><a href={`tel:${shop.phone}`} className="hover:underline">{shop.phone}</a></li>}
                {shop.email && <li><a href={`mailto:${shop.email}`} className="break-all hover:underline">{shop.email}</a></li>}
              </ul>
            </div>
            <div>
              <h2 className="mb-2 uppercase tracking-[0.15em] text-[color:var(--sf-muted-fg)]">Follow</h2>
              <ul className="space-y-1">
                {ig && <li><a href={ig} target="_blank" rel="noreferrer" className="hover:underline">Instagram ↗</a></li>}
                {fb && <li><a href={fb} target="_blank" rel="noreferrer" className="hover:underline">Facebook ↗</a></li>}
                <li><Link to={`${base}/track-order`} className="hover:underline">Track order</Link></li>
              </ul>
            </div>
          </div>
          <p className="border-t border-[color:var(--sf-border)] py-4 text-[10px] uppercase tracking-[0.15em] text-[color:var(--sf-muted-fg)]" style={MONO}>
            © {new Date().getFullYear()} {shop.name} — Powered by Vastra
          </p>
        </div>
      </footer>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[color:var(--sf-fg)] bg-[color:var(--sf-bg)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { to: base, label: 'Home', Icon: Home, end: true },
          { to: `${base}/products`, label: 'Shop', Icon: Store },
        ].map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-[0.15em] ${focus} ${isActive ? 'bg-[color:var(--sf-fg)] text-[color:var(--sf-bg)]' : ''}`}>
            <Icon size={18} aria-hidden="true" />{label}
          </NavLink>
        ))}
        <button type="button" onClick={() => { setOpen(true); window.scrollTo({ top: 0 }); }} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-[0.15em] ${focus}`}>
          <Search size={18} aria-hidden="true" />Search
        </button>
        <NavLink to={`${base}/cart`} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-[0.15em] ${focus} ${isActive ? 'bg-[color:var(--sf-fg)] text-[color:var(--sf-bg)]' : ''}`}>
          <ShoppingBag size={18} aria-hidden="true" />Bag ({cartCount})
        </NavLink>
      </nav>
    </div>
  );
}
