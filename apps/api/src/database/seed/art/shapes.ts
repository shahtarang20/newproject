/**
 * Garment silhouettes drawn on an 800x1000 canvas, centred on x=400. Each returns the body outline(s) plus
 * detail markup; the composer adds colour, fabric pattern, shading and outline on top.
 */
import { darken, lighten } from './colour';

export type Kind =
  | 'shirt' | 'tee' | 'polo' | 'henley' | 'kurta' | 'anarkali' | 'kurtaset' | 'jacket' | 'hoodie'
  | 'jeans' | 'chino' | 'cargo' | 'jogger' | 'palazzo' | 'lehenga' | 'frock' | 'dungaree' | 'saree';

export interface Ctx {
  c: string;
  dark: string;
  light: string;
  accent: string;
  /** Extra look flags derived from the product name. */
  graphic?: boolean;
  nehru?: boolean;
  embroidered?: boolean;
}

export interface Piece {
  under?: string;
  body: string[];
  over?: string;
}

const buttons = (x: number, ys: number[], r = 6): string =>
  ys.map((y) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".9" stroke="#000" stroke-opacity=".25" stroke-width="1.5"/>`).join('');

const stitch = (d: string, o = '#000'): string => `<path d="${d}" fill="none" stroke="${o}" stroke-opacity=".28" stroke-width="2" stroke-dasharray="7 6" stroke-linecap="round"/>`;
const seam = (d: string, o = '#000'): string => `<path d="${d}" fill="none" stroke="${o}" stroke-opacity=".22" stroke-width="2.5" stroke-linecap="round"/>`;

function graphicPrint(x: Ctx): string {
  return `<g opacity=".92"><circle cx="400" cy="470" r="62" fill="${x.accent}"/><circle cx="400" cy="470" r="44" fill="none" stroke="#fff" stroke-width="5"/><path d="M372 490 L400 440 L428 490 Z" fill="#fff"/></g>`;
}

export function shirt(x: Ctx): Piece {
  return {
    body: ['M255 245 L335 212 Q400 250 465 212 L545 245 L660 540 L596 566 L548 450 L548 850 Q400 872 252 850 L252 450 L204 566 L140 540 Z'],
    over: `
      <path d="M335 212 L402 292 L356 338 L300 240 Z" fill="${lighten(x.c, 0.12)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>
      <path d="M465 212 L398 292 L444 338 L500 240 Z" fill="${lighten(x.c, 0.12)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>
      <rect x="392" y="292" width="16" height="560" fill="${x.dark}" fill-opacity=".1"/>
      ${buttons(400, [350, 425, 500, 575, 650, 725, 800])}
      <rect x="288" y="404" width="82" height="92" rx="4" fill="none" stroke="${x.dark}" stroke-opacity=".4" stroke-width="3"/>
      ${seam('M252 450 L204 566')}${seam('M548 450 L596 566')}${stitch('M262 838 Q400 858 538 838')}`,
  };
}

export function tee(x: Ctx, variant: 'tee' | 'polo' | 'henley' = 'tee'): Piece {
  const neck =
    variant === 'tee'
      ? `<path d="M318 238 Q400 322 482 238" fill="none" stroke="${x.dark}" stroke-opacity=".38" stroke-width="16" stroke-linecap="round"/>`
      : `<path d="M330 232 L400 300 L470 232 L494 252 L400 330 L306 252 Z" fill="${lighten(x.c, 0.1)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>
         <rect x="390" y="300" width="20" height="${variant === 'polo' ? 120 : 200}" fill="${x.dark}" fill-opacity=".12"/>${buttons(400, variant === 'polo' ? [335, 385] : [335, 390, 445])}`;
  return {
    body: ['M268 232 Q400 300 532 232 L664 336 L598 414 L548 372 L548 820 Q400 842 252 820 L252 372 L202 414 L136 336 Z'],
    over: `${neck}${x.graphic ? graphicPrint(x) : ''}${stitch('M262 806 Q400 826 538 806')}${seam('M252 372 L202 414')}${seam('M548 372 L598 414')}`,
  };
}

export function kurta(x: Ctx): Piece {
  return {
    body: ['M296 205 L338 192 Q400 240 462 192 L504 205 L650 340 L596 408 L528 338 L540 905 L260 905 L272 338 L204 408 L150 340 Z'],
    over: `
      <path d="M338 192 Q400 242 462 192 L462 224 Q400 274 338 224 Z" fill="${lighten(x.c, 0.1)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>
      <rect x="394" y="240" width="12" height="330" fill="${x.dark}" fill-opacity=".14"/>
      ${buttons(400, [285, 355, 425, 495], 5.5)}
      ${x.embroidered ? `<path d="M360 250 Q400 300 440 250" fill="none" stroke="${x.accent}" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/>` : ''}
      ${seam('M272 338 L204 408')}${seam('M528 338 L596 408')}${seam('M274 820 L272 905')}${seam('M526 820 L528 905')}${stitch('M270 880 L530 880')}`,
  };
}

export function anarkali(x: Ctx): Piece {
  return {
    body: ['M312 205 L346 194 Q400 236 454 194 L488 205 L560 262 L548 330 L540 430 L706 905 Q400 950 94 905 L260 430 L252 330 L240 262 Z'],
    over: `
      <path d="M346 194 Q400 292 454 194" fill="none" stroke="${x.dark}" stroke-opacity=".4" stroke-width="10" stroke-linecap="round"/>
      ${seam('M260 430 Q400 462 540 430')}
      ${[300, 340, 400, 460, 500].map((px, i) => `<path d="M${px - 40 + i * 20} 450 Q${px - 60 + i * 24} 700 ${px - 140 + i * 70} 920" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/>`).join('')}
      <path d="M118 880 Q400 938 682 880" fill="none" stroke="${x.accent}" stroke-width="16" stroke-linecap="round"/>
      ${x.embroidered ? `<path d="M240 262 Q250 330 260 430 M560 262 Q550 330 540 430" fill="none" stroke="${x.accent}" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>` : ''}`,
  };
}

export function jacket(x: Ctx, hood = false): Piece {
  const body = 'M252 238 L336 204 Q400 238 464 204 L548 238 L662 606 L592 632 L546 424 L546 806 L254 806 L254 424 L208 632 L138 606 Z';
  const under = hood ? `<path d="M316 224 Q300 100 400 92 Q500 100 484 224 Q400 270 316 224 Z" fill="${darken(x.c, 0.1)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3"/>` : '';
  return {
    under,
    body: [body],
    over: `
      ${hood
        ? `<path d="M336 204 Q400 262 464 204" fill="none" stroke="${x.dark}" stroke-opacity=".45" stroke-width="8"/>
           <path d="M370 258 L368 360 M430 258 L432 360" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-linecap="round"/>
           <path d="M296 600 L504 600 L526 762 L274 762 Z" fill="${x.dark}" fill-opacity=".12" stroke="${x.dark}" stroke-opacity=".4" stroke-width="3"/>`
        : `<path d="M336 204 Q400 240 464 204 L472 252 Q400 292 328 252 Z" fill="${darken(x.c, 0.12)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3"/>
           <rect x="254" y="778" width="292" height="52" rx="6" fill="${darken(x.c, 0.12)}" stroke="${x.dark}" stroke-opacity=".4" stroke-width="3"/>
           ${seam('M290 560 L330 640')}${seam('M510 560 L470 640')}`}
      <path d="M400 262 L400 ${hood ? 600 : 780}" stroke="#e8e8e8" stroke-width="6" stroke-dasharray="3 5"/>
      <rect x="392" y="${hood ? 250 : 268}" width="16" height="30" rx="4" fill="#cfcfcf" stroke="#000" stroke-opacity=".3"/>`,
  };
}

export function trousers(x: Ctx, style: 'jeans' | 'chino' | 'cargo' | 'jogger' | 'palazzo' = 'jeans'): Piece {
  const body =
    style === 'palazzo'
      ? 'M290 150 L510 150 L634 905 L420 905 L400 400 L380 905 L166 905 Z'
      : style === 'jogger'
        ? 'M286 150 L514 150 L560 560 L520 905 L430 905 L400 380 L370 905 L280 905 L240 560 Z'
        : 'M286 150 L514 150 L552 560 L572 905 L426 905 L400 380 L374 905 L228 905 L248 560 Z';
  const cuffs = style === 'jogger' ? `<rect x="280" y="860" width="90" height="46" rx="8" fill="${darken(x.c, 0.12)}"/><rect x="430" y="860" width="90" height="46" rx="8" fill="${darken(x.c, 0.12)}"/>` : '';
  const cargo = style === 'cargo' ? `<rect x="258" y="470" width="86" height="110" rx="6" fill="none" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3"/><rect x="456" y="470" width="86" height="110" rx="6" fill="none" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3"/>` : '';
  return {
    body: [body],
    over: `
      <rect x="286" y="150" width="228" height="50" fill="${darken(x.c, 0.1)}" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3"/>
      ${[310, 360, 440, 490].map((lx) => `<rect x="${lx}" y="146" width="12" height="40" rx="3" fill="${darken(x.c, 0.18)}"/>`).join('')}
      <circle cx="400" cy="176" r="9" fill="#d9d9d9" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
      ${seam('M400 200 L400 380')}${seam('M400 200 Q372 236 400 290')}
      ${stitch('M292 206 Q336 300 366 348')}${stitch('M508 206 Q464 300 434 348')}
      ${cargo}${cuffs}${style === 'palazzo' ? '' : stitch('M232 880 L372 880')}${style === 'palazzo' ? '' : stitch('M428 880 L568 880')}`,
  };
}

export function lehenga(x: Ctx): Piece {
  const bands = [560, 680, 790]
    .map((y, i) => `<path d="M${330 - i * 62} ${y} Q400 ${y + 34} ${470 + i * 62} ${y}" fill="none" stroke="${x.accent}" stroke-width="${12 - i * 2}" stroke-linecap="round"/>
      <path d="M${330 - i * 62} ${y + 18} Q400 ${y + 52} ${470 + i * 62} ${y + 18}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`)
    .join('');
  return {
    body: ['M312 150 Q400 208 488 150 L536 214 L520 400 L280 400 L264 214 Z', 'M284 392 L516 392 L706 905 Q400 958 94 905 Z'],
    under: `<path d="M270 190 Q190 520 120 880" fill="none" stroke="${x.accent}" stroke-opacity=".5" stroke-width="46" stroke-linecap="round"/>`,
    over: `
      <path d="M312 150 Q400 262 488 150" fill="none" stroke="${x.dark}" stroke-opacity=".4" stroke-width="10" stroke-linecap="round"/>
      <rect x="284" y="384" width="232" height="26" rx="5" fill="${x.accent}" fill-opacity=".85"/>
      ${bands}
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${330 + i * 22} 420 Q${330 + i * 30 - 40} 660 ${250 + i * 50} 900" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="3"/>`).join('')}
      <path d="M118 880 Q400 938 682 880" fill="none" stroke="${x.accent}" stroke-width="14" stroke-linecap="round"/>`,
  };
}

export function frock(x: Ctx): Piece {
  return {
    body: ['M330 170 L362 150 L376 205 Q400 222 424 205 L438 150 L470 170 L450 330 L548 905 Q400 950 252 905 L350 330 Z'],
    over: `
      <path d="M268 640 Q400 690 532 640" fill="none" stroke="${x.dark}" stroke-opacity=".3" stroke-width="3"/>
      <path d="M244 780 Q400 836 556 780" fill="none" stroke="${x.dark}" stroke-opacity=".3" stroke-width="3"/>
      <rect x="350" y="318" width="100" height="22" rx="4" fill="${x.accent}"/>
      <path d="M400 330 L338 300 L338 360 Z M400 330 L462 300 L462 360 Z" fill="${x.accent}"/><circle cx="400" cy="330" r="13" fill="${darken(x.accent, 0.15)}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${290 + i * 55}" cy="${880 - (i % 2) * 24}" r="6" fill="#fff" fill-opacity=".8"/>`).join('')}`,
  };
}

