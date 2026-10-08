import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { HeroProps } from '../types';
import { initials } from './helpers';
import { fetchPriority } from '@/utils/dom';

export default function Hero({ shop, featured = [], catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const big = shop.coverUrl ?? catalogue?.coverUrl ?? featured[0]?.primaryImageUrl;
  const small = featured.find((p) => p.primaryImageUrl && p.primaryImageUrl !== big)?.primaryImageUrl ?? featured[1]?.primaryImageUrl;
  const fade = (d: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section aria-label={`Welcome to ${shop.name}`} className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-12 md:gap-6 md:px-8 md:pb-28 md:pt-20">
        <div className="md:col-span-5 md:pr-8">
          <motion.p {...fade(0)} className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--sf-accent)]">
            {catalogue ? 'The edit' : shop.businessType || 'Collection'}
          </motion.p>
          <motion.h1 {...fade(0.08)} className="mt-5 font-display text-[2.75rem] font-light leading-[1.02] tracking-tight md:text-[4.6rem]">
            {catalogue?.name ?? shop.name}
          </motion.h1>
          <motion.p {...fade(0.16)} className="mt-6 max-w-md text-base leading-relaxed text-[var(--sf-muted-fg)]">
            {catalogue?.description ?? shop.description ?? 'Considered pieces in natural fabrics, made to be lived in and loved for years.'}
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              to={`/shop/${shop.slug}/products`}
              className="inline-flex items-center gap-2 rounded-[var(--sf-btn-radius)] bg-[var(--sf-primary)] px-7 py-3.5 text-sm font-medium text-[var(--sf-primary-fg)] outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sf-bg)]"
            >
              Explore the collection
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to={`/shop/${shop.slug}/track-order`}
              className="text-sm underline decoration-[var(--sf-border)] underline-offset-[6px] transition-colors hover:decoration-[var(--sf-primary)]"
            >
              Track an order
            </Link>
          </motion.div>
        </div>

        <motion.div {...fade(0.2)} className="relative md:col-span-7 md:pl-10">
          <div aria-hidden className="absolute -right-4 top-10 h-[78%] w-[62%] rounded-[14px] bg-[var(--sf-sage-tint)] md:-right-8" />
          <div className="relative ml-auto aspect-[4/5] w-[82%] overflow-hidden rounded-[14px] bg-[var(--sf-muted)] shadow-[0_30px_60px_-30px_rgba(58,51,40,0.35)] md:w-[72%]">
            {big ? (
              <img src={big} alt={shop.name} loading="eager" {...fetchPriority('high')} decoding="async" className="h-full w-full object-cover" />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e9dccb] via-[#d9c4ad] to-[#c9a58c]">
                <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none">
                  {Array.from({ length: 24 }, (_, i) => (
                    <line key={i} x1={i * 4.4} y1="0" x2={i * 4.4 - 30} y2="100" stroke="#fff" strokeWidth="0.25" />
                  ))}
                </svg>
                <span className="relative font-display text-8xl font-light italic text-[var(--sf-fg)]/70">{initials(shop.name)}</span>
              </div>
            )}
          </div>
          <div className="absolute bottom-[-8%] left-0 aspect-square w-[44%] overflow-hidden rounded-[14px] border-[6px] border-[var(--sf-bg)] bg-[var(--sf-muted)] md:left-4 md:w-[36%]">
            {small ? (
              <img src={small} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />
            ) : shop.logoUrl ? (
              <img src={shop.logoUrl} alt="" className="h-full w-full object-contain p-6" />
            ) : (
              <div className="h-full w-full bg-[var(--sf-primary)]/80" />
            )}
          </div>
          <p className="absolute -bottom-6 right-2 hidden text-[11px] uppercase tracking-[0.25em] text-[var(--sf-muted-fg)] md:block">
            {shop.address.city ?? 'Handpicked'}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
