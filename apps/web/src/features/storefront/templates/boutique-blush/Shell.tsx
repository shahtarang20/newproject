import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, Home, Instagram, Facebook, MessageCircle, Phone, Search, ShoppingBag, Store, X } from 'lucide-react';
import type { ShellProps } from '../types';
import { Blossom, SCRIPT, addressLine, dayLabel, hoursLabel, socialHref, waHref } from './lib';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)]';

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
  const pill = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all hover:bg-[color:var(--sf-accent)] hover:scale-105 ${focus} ${isActive ? 'bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)] hover:bg-[color:var(--sf-primary)]' : ''}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-3 z-40 mx-3 mt-3 md:mx-auto md:w-[min(1120px,calc(100%-2rem))]">
        <div className="rounded-full border border-white/70 bg-white/65 px-3 py-2 shadow-[var(--sf-shadow)] backdrop-blur-xl md:px-5">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to={base} aria-label={`${shop.name} home`} className={`flex items-center gap-2 rounded-full ${focus}`}>
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
              ) : (
                <Blossom className="h-8 w-8 text-[color:var(--sf-primary)]" />
              )}
              <span className="font-display text-lg font-bold italic leading-none md:text-xl">{shop.name}</span>
            </Link>
            <nav aria-label="Categories" className="mx-2 hidden flex-1 items-center justify-center gap-1 lg:flex">
              <NavLink end to={base} className={pill}>Home</NavLink>
              <NavLink to={`${base}/products`} className={pill}>Shop</NavLink>
              {categories.slice(0, 5).map((c) => <NavLink key={c.id} to={`${base}/category/${c.slug}`} className={pill}>{c.name}</NavLink>)}
            </nav>
            <div className="ml-auto flex items-center gap-1">
              <Link to={`${base}/track-order`} className={`hidden rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-[color:var(--sf-accent)] sm:block ${focus}`}>Track order</Link>
              <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Close search' : 'Search'} className={`rounded-full p-2 transition-transform hover:scale-110 hover:bg-[color:var(--sf-accent)] ${focus}`}>
                {open ? <X size={19} /> : <Search size={19} />}
              </button>
              <Link to={`${base}/cart`} aria-label={`Bag, ${cartCount} items`} className={`relative rounded-full bg-[color:var(--sf-primary)] p-2.5 text-[color:var(--sf-primary-fg)] transition-transform hover:scale-110 active:scale-90 ${focus}`}>
                <ShoppingBag size={18} />
                {cartCount > 0 && <span key={cartCount} className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-[bounce_.6s_1] items-center justify-center rounded-full bg-[color:var(--sf-fg)] px-1 text-[10px] font-bold text-white">{cartCount}</span>}
              </Link>
            </div>
          </div>
          {categories.length > 0 && (
            <nav aria-label="Categories" className="-mx-1 mt-2 overflow-x-auto [scrollbar-width:none] lg:hidden">
              <ul className="flex gap-1 px-1 pb-0.5">
                <li><NavLink to={`${base}/products`} className={pill}>All</NavLink></li>
                {categories.map((c) => <li key={c.id}><NavLink to={`${base}/category/${c.slug}`} className={pill}>{c.name}</NavLink></li>)}
              </ul>
            </nav>
          )}
        </div>
        {open && (
          <form role="search" onSubmit={submit} className="mt-2 flex items-center gap-2 rounded-full border border-white bg-white/90 py-1.5 pl-5 pr-1.5 shadow-[var(--sf-shadow)] backdrop-blur-xl">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search pretty things…" className="w-full bg-transparent font-display italic outline-none placeholder:text-[color:var(--sf-muted-fg)]" />
            <button type="submit" aria-label="Submit search" className={`rounded-full bg-[color:var(--sf-primary)] p-2.5 text-white ${focus}`}><Search size={16} /></button>
          </form>
        )}
      </header>

      <main id="main" className="flex-1 pb-24 md:pb-0">{children}</main>

      <footer className="mt-16 rounded-t-[40px] bg-[color:var(--sf-fg)] px-5 pb-28 pt-12 text-[#fdf0f2] md:pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <Blossom className="mx-auto h-9 w-9 text-[color:var(--sf-accent)]" />
            <p className="mt-2 font-display text-3xl font-bold italic">{shop.name}</p>
            <p className="text-2xl text-[color:var(--sf-accent)]" style={SCRIPT}>thank you for shopping with love</p>
          </div>
          <div className="mt-8 grid gap-6 text-sm md:grid-cols-3">
            <div className="rounded-3xl bg-white/5 p-5">
              <h2 className="font-display text-lg italic text-[color:var(--sf-accent)]">Find us</h2>
              <address className="mt-2 not-italic leading-relaxed opacity-85">{addressLine(shop) || 'Visit our boutique'}</address>
            </div>
            <div className="rounded-3xl bg-white/5 p-5">
              <h2 className="font-display text-lg italic text-[color:var(--sf-accent)]">Opening hours</h2>
              <ul className="mt-2 space-y-0.5 opacity-85">{shop.businessHours.map((h) => <li key={h.day} className="flex justify-between"><span>{dayLabel(h)}</span><span>{hoursLabel(h)}</span></li>)}</ul>
            </div>
            <div className="rounded-3xl bg-white/5 p-5">
              <h2 className="font-display text-lg italic text-[color:var(--sf-accent)]">Say hello</h2>
              <ul className="mt-2 space-y-1 opacity-90">
                {wa && <li><a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[color:var(--sf-accent)]"><MessageCircle size={14} /> WhatsApp</a></li>}
                {shop.phone && <li><a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 hover:text-[color:var(--sf-accent)]"><Phone size={14} /> {shop.phone}</a></li>}
                <li><Link to={`${base}/track-order`} className="hover:text-[color:var(--sf-accent)]">Track your order</Link></li>
              </ul>
              <div className="mt-3 flex gap-2">
                {ig && <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full bg-white/10 p-2 hover:bg-[color:var(--sf-primary)]"><Instagram size={16} /></a>}
                {fb && <a href={fb} target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-[color:var(--sf-primary)]"><Facebook size={16} /></a>}
              </div>
            </div>
          </div>
          <p className="mt-8 flex items-center justify-center gap-1 text-xs opacity-70">
            © {new Date().getFullYear()} {shop.name} · Powered by Vastra <Heart size={11} aria-hidden="true" className="fill-current" />
          </p>
        </div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-[calc(6rem+var(--sf-sticky-h,0px))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition-transform hover:scale-110 md:bottom-6">
          <MessageCircle size={22} />
        </a>
      )}

      <nav aria-label="Quick navigation" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-full border border-white/70 bg-white/80 p-1.5 shadow-[var(--sf-shadow)] backdrop-blur-xl pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
        {[
          { to: base, label: 'Home', Icon: Home, end: true },
          { to: `${base}/products`, label: 'Shop', Icon: Store },
        ].map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-bold transition-colors ${focus} ${isActive ? 'bg-[color:var(--sf-primary)] text-white' : 'text-[color:var(--sf-muted-fg)]'}`}>
            <Icon size={18} aria-hidden="true" />{label}
          </NavLink>
        ))}
        <button type="button" onClick={() => { setOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-bold text-[color:var(--sf-muted-fg)] ${focus}`}>
          <Search size={18} aria-hidden="true" />Search
        </button>
        <NavLink to={`${base}/cart`} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-bold transition-colors ${focus} ${isActive ? 'bg-[color:var(--sf-primary)] text-white' : 'text-[color:var(--sf-muted-fg)]'}`}>
          <ShoppingBag size={18} aria-hidden="true" />Cart
          {cartCount > 0 && <span className="absolute right-[24%] top-0 rounded-full bg-[color:var(--sf-fg)] px-1 text-[9px] text-white">{cartCount}</span>}
        </NavLink>
      </nav>
    </div>
  );
}
