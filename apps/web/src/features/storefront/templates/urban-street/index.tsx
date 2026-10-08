import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import { Shell } from './Shell';
import { Hero } from './Hero';
import { ProductCard } from './ProductCard';
import { SectionHeading, CategoryTile } from './parts';

const urbanStreet: TemplateDefinition = {
  id: 'urban-street',
  name: 'Urban Street',
  tagline: 'Bold dark streetwear with neon edge',
  previewColors: ['#0b0b0c', '#c6ff3d', '#ff5a1f', '#f4f4f1'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  gridClassName: 'grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4',
  productPage: { galleryLayout: 'thumbs-left', stickyBuyBar: true },
};

export default urbanStreet;
