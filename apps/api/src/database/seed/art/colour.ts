/** Tiny hex colour helpers for the generated seed artwork. */
type Rgb = [number, number, number];

const clamp = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

export function toRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const toHex = ([r, g, b]: Rgb): string => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

export const lighten = (hex: string, t: number): string => mix(hex, '#ffffff', t);
export const darken = (hex: string, t: number): string => mix(hex, '#000000', t);

/** Perceived brightness 0..1. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const escapeXml = (s: string): string => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] as string);
