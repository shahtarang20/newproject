import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { HeroProps } from '../types';
import { HatchFallback, MONO, pad } from './lib';
import { fetchPriority } from '@/utils/dom';

export default function Hero({ shop, featured, catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const title = catalogue?.name ?? shop.name;
  const strip = (featured ?? []).slice(0, 6);
  const cover = catalogue?.coverUrl ?? shop.coverUrl;
  const rise = (d: number) =>
    reduce ? {} : { initial: { y: '40%', opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.7, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } };

  return (
    <section aria-label={`${shop.name} introduction`} className="border-b border-[color:var(--sf-fg)]">
      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-8 md:px-8 md:pb-12 md:pt-14">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]" style={MONO}>
          <span>{shop.address.city ?? 'Collection'} / {new Date().getFullYear()}</span>
          <span>{catalogue ? 'Catalogue' : 'New season'}</span>
        </div>
        <div className="overflow-hidden">
          <motion.h1
            {...rise(0)}
            className="mt-4 break-words font-display text-[15vw] font-bold uppercase leading-[0.86] tracking-[-0.05em] md:text-[11vw]"
          >
            {title}
          </motion.h1>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-12 md:items-end">
          <p className="max-w-md text-sm leading-relaxed text-[color:var(--sf-muted-fg)] md:col-span-5">
            {catalogue?.description ?? shop.description ?? 'Considered garments. Quiet silhouettes. Made to be worn, not shown.'}
          </p>
          <div className="md:col-span-7 md:text-right">
            <Link
              to={`/shop/${shop.slug}/products`}
              className="group inline-flex items-center gap-3 bg-[color:var(--sf-primary)] px-6 py-3.5 text-[11px] uppercase tracking-[0.2em] text-[color:var(--sf-primary-fg)] transition-colors hover:bg-[color:var(--sf-muted-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--sf-fg)] [border-radius:var(--sf-btn-radius)]"
              style={MONO}
            >
              Shop all
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <div className="flex snap-x snap-mandatory overflow-x-auto border-t border-[color:var(--sf-fg)] [scrollbar-width:none]" aria-label="Featured">
        {strip.length === 0 && (
          <div className="relative aspect-[16/7] w-full">
            {cover ? <img src={cover} alt="" loading="eager" {...fetchPriority('high')} className="h-full w-full object-cover grayscale" /> : <HatchFallback className="h-full w-full" label={shop.name.slice(0, 1)} />}
          </div>
        )}
        {strip.map((p, i) => {
          const src = p.primaryImageUrl ?? p.media[0]?.url;
          return (
            <Link
              key={p.id}
              to={`/shop/${shop.slug}/product/${p.slug}`}
              className="group relative aspect-[3/4] w-[55%] shrink-0 snap-start border-r border-[color:var(--sf-fg)] last:border-r-0 sm:w-[33%] md:w-[20%] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--sf-fg)]"
              aria-label={p.name}
            >
              {src ? (
                <img src={src} alt="" loading={i < 3 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0 motion-reduce:transition-none" />
              ) : (
                <HatchFallback className="h-full w-full" label={pad(i + 1)} />
              )}
              <span className="absolute left-2 top-2 bg-[color:var(--sf-bg)] px-1.5 py-0.5 text-[10px]" style={MONO}>{pad(i + 1)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
