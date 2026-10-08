import { Link } from 'react-router-dom';
import { Instagram, Facebook, MapPin, Clock, Phone, MessageCircle, Mail } from 'lucide-react';
import type { PublicShop } from '@/types/storefront';
import { DAY_LABEL, digits, shopAddress, socialUrl } from './utils';

export function Footer({ shop }: { shop: PublicShop }) {
  const addr = shopAddress(shop);
  const ig = socialUrl(shop.instagram, 'https://instagram.com/');
  const fb = socialUrl(shop.facebook, 'https://facebook.com/');
  const wa = digits(shop.whatsapp);
  const h = 'font-display text-lg uppercase tracking-wider text-[var(--sf-primary)]';
  return (
    <footer className="mt-16 border-t-2 border-[var(--sf-border)] bg-[var(--sf-bg)] pb-24 md:pb-0">
      <div className="overflow-hidden border-b-2 border-[var(--sf-border)] py-6">
        <p aria-hidden className="select-none whitespace-nowrap font-display text-[18vw] uppercase leading-none text-transparent [-webkit-text-stroke:1px_var(--sf-border)] md:text-[10vw]">
          {shop.name}
        </p>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className={h}>{shop.name}</h2>
          {shop.description && <p className="mt-3 line-clamp-4 text-sm text-[var(--sf-muted-fg)]">{shop.description}</p>}
          <div className="mt-4 flex gap-2">
            {ig && <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="border-2 border-[var(--sf-border)] p-2 hover:border-[var(--sf-primary)] hover:text-[var(--sf-primary)]"><Instagram size={18} /></a>}
            {fb && <a href={fb} target="_blank" rel="noreferrer" aria-label="Facebook" className="border-2 border-[var(--sf-border)] p-2 hover:border-[var(--sf-primary)] hover:text-[var(--sf-primary)]"><Facebook size={18} /></a>}
          </div>
        </div>
        <div>
          <h2 className={h}>Find us</h2>
          <address className="mt-3 space-y-2 text-sm not-italic text-[var(--sf-muted-fg)]">
            {addr && <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" />{addr}</p>}
            {shop.phone && <p className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0" /><a href={`tel:${shop.phone}`} className="hover:text-[var(--sf-fg)]">{shop.phone}</a></p>}
            {wa && shop.whatsappEnabled && <p className="flex gap-2"><MessageCircle size={16} className="mt-0.5 shrink-0" /><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:text-[var(--sf-fg)]">WhatsApp us</a></p>}
            {shop.email && <p className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0" /><a href={`mailto:${shop.email}`} className="hover:text-[var(--sf-fg)]">{shop.email}</a></p>}
          </address>
        </div>
        <div>
          <h2 className={h}><Clock size={16} className="mr-2 inline" />Hours</h2>
          <ul className="mt-3 space-y-1 text-sm text-[var(--sf-muted-fg)]">
            {shop.businessHours.map((b) => (
              <li key={b.day} className="flex justify-between gap-4 border-b border-[var(--sf-border)] py-1">
                <span>{DAY_LABEL[b.day] ?? b.day}</span>
                <span>{b.open ? `${b.openTime ?? ''} – ${b.closeTime ?? ''}` : 'Closed'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={h}>Help</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-[var(--sf-primary)]" to={`/shop/${shop.slug}/track-order`}>Track order</Link></li>
            <li><Link className="hover:text-[var(--sf-primary)]" to={`/shop/${shop.slug}/products`}>All drops</Link></li>
            <li><Link className="hover:text-[var(--sf-primary)]" to={`/shop/${shop.slug}/cart`}>Your bag</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t-2 border-[var(--sf-border)] px-4 py-4 text-center text-xs uppercase tracking-widest text-[var(--sf-muted-fg)]">
        © {new Date().getFullYear()} {shop.name} · Powered by Vastra
      </div>
    </footer>
  );
}
