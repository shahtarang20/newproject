import { Link } from 'react-router-dom';
import { Instagram, Facebook } from 'lucide-react';
import type { PublicShop } from '@/types/storefront';
import { DAY_LABEL, digits, shopAddress, socialUrl } from './utils';
import { GoldRule } from './Ornaments';

export function Footer({ shop }: { shop: PublicShop }) {
  const addr = shopAddress(shop);
  const ig = socialUrl(shop.instagram, 'https://instagram.com/');
  const fb = socialUrl(shop.facebook, 'https://facebook.com/');
  const wa = digits(shop.whatsapp);
  const h = 'font-display text-sm uppercase tracking-[0.25em] text-[var(--sf-accent)]';
  const link = 'hover:text-[var(--sf-accent)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--sf-accent)]';
  return (
    <footer className="mt-20 bg-[var(--sf-primary)] pb-20 text-[var(--sf-primary-fg)]/85 md:pb-0">
      <div className="mx-auto max-w-6xl px-5 pt-12">
        <GoldRule />
        <div className="mt-10 grid gap-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-4">
          <div>
            <h2 className="font-display text-xl uppercase tracking-[0.2em] text-[var(--sf-accent)]">{shop.name}</h2>
            <p className="mt-3 text-sm italic leading-relaxed opacity-80">{shop.description?.slice(0, 140) ?? 'Woven with tradition, worn with grace.'}</p>
            <div className="mt-4 flex justify-center gap-4 sm:justify-start">
              {ig && <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className={link}><Instagram size={20} /></a>}
              {fb && <a href={fb} target="_blank" rel="noreferrer" aria-label="Facebook" className={link}><Facebook size={20} /></a>}
            </div>
          </div>
          <div>
            <h2 className={h}>Visit the House</h2>
            <address className="mt-3 space-y-1.5 text-sm not-italic">
              {addr && <p>{addr}</p>}
              {shop.phone && <p><a href={`tel:${shop.phone}`} className={link}>{shop.phone}</a></p>}
              {wa && shop.whatsappEnabled && <p><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={link}>WhatsApp concierge</a></p>}
              {shop.email && <p><a href={`mailto:${shop.email}`} className={link}>{shop.email}</a></p>}
            </address>
          </div>
          <div>
            <h2 className={h}>Hours</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {shop.businessHours.map((b) => (
                <li key={b.day} className="flex justify-between gap-4 border-b border-[var(--sf-accent)]/20 py-0.5">
                  <span>{DAY_LABEL[b.day] ?? b.day}</span>
                  <span>{b.open ? `${b.openTime ?? ''} – ${b.closeTime ?? ''}` : 'Closed'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={h}>Assistance</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className={link} to={`/shop/${shop.slug}/track-order`}>Track order</Link></li>
              <li><Link className={link} to={`/shop/${shop.slug}/products`}>The Collection</Link></li>
              <li><Link className={link} to={`/shop/${shop.slug}/cart`}>Shopping bag</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mt-10 border-t border-[var(--sf-accent)]/30 px-4 py-4 text-center text-xs uppercase tracking-[0.25em] text-[var(--sf-accent)]">
        © {new Date().getFullYear()} {shop.name} · Powered by Vastra
      </p>
    </footer>
  );
}
