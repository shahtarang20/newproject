import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Facebook, Home, Instagram, LayoutGrid, MessageCircle, Phone, Search, ShoppingBag } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ShellProps } from '../types';
import { Diya, Lantern, Toran } from './Decor';
import { addressLine, dayLabel, initials, socialLink, waLink } from './helpers';

const focus = 'outline-none focus-visible:ring-4 focus-visible:ring-[var(--sf-accent)]/70';

export default function Shell({ shop, cartCount, categories, children, onSearch }: ShellProps) {
  const [q, setQ] = useState('');
  const [mSearch, setMSearch] = useState(false);
  const base = `/shop/${shop.slug}`;
  const wa = waLink(shop);
  const ig = socialLink(shop.instagram, 'https://instagram.com/');
  const fb = socialLink(shop.facebook, 'https://facebook.com/');
  const cats = categories.filter((c) => !c.parentId);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };
  const pill = ({ isActive }: { isActive: boolean }) =>
    cn('whitespace-nowrap rounded-full px-4 py-1.5 font-display text-[15px] font-semibold transition-colors', focus, isActive ? 'bg-[var(--sf-accent)] text-[var(--sf-fg)]' : 'text-white/90 hover:bg-white/15');

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-30 shadow-lg">
        <div className="bg-gradient-to-r from-[var(--sf-primary)] to-[var(--sf-fg)] text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:gap-6 md:px-8">
            <Link to={base} aria-label={`${shop.name} home`} className={cn('flex min-w-0 items-center gap-2.5 rounded-full', focus)}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--sf-accent)] bg-white font-display text-lg font-extrabold text-[var(--sf-primary)] md:h-12 md:w-12">
                {shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(shop.name)}
              </span>
              <span className="truncate font-display text-xl font-extrabold md:text-2xl">{shop.name}</span>
            </Link>
            <form onSubmit={submit} role="search" className="mx-auto hidden max-w-md flex-1 md:block">
              <label className="relative block">
                <span className="sr-only">Search products</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sarees, lehengas, kurtas..." className="w-full rounded-full border-2 border-transparent bg-white py-2 pl-5 pr-12 text-sm text-[var(--sf-fg)] outline-none placeholder:text-[var(--sf-muted-fg)] focus:border-[var(--sf-accent)]" />
                <button type="submit" aria-label="Search" className={cn('absolute right-1 top-1 rounded-full bg-[var(--sf-primary)] p-1.5 text-white', focus)}><Search className="h-4 w-4" /></button>
              </label>
            </form>
            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <Link to={`${base}/track-order`} className={cn('hidden rounded-full px-3 py-1.5 text-sm font-medium hover:bg-white/15 lg:block', focus)}>Track order</Link>
              {wa && shop.whatsappEnabled ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className={cn('rounded-full p-2 hover:bg-white/15', focus)}><MessageCircle className="h-5 w-5" /></a>
              ) : shop.phone ? (
                <a href={`tel:${shop.phone}`} aria-label="Call shop" className={cn('rounded-full p-2 hover:bg-white/15', focus)}><Phone className="h-5 w-5" /></a>
              ) : null}
              <Link to={`${base}/cart`} aria-label={`Cart, ${cartCount} items`} className={cn('relative rounded-full bg-[var(--sf-accent)] p-2.5 text-[var(--sf-fg)] transition-transform hover:scale-105', focus)}>
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-secondary)] px-1 text-[11px] font-bold text-white">{cartCount}</span>}
              </Link>
            </div>
          </div>
          {mSearch && (
            <form onSubmit={submit} role="search" className="px-4 pb-2.5 md:hidden">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search products..." className="w-full rounded-full bg-white px-5 py-2 text-sm text-[var(--sf-fg)] outline-none focus:ring-4 focus:ring-[var(--sf-accent)]/70" />
            </form>
          )}
          <nav aria-label="Categories" className="mx-auto max-w-7xl overflow-x-auto px-4 pb-2.5 md:px-8 [scrollbar-width:none]">
            <div className="flex gap-1.5">
              <NavLink to={`${base}/products`} className={pill}>All</NavLink>
              {cats.map((c) => <NavLink key={c.id} to={`${base}/category/${c.slug}`} className={pill}>{c.name}</NavLink>)}
            </div>
          </nav>
        </div>
        <Toran className="pointer-events-none -mt-px block h-6 w-full md:h-8" />
      </header>

      <main className="flex-1">{children}</main>

      <footer className="relative mt-16 overflow-hidden bg-[var(--sf-deep)] text-white/85">
        <div aria-hidden className="h-2 bg-[repeating-linear-gradient(90deg,var(--sf-accent)_0_16px,var(--sf-secondary)_16px_32px,var(--sf-primary)_32px_48px)]" />
        <Lantern className="absolute left-4 top-2 hidden h-20 opacity-90 md:block" />
        <Lantern className="absolute right-4 top-2 hidden h-16 opacity-90 md:block" />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 md:px-8">
          <div>
            <Diya className="h-10 w-12" />
            <p className="mt-2 font-display text-3xl font-extrabold text-[var(--sf-accent)]">{shop.name}</p>
            {shop.description && <p className="mt-3 max-w-sm text-sm leading-relaxed">{shop.description}</p>}
            <div className="mt-5 flex gap-2.5">
              {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={cn('rounded-full bg-white/10 p-2.5 hover:bg-[var(--sf-accent)] hover:text-[var(--sf-fg)]', focus)}><Instagram className="h-4 w-4" /></a>}
              {fb && <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={cn('rounded-full bg-white/10 p-2.5 hover:bg-[var(--sf-accent)] hover:text-[var(--sf-fg)]', focus)}><Facebook className="h-4 w-4" /></a>}
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--sf-accent)]">Visit & talk to us</h2>
            {addressLine(shop) && <address className="mt-3 text-sm not-italic leading-relaxed">{addressLine(shop)}</address>}
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              {shop.phone && <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-2 hover:text-[var(--sf-accent)]"><Phone className="h-4 w-4" aria-hidden />{shop.phone}</a>}
              {wa && shop.whatsappEnabled && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[var(--sf-accent)]"><MessageCircle className="h-4 w-4" aria-hidden />WhatsApp us</a>}
              <Link to={`${base}/track-order`} className="underline-offset-4 hover:text-[var(--sf-accent)] hover:underline">Track your order</Link>
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--sf-accent)]">Opening hours</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {shop.businessHours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4 border-b border-dashed border-white/15 pb-1">
                  <span>{dayLabel(h.day)}</span>
                  <span>{h.open && h.openTime ? `${h.openTime} - ${h.closeTime ?? ''}` : 'Closed'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
          &copy; {new Date().getFullYear()} {shop.name} &middot; Powered by Vastra
        </div>
      </footer>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 rounded-t-3xl border-t-2 border-[var(--sf-border)] bg-white shadow-[0_-6px_20px_rgba(58,20,80,0.12)] md:hidden">
        {[{ to: base, label: 'Home', Icon: Home, end: true }, { to: `${base}/products`, label: 'Shop', Icon: LayoutGrid, end: false }].map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', focus, isActive ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-muted-fg)]')}>
            <Icon className="h-5 w-5" aria-hidden />{label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMSearch((v) => !v)} className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-[var(--sf-muted-fg)]', focus)}>
          <Search className="h-5 w-5" aria-hidden />Search
        </button>
        <NavLink to={`${base}/cart`} className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', focus, isActive ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-muted-fg)]')}>
          <ShoppingBag className="h-5 w-5" aria-hidden />Cart
          {cartCount > 0 && <span className="absolute right-[26%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sf-primary)] px-1 text-[9px] font-bold text-white">{cartCount}</span>}
        </NavLink>
      </nav>
    </div>
  );
}
