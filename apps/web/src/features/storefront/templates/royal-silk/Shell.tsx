import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, LayoutGrid, MessageCircle, Search, ShoppingBag, Truck } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ShellProps } from '../types';
import { Footer } from './Footer';
import { GoldRule, Crest } from './Ornaments';
import { digits } from './utils';

export function Shell({ shop, cartCount, categories, children, onSearch }: ShellProps) {
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const base = `/shop/${shop.slug}`;
  const wa = digits(shop.whatsapp);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
    setSearchOpen(false);
  };
  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn('relative whitespace-nowrap px-4 py-3 font-display text-[11px] uppercase tracking-[0.22em] transition-colors hover:text-[var(--sf-accent)] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-[var(--sf-accent)]',
      isActive && 'text-[var(--sf-accent)] after:absolute after:inset-x-4 after:bottom-1.5 after:h-px after:bg-[var(--sf-accent)]');
  const topLink = 'flex items-center gap-1.5 hover:text-[var(--sf-accent)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--sf-accent)]';

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#sf-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:bg-[var(--sf-primary)] focus:px-3 focus:py-2 focus:text-[var(--sf-primary-fg)]">Skip to content</a>
      <header className="sticky top-0 z-40 bg-[var(--sf-bg)] shadow-[0_1px_0_var(--sf-border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-2 text-[11px] italic text-[var(--sf-muted-fg)]">
          <span className="hidden sm:block">{shop.address.city ? `${shop.address.city} · Since generations` : 'Handwoven heritage'}</span>
          <div className="ml-auto flex items-center gap-4 not-italic tracking-wider">
            <Link to={`${base}/track-order`} className={topLink}><Truck size={14} />Track order</Link>
            {wa && shop.whatsappEnabled && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={topLink}><MessageCircle size={14} />WhatsApp</a>}
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2">
          <form onSubmit={submit} role="search" className="hidden max-w-[16rem] items-center border-b border-[var(--sf-accent)] md:flex">
            <label htmlFor="rs-search" className="sr-only">Search sarees</label>
            <input id="rs-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the collection" className="w-full bg-transparent py-2 text-sm italic placeholder:text-[var(--sf-muted-fg)] focus:outline-none" />
            <button type="submit" aria-label="Search" className="p-1.5 text-[var(--sf-primary)]"><Search size={16} /></button>
          </form>
          <button type="button" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((s) => !s)} className="grid h-10 w-10 place-items-center justify-self-start md:hidden"><Search size={20} /></button>
          <Link to={base} className="flex flex-col items-center gap-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sf-accent)]">
            {shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-14 w-14 rounded-full border border-[var(--sf-accent)] object-cover p-0.5" /> : <Crest letter={shop.name.charAt(0).toUpperCase()} />}
            <span className="font-display text-lg uppercase tracking-[0.28em] text-[var(--sf-primary)] md:text-2xl">{shop.name}</span>
          </Link>
          <div className="justify-self-end">
            <Link to={`${base}/cart`} aria-label={`Cart, ${cartCount} items`} className="relative grid h-10 w-10 place-items-center text-[var(--sf-primary)] hover:text-[var(--sf-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sf-accent)]">
              <ShoppingBag size={22} strokeWidth={1.5} />
              {cartCount > 0 && <span className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--sf-secondary)] px-1 text-[10px] font-semibold text-white">{cartCount}</span>}
            </Link>
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={submit} role="search" className="px-4 pb-3 md:hidden">
            <label htmlFor="rs-search-m" className="sr-only">Search sarees</label>
            <input id="rs-search-m" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the collection" className="w-full border-b border-[var(--sf-accent)] bg-transparent py-2 italic focus:outline-none" />
          </form>
        )}
        <GoldRule className="mx-auto max-w-7xl px-4" />
        <nav aria-label="Categories" className="bg-[var(--sf-primary)] text-[var(--sf-primary-fg)]">
          <div className="mx-auto flex max-w-7xl overflow-x-auto md:justify-center [scrollbar-width:none]">
            <NavLink to={`${base}/products`} className={navCls}>All Sarees</NavLink>
            {categories.map((c) => <NavLink key={c.id} to={`${base}/category/${c.slug}`} className={navCls}>{c.name}</NavLink>)}
          </div>
        </nav>
      </header>

      <main id="sf-main" className="flex-1">{children}</main>
      <Footer shop={shop} />

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--sf-accent)] bg-[var(--sf-primary)] text-[var(--sf-primary-fg)] md:hidden">
        {[{ to: base, label: 'Home', Icon: Home, end: true }, { to: `${base}/products`, label: 'Shop', Icon: LayoutGrid, end: false }].map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 font-display text-[10px] uppercase tracking-[0.15em]', isActive && 'text-[var(--sf-accent)]')}><Icon size={20} strokeWidth={1.5} />{label}</NavLink>
        ))}
        <button type="button" onClick={() => { setSearchOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex flex-col items-center gap-0.5 py-2 font-display text-[10px] uppercase tracking-[0.15em]"><Search size={20} strokeWidth={1.5} />Search</button>
        <Link to={`${base}/cart`} className="relative flex flex-col items-center gap-0.5 py-2 font-display text-[10px] uppercase tracking-[0.15em]">
          <ShoppingBag size={20} strokeWidth={1.5} />Cart
          {cartCount > 0 && <span className="absolute right-1/4 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-bold text-[var(--sf-primary)]">{cartCount}</span>}
        </Link>
      </nav>
    </div>
  );
}
