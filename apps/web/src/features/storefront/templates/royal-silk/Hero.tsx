import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { HeroProps } from '../types';
import { CornerBrackets, GoldRule } from './Ornaments';
import { BTN, GOLD } from './utils';
import { fetchPriority } from '@/utils/dom';

export function Hero({ shop, featured = [], catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const img = catalogue?.coverUrl ?? shop.coverUrl ?? featured[0]?.primaryImageUrl;
  const title = catalogue?.name ?? shop.name;
  const blurb = catalogue?.description ?? shop.description ?? 'Hand-picked weaves, zari borders and heirloom drapes, curated for the moments that matter.';
  const base = `/shop/${shop.slug}`;
  return (
    <section aria-label={`${shop.name} hero`} className="bg-[var(--sf-bg)]">
      <style>{`
        @keyframes rs-shimmer{0%{transform:translateY(-120%)}100%{transform:translateY(520%)}}
        .rs-zari{animation:rs-shimmer 5s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.rs-zari{animation:none;opacity:0}}
      `}</style>
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:gap-12 md:py-16 lg:px-8">
        <motion.div
          className="relative order-2 px-8 py-12 text-center md:order-1 md:px-14 md:text-left"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <CornerBrackets />
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[var(--sf-secondary)]">{catalogue ? 'The Collection' : 'Handloom · Zari · Heritage'}</p>
          <h1 className="mt-4 font-display text-3xl font-semibold uppercase leading-[1.15] tracking-[0.08em] text-[var(--sf-primary)] md:text-5xl">{title}</h1>
          <GoldRule className="my-5 md:max-w-[12rem]" />
          <p className="font-body italic leading-relaxed text-[var(--sf-muted-fg)] md:text-lg">{blurb.slice(0, 180)}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link to={`${base}/products`} className={`${BTN} bg-[var(--sf-primary)] text-[var(--sf-primary-fg)] hover:bg-[var(--sf-secondary)]`}>Explore the collection</Link>
            <Link to={`${base}/track-order`} className={`${BTN} border border-[var(--sf-accent)] text-[var(--sf-primary)] hover:bg-[var(--sf-muted)]`}>Track order</Link>
          </div>
        </motion.div>

        <div className="order-1 mx-auto w-full max-w-md md:order-2 md:max-w-none">
          <div className="relative p-2.5" style={{ background: GOLD }}>
            <div className="relative aspect-[3/4] overflow-hidden bg-[var(--sf-primary)]">
              {img ? (
                <img src={img} alt={`${shop.name} showcase`} {...fetchPriority('high')} width={900} height={1200} className="h-full w-full object-cover" />
              ) : (
                <div aria-hidden className="grid h-full w-full place-items-center" style={{
                  backgroundImage: 'radial-gradient(circle at 50% 38%, rgba(201,162,74,.35), transparent 55%), repeating-linear-gradient(45deg, transparent 0 14px, rgba(201,162,74,.12) 14px 15px), repeating-linear-gradient(-45deg, transparent 0 14px, rgba(201,162,74,.12) 14px 15px), linear-gradient(160deg,#0c1b4d,#0b5d4b)',
                }}>
                  <span className="font-display text-7xl text-[var(--sf-accent)] opacity-80">{shop.name.charAt(0)}</span>
                </div>
              )}
              <span aria-hidden className="absolute inset-y-0 right-5 w-px" style={{ background: 'linear-gradient(180deg,#b8872b,#f3d98b,#b8872b)' }} />
              <span aria-hidden className="rs-zari absolute right-[18px] top-0 h-24 w-[7px] blur-[2px]" style={{ background: 'linear-gradient(180deg,transparent,#fff6cf,transparent)' }} />
              <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#f3d98b]/60" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
