import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import Shell from './Shell';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { CategoryTile, SectionHeading } from './Parts';

const template: TemplateDefinition = {
  id: 'boutique-blush',
  name: 'Boutique Blush',
  tagline: 'Soft, feminine boutique with rose glass and arches',
  previewColors: ['#fdf0f2', '#c2476b', '#f6c9d4', '#4a1d34'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  gridClassName: 'grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3',
  productPage: { galleryLayout: 'thumbs-bottom', stickyBuyBar: true },
};

export default template;
