import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { HeroProps } from '../types';
import { BTN } from './utils';
import { fetchPriority } from '@/utils/dom';

export function Hero({ shop, featured = [], catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const img = catalogue?.coverUrl ?? shop.coverUrl ?? featured[0]?.primaryImageUrl;
  const words = (catalogue?.name ?? shop.name).toUpperCase().split(/\s+/).slice(0, 4);
  const base = `/shop/${shop.slug}`;
  const sub = catalogue?.description ?? shop.description;
  return (
    <section aria-label={`${shop.name} hero`} className="relative isolate overflow-hidden border-b-2 border-[var(--sf-border)]">
      <div className="absolute inset-0 -z-10 bg-[var(--sf-card)]">
        {img ? (
          <img src={img} alt="" {...fetchPriority('high')} className="h-full w-full object-cover grayscale contrast-125" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent 0 22px, rgba(198,255,61,.08) 22px 24px), radial-gradient(circle at 80% 20%, rgba(255,90,31,.35), transparent 55%)',
            }}
          />
        )}
        {/* duotone: lime multiply + dark wash */}
        <div className="absolute inset-0 mix-blend-multiply" style={{ background: 'linear-gradient(120deg, #c6ff3d 0%, #ff5a1f 140%)', opacity: img ? 0.55 : 0 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--sf-bg)] via-[var(--sf-bg)]/50 to-transparent" />
      </div>
      <div className="mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-24 md:min-h-[86vh] md:pb-14">
        <p className="mb-3 inline-block w-fit -rotate-2 bg-[var(--sf-accent)] px-3 py-1 font-display text-sm uppercase tracking-widest text-black">
          {catalogue ? 'Fresh catalogue' : 'New drop · live now'}
        </p>
        <h1 className="font-display uppercase leading-[0.86] tracking-tight text-[var(--sf-fg)]" style={{ fontSize: 'clamp(3.5rem, 15vw, 11rem)' }}>
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="block"
              style={i % 2 ? { color: 'var(--sf-primary)', marginLeft: 'clamp(1rem, 8vw, 6rem)' } : undefined}
              initial={reduce ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {w}
            </motion.span>
          ))}
        </h1>
        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          {sub && <p className="max-w-md text-base text-[var(--sf-fg)]/80 md:text-lg">{sub.slice(0, 160)}</p>}
          <div className="flex flex-wrap gap-3">
            <Link to={`${base}/products`} className={`${BTN} bg-[var(--sf-primary)] text-[var(--sf-primary-fg)] !border-[var(--sf-primary)] shadow-[4px_4px_0_var(--sf-accent)] hover:-translate-x-0.5 hover:-translate-y-0.5`}>
              Shop the drop <ArrowUpRight size={18} />
            </Link>
            <Link to={`${base}/track-order`} className={`${BTN} hover:bg-[var(--sf-fg)] hover:text-[var(--sf-bg)]`}>Track order</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
