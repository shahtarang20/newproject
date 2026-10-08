import { darken, escapeXml, lighten, luminance, mix } from './colour';
import { DETAIL_VIEWBOX, anarkali, dungaree, frock, jacket, kurta, lehenga, saree, shirt, tee, trousers, type Ctx, type Kind, type Piece } from './shapes';

export type Pattern = 'none' | 'checks' | 'stripes' | 'floral' | 'buti' | 'embroidery' | 'denim';

/** Maps a product (name first, then category text) to the garment silhouette to draw. */
export function classify(name: string, type: string, categoryText = ''): Kind {
  const t = `${name} ${categoryText}`.toLowerCase();
  if (type === 'SAREE' || /saree|sari/.test(t)) return 'saree';
  if (/lehenga/.test(t)) return 'lehenga';
  if (/frock|party dress|dress/.test(t)) return 'frock';
  if (/dungaree/.test(t)) return 'dungaree';
  if (/kurta pajama|kurta set|nehru|bandhgala|kurta-set/.test(t)) return 'kurtaset';
  if (/anarkali/.test(t)) return 'anarkali';
  if (/kurti|kurta|ethnic/.test(t)) return 'kurta';
  if (/hoodie/.test(t)) return 'hoodie';
  if (/jacket|bomber|trucker/.test(t)) return 'jacket';
  if (/polo/.test(t)) return 'polo';
  if (/henley/.test(t)) return 'henley';
  if (/\btee\b|t-shirt|tshirt/.test(t)) return 'tee';
  if (/overshirt|shirt/.test(t)) return 'shirt';
  if (/jogger/.test(t)) return 'jogger';
  if (/cargo/.test(t)) return 'cargo';
  if (/palazzo/.test(t)) return 'palazzo';
  if (/jeans|denim/.test(t)) return 'jeans';
  if (/chino|trouser|pant|bottom/.test(t)) return 'chino';
  return 'shirt';
}

export function patternFor(name: string, kind: Kind): Pattern {
  const t = name.toLowerCase();
  if (/check|flannel|plaid/.test(t)) return 'checks';
  if (/stripe/.test(t)) return 'stripes';
  if (kind === 'saree' && /banarasi|kanjivaram|brocade|tissue|uppada|zari|temple|peacock/.test(t)) return 'buti';
  if (/jacquard|brocade/.test(t)) return 'buti';
  if (/floral|print|block|ruffle/.test(t)) return 'floral';
  if (/embroider|chikankari|cutdana|sequin|thread/.test(t)) return 'embroidery';
  if (/jeans|denim|trucker|overshirt/.test(t) && kind !== 'tee') return 'denim';
  return 'none';
}

function patternDef(p: Pattern, x: Ctx): string {
  switch (p) {
    case 'checks':
      return `<pattern id="pat" width="46" height="46" patternUnits="userSpaceOnUse"><rect width="46" height="10" fill="${x.dark}" fill-opacity=".3"/><rect width="10" height="46" fill="${x.dark}" fill-opacity=".3"/><rect y="24" width="46" height="3" fill="${x.light}" fill-opacity=".5"/><rect x="24" width="3" height="46" fill="${x.light}" fill-opacity=".5"/></pattern>`;
    case 'stripes':
      return `<pattern id="pat" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="9" height="30" fill="${x.dark}" fill-opacity=".24"/><rect x="14" width="2.5" height="30" fill="${x.light}" fill-opacity=".5"/></pattern>`;
    case 'floral':
      return `<pattern id="pat" width="72" height="72" patternUnits="userSpaceOnUse"><g fill="${x.accent}" fill-opacity=".85"><circle cx="18" cy="18" r="6"/><circle cx="50" cy="52" r="5"/></g><g fill="${x.light}" fill-opacity=".9"><circle cx="18" cy="18" r="2.5"/><circle cx="50" cy="52" r="2"/><circle cx="54" cy="14" r="3"/><circle cx="12" cy="56" r="3"/></g><path d="M30 34 q8 -8 16 0 q-8 8 -16 0Z" fill="${x.dark}" fill-opacity=".25"/></pattern>`;
    case 'buti':
      return `<pattern id="pat" width="46" height="54" patternUnits="userSpaceOnUse"><path d="M23 6 L33 26 L23 46 L13 26 Z" fill="${x.accent}" fill-opacity=".9"/><circle cx="23" cy="26" r="3.5" fill="${lighten(x.accent, 0.5)}"/><circle cx="0" cy="0" r="3" fill="${x.accent}" fill-opacity=".7"/><circle cx="46" cy="54" r="3" fill="${x.accent}" fill-opacity=".7"/></pattern>`;
    case 'embroidery':
      return `<pattern id="pat" width="38" height="38" patternUnits="userSpaceOnUse"><g stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"><path d="M10 10 l6 6 M16 10 l-6 6"/><path d="M29 29 l6 6 M35 29 l-6 6"/></g><circle cx="29" cy="12" r="2.2" fill="${x.accent}" fill-opacity=".9"/><circle cx="9" cy="30" r="2.2" fill="${x.accent}" fill-opacity=".9"/></pattern>`;
    case 'denim':
      return `<pattern id="pat" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 14 L14 0" stroke="${x.dark}" stroke-opacity=".2" stroke-width="1.6"/><path d="M-3 3 L3 -3 M11 17 L17 11" stroke="${x.dark}" stroke-opacity=".2" stroke-width="1.6"/></pattern>`;
    default:
      return '';
  }
}

