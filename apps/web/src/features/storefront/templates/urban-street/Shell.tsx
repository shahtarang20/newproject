import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, LayoutGrid, MessageCircle, Menu, Search, ShoppingBag, Truck, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ShellProps } from '../types';
import { Marquee } from './Marquee';
import { Footer } from './Footer';
import { digits } from './utils';

export function Shell({ shop, cartCount, categories, children, onSearch }: ShellProps) {
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const base = `/shop/${shop.slug}`;
  const wa = digits(shop.whatsapp);

  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
    setSearchOpen(false);
    setMenu(false);
  };

  const iconBtn =
    'relative grid h-11 w-11 place-items-center border-2 border-[var(--sf-border)] hover:border-[var(--sf-primary)] hover:text-[var(--sf-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sf-primary)]';
  const cartLink = (
    <Link to={`${base}/cart`} aria-label={`Cart, ${cartCount} items`} className={iconBtn}>
      <ShoppingBag size={20} />
      {cartCount > 0 && (
        <span className="absolute -right-2 -top-2 grid h-5 min-w-5 -rotate-6 place-items-center bg-[var(--sf-accent)] px-1 text-[11px] font-bold text-black">
          {cartCount}
        </span>
      )}
    </Link>
  );
  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn('font-display text-sm uppercase tracking-[0.15em] py-1 border-b-2 transition-colors hover:text-[var(--sf-primary)]',
      isActive ? 'border-[var(--sf-primary)] text-[var(--sf-primary)]' : 'border-transparent');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#sf-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:bg-[var(--sf-primary)] focus:px-3 focus:py-2 focus:text-[var(--sf-primary-fg)]">Skip to content</a>
      <header className="sticky top-0 z-40 border-b-2 border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur">
        <Marquee items={[`${shop.name}`, 'NEW DROP LIVE', 'LIMITED RUN', 'WALK IN · SHOP ONLINE']} />
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button type="button" className={cn(iconBtn, 'md:hidden')} aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Menu size={22} />
          </button>
          <Link to={base} className="flex min-w-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sf-primary)]">
            {shop.logoUrl && <img src={shop.logoUrl} alt="" className="h-9 w-9 border-2 border-[var(--sf-fg)] object-cover" />}
            <span className="truncate font-display text-2xl uppercase leading-none tracking-wide md:text-3xl">{shop.name}</span>
          </Link>
          <nav aria-label="Categories" className="ml-6 hidden flex-1 items-center gap-5 md:flex">
            <NavLink to={`${base}/products`} className={navCls}>Shop all</NavLink>
            {categories.slice(0, 6).map((c) => (
              <NavLink key={c.id} to={`${base}/category/${c.slug}`} className={navCls}>{c.name}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={submit} role="search" className="hidden items-center md:flex">
              <label htmlFor="us-search" className="sr-only">Search products</label>
              <input id="us-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH" className="h-11 w-40 border-2 border-r-0 border-[var(--sf-border)] bg-transparent px-3 text-sm uppercase tracking-wider placeholder:text-[var(--sf-muted-fg)] focus:border-[var(--sf-primary)] focus:outline-none lg:w-56" />
              <button type="submit" aria-label="Search" className="grid h-11 w-11 place-items-center border-2 border-[var(--sf-primary)] bg-[var(--sf-primary)] text-[var(--sf-primary-fg)]"><Search size={18} /></button>
            </form>
            <Link to={`${base}/track-order`} className="hidden items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider hover:text-[var(--sf-primary)] lg:flex"><Truck size={16} />Track order</Link>
            {wa && shop.whatsappEnabled && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className={cn(iconBtn, 'hidden sm:grid')}><MessageCircle size={20} /></a>
            )}
            {cartLink}
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={submit} role="search" className="border-t-2 border-[var(--sf-border)] p-3 md:hidden">
            <label htmlFor="us-search-m" className="sr-only">Search products</label>
            <input id="us-search-m" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH THE DROP" className="h-12 w-full border-2 border-[var(--sf-primary)] bg-transparent px-3 uppercase tracking-wider focus:outline-none" />
          </form>
        )}
      </header>

      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[var(--sf-primary)] p-5 text-[var(--sf-primary-fg)]">
          <div className="flex items-center justify-between">
            <span className="font-display text-xl uppercase">{shop.name}</span>
            <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="grid h-12 w-12 place-items-center border-2 border-current"><X size={26} /></button>
          </div>
          <nav aria-label="Categories" className="mt-8 flex flex-1 flex-col gap-1">
            {[{ id: 'all', name: 'Shop all', to: `${base}/products` }, ...categories.map((c) => ({ id: c.id, name: c.name, to: `${base}/category/${c.slug}` }))].map((l) => (
              <Link key={l.id} to={l.to} onClick={() => setMenu(false)} className="border-b-2 border-black/20 py-2 font-display text-[13vw] uppercase leading-[1.05] hover:pl-3 hover:text-[var(--sf-accent)] sm:text-6xl" style={{ transition: 'padding .2s' }}>{l.name}</Link>
            ))}
            <Link to={`${base}/track-order`} onClick={() => setMenu(false)} className="py-3 font-display text-xl uppercase">Track order →</Link>
          </nav>
          <form onSubmit={submit} role="search" className="mt-4">
            <label htmlFor="us-search-menu" className="sr-only">Search products</label>
            <input id="us-search-menu" value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH" className="h-12 w-full border-2 border-black bg-transparent px-3 uppercase placeholder:text-black/60 focus:outline-none" />
          </form>
        </div>
      )}

      <main id="sf-main" className="flex-1">{children}</main>
      <Footer shop={shop} />

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-[var(--sf-fg)] bg-[var(--sf-bg)] md:hidden">
        {[
          { to: base, label: 'Home', Icon: Home, end: true },
          { to: `${base}/products`, label: 'Shop', Icon: LayoutGrid, end: false },
        ].map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold uppercase tracking-wider', isActive && 'bg-[var(--sf-primary)] text-[var(--sf-primary-fg)]')}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setSearchOpen((s) => !s)} aria-expanded={searchOpen} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold uppercase tracking-wider"><Search size={20} />Search</button>
        <Link to={`${base}/cart`} className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold uppercase tracking-wider">
          <ShoppingBag size={20} />Cart
          {cartCount > 0 && <span className="absolute right-1/4 top-1 grid h-4 min-w-4 place-items-center bg-[var(--sf-accent)] px-1 text-[10px] font-bold text-black">{cartCount}</span>}
        </Link>
      </nav>
    </div>
  );
}
