import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import Shell from './Shell';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { CategoryTile, SectionHeading } from './parts';

const festiveBloom: TemplateDefinition = {
  id: 'festive-bloom',
  name: 'Festive Bloom',
  tagline: 'Joyful festival and wedding-season colour',
  previewColors: ['#fff7e6', '#3a1450', '#d6246e', '#ffb400', '#ff7a1a'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  gridClassName: 'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6',
  productPage: { galleryLayout: 'thumbs-left', stickyBuyBar: true },
};

export default festiveBloom;
