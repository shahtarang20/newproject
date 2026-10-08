/**
 * Generated product artwork for the demo data. No external images and no copyrighted assets: every file is an
 * SVG illustration of the actual garment (shirt, kurta, saree, lehenga…) coloured per variant.
 * Files are written under apps/api/uploads/seed/<shop>/ and served by the API at /uploads/seed/<shop>/...
 */
import fs from 'fs';
import path from 'path';
import { LOCAL_UPLOAD_ROOT } from '@/providers/storage/local';
import { hexOf } from '../data/colours';
import { hashSeed } from '../prng';
import { mix } from './colour';
import { classify, patternFor, renderBrandSvg, renderGarmentSvg } from './compose';
import type { Kind } from './shapes';

const GOLD = '#d4af37';
const ACCENTS = ['#f4b6c2', '#ffd166', '#8ecae6', '#b7e4c7', '#e9c46a', '#cdb4db'];

export interface ProductArtInput {
  shopSlug: string;
  productSlug: string;
  name: string;
  type: string;
  categoryText: string;
  colours: string[];
}

export interface ProductArt {
  /** Front-view image per colour name (used for variant images). */
  colourUrls: Record<string, string>;
  /** Gallery in display order: front, second colour (or styled shot), close-up. */
  gallery: string[];
  kind: Kind;
}

function write(shopSlug: string, file: string, svg: string): string {
  const dir = path.join(LOCAL_UPLOAD_ROOT, 'seed', shopSlug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), svg, 'utf8');
  return `/uploads/seed/${shopSlug}/${file}`;
}

export function writeProductArt(input: ProductArtInput): ProductArt {
  const kind = classify(input.name, input.type, input.categoryText);
  const pattern = patternFor(input.name, kind);
  const lower = input.name.toLowerCase();
  const flags = { graphic: /graphic|printed tee|boxy fit printed/.test(lower), nehru: /nehru|bandhgala/.test(lower), embroidered: /embroider|chikankari|cutdana|sequin/.test(lower) };
  const accentFor = (hex: string): string => (kind === 'saree' ? GOLD : pattern === 'buti' ? GOLD : ACCENTS[hashSeed(input.productSlug + hex) % ACCENTS.length]);
  const colours = input.colours.length ? input.colours : ['Beige'];
  const base = { kind, pattern, ...flags };

  const colourUrls: Record<string, string> = {};
  colours.forEach((name, i) => {
    const hex = hexOf(name);
    colourUrls[name] = write(input.shopSlug, `${input.productSlug}-c${i}.svg`, renderGarmentSvg({ ...base, colour: hex, accent: accentFor(hex), alt: `${input.name} in ${name}` }));
  });

  const firstHex = hexOf(colours[0]);
  const second =
    colours.length > 1
      ? colourUrls[colours[1]]
      : write(input.shopSlug, `${input.productSlug}-styled.svg`, renderGarmentSvg({ ...base, colour: firstHex, accent: accentFor(firstHex), alt: `${input.name} styled view`, styled: true }));
  const detail = write(input.shopSlug, `${input.productSlug}-detail.svg`, renderGarmentSvg({ ...base, colour: firstHex, accent: accentFor(firstHex), alt: `${input.name} close-up`, detail: true }));
  return { colourUrls, gallery: [colourUrls[colours[0]], second, detail], kind };
}

/** Category tile art: the category's garment drawn in a shop-tinted colour. */
export function writeCategoryArt(shopSlug: string, categorySlug: string, categoryName: string, tint: string, index: number): string {
  const kind = classify(categoryName, '', categorySlug);
  const colour = mix(tint, ['#f2e6d0', '#d8c3a5', '#e9d5da', '#c9d6df'][index % 4], 0.45);
  return write(shopSlug, `cat-${categorySlug}.svg`, renderGarmentSvg({ kind, colour, accent: kind === 'saree' ? GOLD : '#ffd166', pattern: kind === 'saree' ? 'buti' : 'none', alt: categoryName, detail: false }));
}

export const writeShopLogo = (shopSlug: string, name: string, primary: string): string => write(shopSlug, 'logo.svg', renderBrandSvg('logo', name, primary));
export const writeShopCover = (shopSlug: string, name: string, primary: string): string => write(shopSlug, 'cover.svg', renderBrandSvg('cover', name, primary));
