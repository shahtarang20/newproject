import { useId } from 'react';

/** Marigold bunting / toran strip. */
export function Toran({ className = '' }: { className?: string }) {
  const colors = ['#ffb400', '#ff7a1a', '#d6246e', '#ffb400', '#8a2be2'];
  return (
    <svg aria-hidden viewBox="0 0 600 44" preserveAspectRatio="none" className={className}>
      <path d="M0 4 Q150 18 300 4 T600 4" fill="none" stroke="#ffb400" strokeWidth="2" />
      {Array.from({ length: 20 }, (_, i) => {
        const x = 15 + i * 30;
        return (
          <g key={i}>
            <path d={`M${x - 11} 7 L${x + 11} 7 L${x} 36 Z`} fill={colors[i % colors.length]} />
            <circle cx={x} cy="12" r="2.2" fill="#fff7e6" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
}

/** Rangoli / mandala pattern, tiled via SVG pattern. */
export function Rangoli({ className = '', opacity = 0.18 }: { className?: string; opacity?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden className={className} width="100%" height="100%" style={{ opacity }}>
      <defs>
        <pattern id={id} width="90" height="90" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#fff" strokeWidth="1.4">
            <circle cx="45" cy="45" r="30" />
            <circle cx="45" cy="45" r="14" />
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="45" cy="21" rx="5" ry="11" transform={`rotate(${i * 45} 45 45)`} />
            ))}
          </g>
          <g fill="#fff">
            <circle cx="0" cy="0" r="3" /><circle cx="90" cy="0" r="3" /><circle cx="0" cy="90" r="3" /><circle cx="90" cy="90" r="3" />
            <circle cx="45" cy="45" r="3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

const CONFETTI = [
  { l: '6%', t: '14%', c: '#ffb400', s: 14, shape: 'circle', d: 0 },
  { l: '18%', t: '78%', c: '#ff7a1a', s: 12, shape: 'tri', d: 1.2 },
  { l: '34%', t: '8%', c: '#ffffff', s: 10, shape: 'sq', d: 0.6 },
  { l: '52%', t: '86%', c: '#ffb400', s: 16, shape: 'circle', d: 1.8 },
  { l: '66%', t: '10%', c: '#ff7a1a', s: 12, shape: 'sq', d: 0.3 },
  { l: '80%', t: '70%', c: '#ffffff', s: 10, shape: 'tri', d: 2.2 },
  { l: '92%', t: '22%', c: '#ffb400', s: 14, shape: 'circle', d: 1 },
] as const;

/** CSS-only floating confetti; animation disabled under prefers-reduced-motion. */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes fb-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(25deg)}}
        .fb-conf{animation:fb-float 5s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.fb-conf{animation:none}}
      `}</style>
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className="fb-conf absolute block"
          style={{
            left: p.l, top: p.t, width: p.s, height: p.s, background: p.shape === 'tri' ? 'transparent' : p.c,
            borderRadius: p.shape === 'circle' ? '9999px' : p.shape === 'sq' ? '3px' : 0,
            borderLeft: p.shape === 'tri' ? `${p.s / 2}px solid transparent` : undefined,
            borderRight: p.shape === 'tri' ? `${p.s / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 'tri' ? `${p.s}px solid ${p.c}` : undefined,
            animationDelay: `${p.d}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Diya (oil lamp) motif. */
export function Diya({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 48" className={className}>
      <path d="M32 2 C38 10 40 15 32 22 C24 15 26 10 32 2Z" fill="#ffb400" />
      <path d="M32 9 C35 13 35 16 32 19 C29 16 29 13 32 9Z" fill="#ff7a1a" />
      <path d="M6 26 H58 C56 38 46 46 32 46 C18 46 8 38 6 26Z" fill="#ff7a1a" />
      <path d="M6 26 H58" stroke="#ffb400" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="37" r="2.5" fill="#ffb400" />
    </svg>
  );
}

/** Hanging lantern motif. */
export function Lantern({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 80" className={className}>
      <line x1="20" y1="0" x2="20" y2="14" stroke="#ffb400" strokeWidth="2" />
      <rect x="12" y="12" width="16" height="6" rx="2" fill="#ffb400" />
      <path d="M10 18 H30 C36 30 36 44 30 56 H10 C4 44 4 30 10 18Z" fill="#d6246e" />
      <path d="M20 18 V56 M12 22 C8 36 12 48 14 56 M28 22 C32 36 28 48 26 56" stroke="#ffb400" strokeWidth="1.2" fill="none" />
      <rect x="12" y="56" width="16" height="5" rx="2" fill="#ffb400" />
      <path d="M20 61 V70 M16 61 V67 M24 61 V67" stroke="#ff7a1a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Starburst({ className = '', fill = '#ffb400' }: { className?: string; fill?: string }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12;
    const r = i % 2 === 0 ? 50 : 40;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <polygon points={pts} fill={fill} />
    </svg>
  );
}
