import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { HeroProps } from '../types';
import { Corner, Divider, PatternFallback } from './lib';
import { fetchPriority } from '@/utils/dom';

export default function Hero({ shop, featured, catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const cover = catalogue?.coverUrl ?? shop.coverUrl ?? featured?.find((p) => p.primaryImageUrl)?.primaryImageUrl;
  const title = catalogue?.name ?? shop.name;
  const text = catalogue?.description ?? shop.description;
  const fade = (d: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d } };

  return (
    <section aria-label={`${shop.name} introduction`} className="relative isolate overflow-hidden bg-[color:var(--sf-primary)]">
      {cover ? (
        <img src={cover} alt="" loading="eager" {...fetchPriority('high')} decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      ) : (
        <PatternFallback className="absolute inset-0 -z-10" />
      )}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--sf-primary) 55%, transparent), color-mix(in srgb, var(--sf-primary) 78%, #000))' }}
      />
      <div className="mx-auto flex min-h-[78vh] max-w-6xl items-center justify-center px-4 py-12 md:min-h-[640px] md:py-16">
        <div className="relative w-full max-w-3xl border border-[color:var(--sf-accent)] p-2 md:p-3">
          <div className="relative border border-[color:var(--sf-accent)]/70 px-5 py-12 text-center md:px-14 md:py-20">
            <Corner className="absolute left-1 top-1 h-12 w-12 md:h-16 md:w-16" />
            <Corner className="absolute right-1 top-1 h-12 w-12 rotate-90 md:h-16 md:w-16" />
            <Corner className="absolute bottom-1 left-1 h-12 w-12 -rotate-90 md:h-16 md:w-16" />
            <Corner className="absolute bottom-1 right-1 h-12 w-12 rotate-180 md:h-16 md:w-16" />
            {shop.logoUrl && (
              <motion.img {...fade(0)} src={shop.logoUrl} alt="" className="mx-auto mb-4 h-14 w-14 rounded-full border border-[color:var(--sf-accent)] object-cover" />
            )}
            <motion.p {...fade(0.05)} className="text-[11px] uppercase tracking-[0.4em] text-[color:var(--sf-accent)]">
              {catalogue ? 'The Collection' : 'Heritage · Handcrafted · Timeless'}
            </motion.p>
            <motion.h1 {...fade(0.15)} className="mt-4 font-display text-4xl font-semibold leading-[1.05] text-[#fbf5ea] md:text-7xl">
              {title}
            </motion.h1>
            <motion.div {...fade(0.25)}><Divider className="mx-auto mt-5 h-5 w-52" /></motion.div>
            {text && (
              <motion.p {...fade(0.3)} className="mx-auto mt-5 line-clamp-3 max-w-lg font-display text-lg italic text-[#fbf5ea]/85 md:text-xl">
                {text}
              </motion.p>
            )}
            <motion.div {...fade(0.4)} className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to={`/shop/${shop.slug}/products`}
                className="rounded-[var(--sf-btn-radius)] bg-[color:var(--sf-accent)] px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#2a1a14] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbf5ea]"
              >
                Explore the collection
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
