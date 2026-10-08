import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { HeroProps } from '../types';
import { Confetti, Rangoli } from './Decor';
import { initials } from './helpers';

const BLOBS = [
  'rounded-[60%_40%_55%_45%/50%_55%_45%_50%] rotate-[-4deg]',
  'rounded-[45%_55%_40%_60%/55%_45%_55%_45%] rotate-[5deg]',
  'rounded-[55%_45%_60%_40%/45%_60%_40%_55%] rotate-[-2deg]',
];

export default function Hero({ shop, featured = [], catalogue }: HeroProps) {
  const reduce = useReducedMotion();
  const imgs = [shop.coverUrl ?? catalogue?.coverUrl, ...featured.map((p) => p.primaryImageUrl)].filter(Boolean) as string[];
  const collage = Array.from(new Set(imgs)).slice(0, 3);

  return (
    <section aria-label={`Welcome to ${shop.name}`} className="relative isolate overflow-hidden bg-gradient-to-br from-[var(--sf-primary)] via-[#a3167a] to-[var(--sf-fg)] text-white">
      <Rangoli className="absolute inset-0 -z-10" opacity={0.14} />
      <Confetti />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 pb-14 pt-10 md:grid-cols-2 md:px-8 md:pb-20 md:pt-16">
        <div>
          <motion.span
            initial={reduce ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sf-accent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--sf-fg)]"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> {catalogue ? 'Festive edit' : 'Festival season is here'}
          </motion.span>
          <h1 className="mt-4 font-display text-[2.6rem] font-extrabold leading-[1.05] md:text-6xl">
            {catalogue?.name ?? <>Celebrate in <span className="text-[var(--sf-accent)]">colour</span> at {shop.name}</>}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            {catalogue?.description ?? shop.description ?? 'Sarees, suits and festive favourites for weddings, poojas and every happy occasion.'}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={`/shop/${shop.slug}/products`}
              className="rounded-[var(--sf-btn-radius)] bg-[var(--sf-accent)] px-7 py-3 font-display text-base font-bold text-[var(--sf-fg)] shadow-[0_4px_0_0_#d99a00] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-white/70"
            >
              Shop the collection
            </Link>
            <Link
              to={`/shop/${shop.slug}/track-order`}
              className="rounded-[var(--sf-btn-radius)] border-2 border-white/60 px-6 py-3 font-display text-base font-semibold outline-none transition-colors hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/70"
            >
              Track order
            </Link>
          </div>
        </div>

        <div className="relative mx-auto grid h-[320px] w-full max-w-md grid-cols-6 grid-rows-6 gap-3 md:h-[440px]">
          {collage.length === 0 ? (
            <div className="col-span-6 row-span-6 flex items-center justify-center rounded-[60%_40%_55%_45%/50%_55%_45%_50%] border-4 border-white/30 bg-white/10">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="h-32 w-32 rounded-full bg-white object-contain p-3" />
              ) : (
                <span className="font-display text-8xl font-extrabold text-[var(--sf-accent)]">{initials(shop.name)}</span>
              )}
            </div>
          ) : (
            collage.map((src, i) => (
              <motion.div
                key={src}
                animate={reduce ? undefined : { y: [0, i % 2 ? 8 : -8, 0] }}
                transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
                className={`overflow-hidden border-4 border-white shadow-xl ${BLOBS[i]} ${
                  i === 0 ? 'col-span-4 row-span-5 col-start-1 row-start-1' : i === 1 ? 'col-span-3 row-span-3 col-start-4 row-start-1 z-10' : 'col-span-3 row-span-3 col-start-3 row-start-4 z-10'
                }`}
              >
                <img src={src} alt={i === 0 ? shop.name : ''} loading="eager" decoding="async" className="h-full w-full object-cover" />
              </motion.div>
            ))
          )}
        </div>
      </div>
      <svg aria-hidden viewBox="0 0 1200 40" preserveAspectRatio="none" className="block h-6 w-full md:h-10">
        <path d="M0 40 V20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20 V40Z" fill="var(--sf-bg)" />
      </svg>
    </section>
  );
}
