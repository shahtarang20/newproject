import { Clock, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import type { PublicShop } from '@/types/storefront';
import { humanize } from './lib';
import { WhatsAppButton } from './WhatsAppButton';

export function formatAddress(a: PublicShop['address']): string {
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}

const social = (v: string | undefined, base: string) => (v ? (v.startsWith('http') ? v : `${base}${v.replace(/^@/, '')}`) : undefined);

export function ShopInfoBlock({ shop }: { shop: PublicShop }) {
  const address = formatAddress(shop.address);
  const ig = social(shop.instagram, 'https://instagram.com/');
  const fb = social(shop.facebook, 'https://facebook.com/');
  const hours = shop.businessHours.filter((h) => h.open && h.openTime && h.closeTime);
  const row = 'flex items-start gap-3 text-sm';
  const icon = 'mt-0.5 h-4 w-4 shrink-0 text-[color:var(--sf-primary)]';
  return (
    <div className="grid gap-8 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-6 md:grid-cols-2 md:p-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">About {shop.name}</h2>
        {shop.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[color:var(--sf-muted-fg)]">{shop.description}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <WhatsAppButton label="Chat with us" buttonVariant="primary" message={`Hello ${shop.name}, I would like to know more about your collection.`} />
        </div>
      </div>
      <address className="space-y-3 not-italic">
        <h2 className="font-display text-2xl font-semibold">Visit or contact us</h2>
        {address && (
          <p className={row}>
            <MapPin className={icon} aria-hidden="true" />
            <a className="hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${address}`)}`}>
              {address}
            </a>
          </p>
        )}
        {shop.phone && (
          <p className={row}>
            <Phone className={icon} aria-hidden="true" />
            <a className="hover:underline" href={`tel:${shop.phone}`}>{shop.phone}</a>
          </p>
        )}
        {shop.email && (
          <p className={row}>
            <Mail className={icon} aria-hidden="true" />
            <a className="break-all hover:underline" href={`mailto:${shop.email}`}>{shop.email}</a>
          </p>
        )}
        {hours.length > 0 && (
          <div className={row}>
            <Clock className={icon} aria-hidden="true" />
            <ul className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
              {hours.map((h) => (
                <li key={h.day} className="contents">
                  <span className="text-[color:var(--sf-muted-fg)]">{humanize(h.day).slice(0, 3)}</span>
                  <span>
                    {h.openTime} – {h.closeTime}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(ig || fb) && (
          <p className="flex gap-3 pt-1">
            {ig && (
              <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full border border-[color:var(--sf-border)] p-2 hover:text-[color:var(--sf-primary)]">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {fb && (
              <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full border border-[color:var(--sf-border)] p-2 hover:text-[color:var(--sf-primary)]">
                <Facebook className="h-4 w-4" />
              </a>
            )}
          </p>
        )}
      </address>
    </div>
  );
}