const paint = (piece: Piece, x: Ctx, pattern: Pattern): string => `
  <g filter="url(#drop)">${piece.under ?? ''}${piece.body.map((d) => `<path d="${d}" fill="${x.c}"/>`).join('')}</g>
  ${pattern !== 'none' ? piece.body.map((d) => `<path d="${d}" fill="url(#pat)"/>`).join('') : ''}
  ${piece.body.map((d) => `<path d="${d}" fill="url(#shade)"/>`).join('')}
  ${piece.body.map((d) => `<path d="${d}" fill="none" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>`).join('')}
  ${piece.over ?? ''}`;

function drawKind(kind: Kind, x: Ctx, pattern: Pattern): string {
  switch (kind) {
    case 'shirt': return paint(shirt(x), x, pattern);
    case 'tee': return paint(tee(x, 'tee'), x, pattern);
    case 'polo': return paint(tee(x, 'polo'), x, pattern);
    case 'henley': return paint(tee(x, 'henley'), x, pattern);
    case 'kurta': return paint(kurta(x), x, pattern);
    case 'anarkali': return paint(anarkali(x), x, pattern);
    case 'jacket': return paint(jacket(x, false), x, pattern);
    case 'hoodie': return paint(jacket(x, true), x, pattern);
    case 'jeans':
    case 'chino':
    case 'cargo':
    case 'jogger':
    case 'palazzo': return paint(trousers(x, kind), x, pattern);
    case 'lehenga': return paint(lehenga(x), x, pattern);
    case 'frock': return paint(frock(x), x, pattern);
    case 'dungaree': return paint(dungaree(x), x, pattern);
    case 'saree': return paint(saree(x), x, pattern);
    case 'kurtaset': {
      const pants: Ctx = { ...x, c: darken(x.c, 0.08), dark: darken(x.dark, 0.05) };
      const vest = x.nehru
        ? `<path d="M300 215 L345 200 L400 520 L455 200 L500 215 L525 620 L275 620 Z" fill="${darken(x.accent, 0.25)}" stroke="#000" stroke-opacity=".35" stroke-width="3"/>${[300, 360, 420, 480, 540].map((y) => `<circle cx="400" cy="${y}" r="5" fill="${lighten(x.accent, 0.4)}"/>`).join('')}`
        : '';
      return `<g transform="translate(180 440) scale(.55)">${paint(trousers(pants, 'chino'), pants, pattern === 'denim' ? 'none' : pattern)}</g>
              <g transform="translate(120 20) scale(.7)">${paint(kurta(x), x, pattern)}${vest}</g>`;
    }
  }
}

export interface RenderOptions {
  kind: Kind;
  colour: string;
  accent: string;
  pattern: Pattern;
  alt: string;
  /** Crop to the kind's close-up window instead of the full garment. */
  detail?: boolean;
  /** Slightly rotated "styled" shot on a darker backdrop (used when a product has a single colour). */
  styled?: boolean;
  graphic?: boolean;
  nehru?: boolean;
  embroidered?: boolean;
}

export function renderGarmentSvg(o: RenderOptions): string {
  const c = o.colour;
  const ctx: Ctx = { c, dark: darken(c, luminance(c) > 0.75 ? 0.5 : 0.42), light: lighten(c, 0.45), accent: o.accent, graphic: o.graphic, nehru: o.nehru, embroidered: o.embroidered };
  const bgTop = o.styled ? mix('#d9cfc2', c, 0.12) : mix('#f7f2ec', c, 0.1);
  const bgBot = o.styled ? mix('#b9ad9e', c, 0.16) : mix('#e6ddd2', c, 0.14);
  const viewBox = o.detail ? DETAIL_VIEWBOX[o.kind] : '0 0 800 1000';
  const body = drawKind(o.kind, ctx, o.pattern);
  const group = o.styled ? `<g transform="rotate(-5 400 520) translate(0 -10)">${body}</g>` : body;
  const floor = o.detail || o.kind === 'saree' ? '' : `<ellipse cx="400" cy="948" rx="260" ry="22" fill="#000" fill-opacity=".1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="800" height="1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeXml(o.alt)}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bgTop}"/><stop offset="1" stop-color="${bgBot}"/></linearGradient>
  <linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="140" y1="120" x2="660" y2="940"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
  <filter id="drop" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000" flood-opacity=".22"/></filter>
  ${patternDef(o.pattern, ctx)}
</defs>
<rect x="-1200" y="-1200" width="3200" height="3400" fill="url(#bg)"/>
${floor}${group}
</svg>`;
}

/** Wide banner / square monogram art for shop logo, cover and category tiles. */
export function renderBrandSvg(kind: 'logo' | 'cover', name: string, primary: string): string {
  const light = lighten(primary, 0.88);
  const mid = lighten(primary, 0.35);
  const dark = darken(primary, 0.35);
  const initials = escapeXml(name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join(''));
  if (kind === 'logo') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="${escapeXml(name)} logo"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect width="256" height="256" fill="url(#g)"/><circle cx="128" cy="128" r="92" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/><text x="128" y="152" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="84" font-weight="700" fill="#fff">${initials}</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600" width="1600" height="600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeXml(name)} cover"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${primary}"/></linearGradient><pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M60 14 L84 60 L60 106 L36 60 Z" fill="none" stroke="${light}" stroke-opacity=".28" stroke-width="3"/><circle cx="60" cy="60" r="6" fill="${mid}" fill-opacity=".5"/></pattern></defs><rect width="1600" height="600" fill="url(#g)"/><rect width="1600" height="600" fill="url(#p)"/><rect width="1600" height="600" fill="#000" fill-opacity=".12"/></svg>`;
}
