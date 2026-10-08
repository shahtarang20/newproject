import { motion, useReducedMotion } from 'framer-motion';
import { IndianRupee, PackageCheck, TrendingUp } from 'lucide-react';

const TILES = [
  ['#f3d9de', '#c2476b'],
  ['#e9dcc0', '#5b1226'],
  ['#d9e2f3', '#0c1b4d'],
  ['#ffe9a8', '#d6246e'],
];

/** Pure CSS/SVG hero visual: phone storefront + floating dashboard cards. No external images. */
export function ProductMockup() {
  const reduce = useReducedMotion();
  const float = (d: number) => (reduce ? {} : { animate: { y: [0, -8, 0] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const, delay: d } });
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[560px]" aria-hidden>
      <div className="absolute inset-0 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/20 via-violet-400/10 to-transparent blur-3xl" />
      {/* dashboard card */}
      <motion.div {...float(0.4)} className="absolute left-0 top-10 z-10 w-60 rounded-2xl border bg-card/90 p-4 shadow-float backdrop-blur sm:w-64">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Today</span>
          <span className="flex items-center gap-1 text-success"><TrendingUp className="h-3 w-3" /> Orders</span>
        </div>
        <div className="mt-2 flex items-end gap-1 text-foreground">
          <IndianRupee className="mb-1 h-4 w-4" />
          <span className="text-3xl font-semibold tracking-tight">12,480</span>
        </div>
        <svg viewBox="0 0 200 50" className="mt-3 h-12 w-full text-primary" fill="none">
          <path d="M0 40 C20 38 30 20 50 24 S80 44 100 28 S140 6 160 14 S190 10 200 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0 40 C20 38 30 20 50 24 S80 44 100 28 S140 6 160 14 S190 10 200 4 V50 H0Z" fill="currentColor" opacity="0.1" />
        </svg>
      </motion.div>
      {/* phone */}
      <div className="absolute left-1/2 top-0 h-[500px] w-[250px] -translate-x-[40%] rounded-[2.5rem] border-[7px] border-foreground/90 bg-background shadow-float sm:w-[260px]">
        <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground/90" />
        <div className="flex h-full flex-col overflow-hidden rounded-[2rem] pt-8">
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="font-serif text-sm font-semibold" style={{ color: '#5b1226' }}>Shree Fashion</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px]">2</span>
          </div>
          <div className="mx-3 flex h-28 items-end rounded-2xl p-3" style={{ background: 'linear-gradient(135deg,#5b1226,#8a2340)' }}>
            <div>
              <div className="h-2 w-20 rounded-full" style={{ background: '#c9a24a' }} />
              <div className="mt-1.5 h-1.5 w-12 rounded-full bg-white/60" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 px-3">
            {TILES.map(([bg, c], i) => (
              <div key={i}>
                <div className="relative aspect-[3/4] rounded-xl" style={{ background: bg }}>
                  <div className="absolute inset-x-3 bottom-3 top-4 rounded-md opacity-25" style={{ background: c }} />
                </div>
                <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-foreground/50" />
                <div className="mt-1 h-1.5 w-1/3 rounded-full" style={{ background: c }} />
              </div>
            ))}
          </div>
          <div className="mt-auto m-3 rounded-xl bg-[#25d366] py-2 text-center text-[11px] font-semibold text-white">Enquire on WhatsApp</div>
        </div>
      </div>
      {/* order card */}
      <motion.div {...float(1.2)} className="absolute bottom-10 right-0 z-10 w-56 rounded-2xl border bg-card/90 p-4 shadow-float backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success"><PackageCheck className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-semibold">New order</p>
            <p className="text-xs text-muted-foreground">Cash on delivery</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {['New', 'Packed', 'Shipped'].map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
