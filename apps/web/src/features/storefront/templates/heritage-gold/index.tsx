import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import Shell from './Shell';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { CategoryTile, SectionHeading } from './Parts';

const template: TemplateDefinition = {
  id: 'heritage-gold',
  name: 'Heritage Gold',
  tagline: 'Classic Indian heritage in maroon and antique gold',
  previewColors: ['#fbf5ea', '#5b1226', '#c9a24a', '#f3e8d4'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  gridClassName: 'grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4',
  productPage: { galleryLayout: 'thumbs-left', stickyBuyBar: true },
};

export default template;
