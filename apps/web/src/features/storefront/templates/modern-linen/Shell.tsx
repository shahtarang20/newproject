import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, LayoutGrid, MessageCircle, Phone, Search, ShoppingBag, X, Instagram, Facebook } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ShellProps } from '../types';
import { addressLine, dayLabel, socialLink, todayHours, waLink } from './helpers';

export default function Shell({ shop, cartCount, categories, children, onSearch }: ShellProps) {
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const base = `/shop/${shop.slug}`;
  const wa = waLink(shop);
  const ig = socialLink(shop.instagram, 'https://instagram.com/');
  const fb = socialLink(shop.facebook, 'https://facebook.com/');
  const topCats = categories.filter((c) => !c.parentId).slice(0, 5);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
    setSearchOpen(false);
  };
  const focus = 'outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sf-bg)]';
  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn('rounded px-1 py-1 text-sm transition-colors hover:text-[var(--sf-primary)]', focus, isActive && 'text-[var(--sf-primary)]');

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sf-bg)] pb-16 md:pb-0">
      <div className="bg-[var(--sf-fg)] text-[var(--sf-bg)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 text-[10px] uppercase tracking-[0.2em] md:px-8">
          <span className="truncate">{todayHours(shop) ?? 'Welcome'}</span>
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className={cn('hidden shrink-0 sm:inline', focus)}>
              Call {shop.phone}
            </a>
          )}
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 md:h-20 md:px-8">
          <Link to={base} className={cn('flex min-w-0 items-center gap-3 rounded', focus)} aria-label={`${shop.name} home`}>
            {shop.logoUrl && <img src={shop.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />}
            <span className="truncate font-display text-xl font-light tracking-tight md:text-2xl">{shop.name}</span>
          </Link>
          <nav aria-label="Categories" className="hidden flex-1 items-center justify-center gap-7 md:flex">
            <NavLink to={`${base}/products`} className={navCls}>All</NavLink>
            {topCats.map((c) => (
              <NavLink key={c.id} to={`${base}/category/${c.slug}`} className={navCls}>{c.name}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button type="button" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)} className={cn('rounded-full p-2.5 hover:bg-[var(--sf-muted)]', focus)}>
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <Link to={`${base}/track-order`} className={cn('hidden rounded px-2 py-1 text-sm hover:text-[var(--sf-primary)] lg:block', focus)}>Track order</Link>
            <Link to={`${base}/cart`} aria-label={`Cart, ${cartCount} items`} className={cn('relative rounded-full p-2.5 hover:bg-[var(--sf-muted)]', focus)}>
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--sf-primary)] px-1 text-[10px] font-medium text-[var(--sf-primary-fg)]">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={submit} role="search" className="border-t border-[var(--sf-border)] bg-[var(--sf-card)]">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
              <Search className="h-5 w-5 text-[var(--sf-muted-fg)]" aria-hidden />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search linen, cotton, kurtas..." className="flex-1 bg-transparent font-display text-xl font-light outline-none placeholder:text-[var(--sf-muted-fg)]/60" />
              <button type="submit" className="text-sm font-medium text-[var(--sf-primary)]">Search</button>
            </div>
          </form>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-[var(--sf-sage-tint)] md:mt-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-12 md:px-8 md:py-20">
          <div className="md:col-span-5">
            <p className="font-display text-3xl font-light">{shop.name}</p>
            {shop.description && <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--sf-fg)]/70">{shop.description}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {wa && shop.whatsappEnabled && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={cn('inline-flex items-center gap-2 rounded-[var(--sf-btn-radius)] bg-[var(--sf-fg)] px-5 py-2.5 text-sm text-[var(--sf-bg)]', focus)}>
                  <MessageCircle className="h-4 w-4" aria-hidden /> Chat on WhatsApp
                </a>
              )}
              {shop.phone && (
                <a href={`tel:${shop.phone}`} className={cn('inline-flex items-center gap-2 rounded-[var(--sf-btn-radius)] border border-[var(--sf-fg)]/30 px-5 py-2.5 text-sm', focus)}>
                  <Phone className="h-4 w-4" aria-hidden /> {shop.phone}
                </a>
              )}
            </div>
          </div>
          <div className="md:col-span-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--sf-accent)]">Visit</h2>
            {addressLine(shop) && <address className="mt-4 text-sm not-italic leading-relaxed">{addressLine(shop)}</address>}
            {shop.email && <a href={`mailto:${shop.email}`} className="mt-2 block text-sm underline-offset-4 hover:underline">{shop.email}</a>}
            <div className="mt-5 flex gap-3">
              {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={cn('rounded-full border border-[var(--sf-fg)]/25 p-2', focus)}><Instagram className="h-4 w-4" /></a>}
              {fb && <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={cn('rounded-full border border-[var(--sf-fg)]/25 p-2', focus)}><Facebook className="h-4 w-4" /></a>}
            </div>
          </div>
          <div className="md:col-span-4">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--sf-accent)]">Hours</h2>
            <ul className="mt-4 space-y-1.5 text-sm">
              {shop.businessHours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4 border-b border-[var(--sf-fg)]/10 pb-1.5">
                  <span>{dayLabel(h.day)}</span>
                  <span className="text-[var(--sf-fg)]/70">{h.open && h.openTime ? `${h.openTime} - ${h.closeTime ?? ''}` : 'Closed'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--sf-fg)]/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-[var(--sf-fg)]/60 md:px-8">
            <span>&copy; {new Date().getFullYear()} {shop.name}</span>
            <span>Powered by Vastra</span>
          </div>
        </div>
      </footer>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--sf-border)] bg-[var(--sf-card)]/95 backdrop-blur md:hidden">
        {[
          { to: base, label: 'Home', Icon: Home, end: true },
          { to: `${base}/products`, label: 'Shop', Icon: LayoutGrid },
        ].map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px]', focus, isActive ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-muted-fg)]')}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => { setSearchOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-[var(--sf-muted-fg)]', focus)}>
          <Search className="h-5 w-5" aria-hidden /> Search
        </button>
        <NavLink to={`${base}/cart`} className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px]', focus, isActive ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-muted-fg)]')}>
          <ShoppingBag className="h-5 w-5" aria-hidden /> Cart
          {cartCount > 0 && <span className="absolute right-[28%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sf-primary)] px-1 text-[9px] text-[var(--sf-primary-fg)]">{cartCount}</span>}
        </NavLink>
      </nav>
    </div>
  );
}