export function dungaree(x: Ctx): Piece {
  return {
    under: `<path d="M250 250 L340 205 Q400 240 460 205 L550 250 L596 336 L540 366 L526 320 L274 320 L260 366 L204 336 Z" fill="#fff" stroke="#000" stroke-opacity=".25" stroke-width="3"/>`,
    body: ['M300 180 L500 180 L508 360 L560 905 L416 905 L400 560 L384 905 L240 905 L292 360 Z', 'M310 182 L334 80 L364 80 L346 182 Z', 'M490 182 L466 80 L436 80 L454 182 Z'],
    over: `
      <rect x="350" y="230" width="100" height="84" rx="6" fill="none" stroke="${x.dark}" stroke-opacity=".5" stroke-width="3"/>
      <circle cx="334" cy="196" r="9" fill="${x.accent}"/><circle cx="466" cy="196" r="9" fill="${x.accent}"/>
      ${seam('M400 360 L400 560')}${stitch('M296 880 L376 880')}${stitch('M424 880 L504 880')}`,
  };
}

/** A saree draped on a dress form: blouse, pleated skirt panel, pallu over the shoulder, zari hem and tassels. */
export function saree(x: Ctx): Piece {
  const blouse = lighten(x.accent, 0.05);
  const pleats = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return `<path d="M${352 + t * 96} 440 Q${330 + t * 140} 700 ${262 + t * 276} 928" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>`;
  }).join('');
  const motifs = Array.from({ length: 9 }, (_, i) => `<path d="M${424 + i * 16} ${330 + i * 66} q14 -20 28 0 q-14 20 -28 0 Z" fill="${x.accent}" fill-opacity=".9"/>`).join('');
  const tassels = Array.from({ length: 9 }, (_, i) => `<path d="M${526 + i * 9} 930 l-2 30" stroke="${x.accent}" stroke-width="3" stroke-linecap="round"/>`).join('');
  return {
    under: `
      <path d="M368 120 L432 120 L436 176 Q470 190 512 214 L508 448 Q400 470 292 448 L288 214 Q330 190 364 176 Z" fill="#ece6df" stroke="#000" stroke-opacity=".2" stroke-width="3"/>
      <path d="M318 214 L364 196 Q400 232 436 196 L482 214 L496 334 Q400 352 304 334 Z" fill="${blouse}" stroke="#000" stroke-opacity=".35" stroke-width="3"/>
      <path d="M352 204 Q400 262 448 204" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="4"/>`,
    body: [
      'M290 430 L510 430 L578 942 Q400 990 222 942 Z',
      'M292 214 L346 206 L548 470 L626 944 L506 944 L470 590 L286 312 Z',
    ],
    over: `
      ${pleats}
      <path d="M226 928 Q400 978 574 928" fill="none" stroke="${x.accent}" stroke-width="34" stroke-linecap="round"/>
      <path d="M232 898 Q400 946 568 898" fill="none" stroke="${lighten(x.accent, 0.45)}" stroke-width="5" stroke-dasharray="4 8" stroke-linecap="round"/>
      <path d="M292 214 L346 206 L548 470 L626 944" fill="none" stroke="${x.accent}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M286 312 L470 590 L506 944" fill="none" stroke="${x.accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M520 470 L590 944 L626 944" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/>
      ${motifs}${tassels}
      <rect x="290" y="420" width="220" height="18" rx="4" fill="${x.accent}" fill-opacity=".9"/>`,
  };
}

/** Closed-form detail crop (viewBox) per kind, used for the third "close-up" gallery image. */
export const DETAIL_VIEWBOX: Record<Kind, string> = {
  shirt: '230 170 340 425', tee: '230 190 340 425', polo: '230 190 340 425', henley: '230 190 340 425',
  kurta: '230 160 340 425', anarkali: '230 150 340 425', kurtaset: '170 120 460 575', jacket: '230 170 340 425', hoodie: '230 70 340 425',
  jeans: '270 130 260 325', chino: '270 130 260 325', cargo: '230 130 340 425', jogger: '270 130 260 325', palazzo: '270 130 260 325',
  lehenga: '230 330 340 425', frock: '270 120 260 325', dungaree: '260 60 280 350', saree: '230 520 400 500',
};
