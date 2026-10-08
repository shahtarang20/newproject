import { Fragment } from 'react';

/** CSS-only ticker; pauses on hover/focus and under reduced motion. */
export function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <Fragment key={i}>
          <li className="whitespace-nowrap px-4 font-display text-[13px] uppercase tracking-[0.18em]">{t}</li>
          <li aria-hidden className="text-[var(--sf-accent)]">✦</li>
        </Fragment>
      ))}
    </ul>
  );
  return (
    <div
      className="us-marquee group overflow-hidden bg-[var(--sf-primary)] py-1.5 text-[var(--sf-primary-fg)]"
      role="marquee"
      aria-label={items[0]}
    >
      <style>{`
        @keyframes us-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .us-track{display:flex;width:max-content;animation:us-scroll 28s linear infinite}
        .us-marquee:hover .us-track,.us-marquee:focus-within .us-track{animation-play-state:paused}
        @media (prefers-reduced-motion:reduce){.us-track{animation:none}}
      `}</style>
      <div className="us-track">
        {row(false)}
        {row(true)}
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}
