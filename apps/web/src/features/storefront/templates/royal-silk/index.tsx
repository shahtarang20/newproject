import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import { Shell } from './Shell';
import { Hero } from './Hero';
import { ProductCard } from './ProductCard';
import { SectionHeading, CategoryTile } from './parts';

const royalSilk: TemplateDefinition = {
  id: 'royal-silk',
  name: 'Royal Silk',
  tagline: 'Regal blue, emerald and gold-foil saree house',
  previewColors: ['#0c1b4d', '#0b5d4b', '#c9a24a', '#fbf7ee'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  gridClassName: 'grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14 lg:grid-cols-4 lg:gap-x-10',
  productPage: { galleryLayout: 'thumbs-bottom', stickyBuyBar: true },
};

export default royalSilk;
