import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import Shell from './Shell';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { CategoryTile, SectionHeading } from './parts';

const modernLinen: TemplateDefinition = {
  id: 'modern-linen',
  name: 'Modern Linen',
  tagline: 'Calm, natural, lifestyle-led',
  previewColors: ['#f4efe7', '#3a3328', '#b4694a', '#7a8a6e', '#fbf8f2'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  gridClassName: 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-14',
  productPage: { galleryLayout: 'thumbs-bottom', stickyBuyBar: true },
};

export default modernLinen;
