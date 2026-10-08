import { GOLD } from './utils';

/** Gold foil hairline rule with a centred diamond. */
export function GoldRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden>
      <span className="h-px flex-1" style={{ background: GOLD }} />
      <span className="h-2 w-2 rotate-45" style={{ background: GOLD }} />
      <span className="h-px flex-1" style={{ background: GOLD }} />
    </div>
  );
}

const CORNER = 'M2 46 V10 Q2 2 10 2 H46 M10 46 V14 Q10 10 14 10 H46';

/** Ornate corner brackets for the four corners of the parent (parent must be relative). */
export function CornerBrackets({ size = 56, inset = 0 }: { size?: number; inset?: number }) {
  const pos = [
    'left-0 top-0', 'right-0 top-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90',
  ];
  return (
    <>
      {pos.map((c) => (
        <svg key={c} aria-hidden viewBox="0 0 48 48" width={size} height={size} className={`pointer-events-none absolute ${c}`} style={{ margin: inset }} fill="none">
          <defs>
            <linearGradient id="rs-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b8872b" />
              <stop offset=".5" stopColor="#f3d98b" />
              <stop offset="1" stopColor="#b8872b" />
            </linearGradient>
          </defs>
          <path d={CORNER} stroke="url(#rs-gold)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="14" cy="14" r="1.8" fill="#c9a24a" />
        </svg>
      ))}
    </>
  );
}

/** Crest monogram used when the shop has no logo. */
export function Crest({ letter }: { letter: string }) {
  return (
    <span aria-hidden className="relative grid h-14 w-14 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0" fill="none">
        <path d="M32 3 L56 14 V34 C56 47 45 57 32 61 C19 57 8 47 8 34 V14 Z" stroke="#c9a24a" strokeWidth="1.5" fill="var(--sf-primary)" />
        <path d="M32 8 L51 17 V34 C51 44 43 52 32 56 C21 52 13 44 13 34 V17 Z" stroke="#c9a24a" strokeWidth=".6" />
      </svg>
      <span className="relative font-display text-xl font-semibold text-[var(--sf-accent)]">{letter}</span>
    </span>
  );
}
