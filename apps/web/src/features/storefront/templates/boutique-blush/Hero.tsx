import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { HeroProps } from '../types';
import { BlushFallback, Blossom, SCRIPT } from './lib';
import { fetchPriority } from '@/utils/dom';

export default function Hero({ shop, featured, catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const main = catalogue?.coverUrl ?? shop.coverUrl ?? featured?.find((p) => p.primaryImageUrl)?.primaryImageUrl;
  const small = (featured ?? []).filter((p) => p.primaryImageUrl && p.primaryImageUrl !== main).slice(0, 2);
  const pop = (d: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 24, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: 'spring' as const, stiffness: 140, damping: 14, delay: d } };

  return (
    <section aria-label={`${shop.name} introduction`} className="relative overflow-hidden px-4 pb-10 pt-6 md:pb-20 md:pt-12">
      <Blossom className="pointer-events-none absolute -left-8 top-24 h-40 w-40 text-[color:var(--sf-accent)]" />
      <Blossom className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 text-[color:var(--sf-accent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="order-2 text-center md:order-1 md:text-left">
          <motion.p {...pop(0)} className="text-3xl text-[color:var(--sf-primary)] md:text-4xl" style={SCRIPT}>
            {catalogue ? 'a little something new' : 'made with love, for you'}
          </motion.p>
          <motion.h1 {...pop(0.08)} className="mt-1 font-display text-4xl font-bold leading-[1.1] md:text-6xl">
            {catalogue?.name ?? shop.name}
            <span className="block font-medium italic text-[color:var(--sf-primary)]">
              {catalogue ? 'Collection' : 'Boutique'}
            </span>
          </motion.h1>
          <motion.p {...pop(0.16)} className="mx-auto mt-4 line-clamp-3 max-w-md text-[15px] leading-relaxed text-[color:var(--sf-muted-fg)] md:mx-0">
            {catalogue?.description ?? shop.description ?? 'Dreamy pieces for every celebration, curated softly and delivered with care.'}
          </motion.p>
          <motion.div {...pop(0.24)} className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              to={`/shop/${shop.slug}/products`}
              className="inline-flex items-center gap-2 rounded-[var(--sf-btn-radius)] bg-[color:var(--sf-primary)] px-7 py-3 text-sm font-bold text-[color:var(--sf-primary-fg)] shadow-[0_12px_24px_-10px_var(--sf-primary)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-primary)] motion-reduce:transition-none"
            >
              <Sparkles size={16} aria-hidden="true" /> Shop the collection
            </Link>
          </motion.div>
        </div>

        <motion.div {...pop(0.1)} className="relative order-1 mx-auto w-full max-w-sm md:order-2 md:max-w-md">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[32px] border-[6px] border-white shadow-[var(--sf-shadow)]">
            {main ? (
              <img src={main} alt="" loading="eager" {...fetchPriority('high')} decoding="async" className="h-full w-full object-cover" />
            ) : (
              <BlushFallback className="h-full w-full" label={shop.name.charAt(0)} />
            )}
          </div>
          {small.map((p, i) => (
            <Link
              key={p.id}
              to={`/shop/${shop.slug}/product/${p.slug}`}
              aria-label={p.name}
              className={`absolute h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-[var(--sf-shadow)] transition-transform hover:scale-110 motion-reduce:transition-none md:h-28 md:w-28 ${i === 0 ? '-left-3 bottom-8 md:-left-8' : '-right-2 top-10 md:-right-6'}`}
            >
              <img src={p.primaryImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            </Link>
          ))}
          {!reduce && <Blossom className="absolute -right-3 -top-3 h-12 w-12 animate-[spin_18s_linear_infinite] text-[color:var(--sf-primary)]" />}
        </motion.div>
      </div>
    </section>
  );
}
