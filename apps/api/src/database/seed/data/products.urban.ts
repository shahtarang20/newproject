import { G, SZ_TOPS, SZ_WAIST } from './products.shree';
import type { ProductSpec } from '../types';

const SZ_FREE_KURTA = ['S', 'M', 'L', 'XL'];

export const URBAN_PRODUCTS: ProductSpec[] = [
  G('Slim Fit Check Shirt', 'shirts', 1199, 1799, 'MEN', 'COTTON', ['CASUAL'], ['Red', 'Navy', 'Olive'], SZ_TOPS, 'Slim|Checks|Full|Button-down|Cotton', 'check,shirt,slim-fit', 'Everyday check shirt with a sharp slim cut.'),
  G('Oversized Linen Shirt', 'shirts', 1499, 2199, 'MEN', 'LINEN', ['CASUAL'], ['Beige', 'White', 'Sky Blue'], SZ_TOPS, 'Oversized|Solid|Full|Camp Collar|Linen Blend', 'linen,oversized,summer,new-arrival', 'Drop-shoulder oversized linen shirt for effortless streetwear.', { featured: true }),
  G('Denim Overshirt', 'shirts', 1999, 2799, 'MEN', 'DENIM', ['CASUAL'], ['Mid Wash', 'Black'], SZ_TOPS, 'Relaxed|Solid|Full|Spread Collar|Cotton Denim', 'denim,overshirt,layering', 'Heavy denim overshirt that doubles as a light jacket.'),
  G('Mandarin Collar Shirt', 'shirts', 1299, 1899, 'MEN', 'COTTON', ['CASUAL', 'OFFICE'], ['White', 'Charcoal', 'Mustard'], SZ_TOPS, 'Regular|Solid|Full|Mandarin|Cotton Poplin', 'mandarin,shirt,casual', 'Collarless poplin shirt with a modern silhouette.'),
  G('Oversized Graphic Tee', 't-shirts', 799, 1199, 'UNISEX', 'COTTON', ['CASUAL'], ['Black', 'White', 'Grey'], SZ_TOPS, 'Oversized|Graphic|Short|Round|220 GSM Cotton', 'tee,oversized,graphic,streetwear,new-arrival', 'Heavyweight 220 GSM tee with a puff-print graphic.', { featured: true }),
  G('Boxy Fit Printed Tee', 't-shirts', 899, 1299, 'MEN', 'COTTON', ['CASUAL'], ['Olive', 'Rust', 'Navy'], SZ_TOPS, 'Boxy|Printed|Short|Round|Combed Cotton', 'tee,boxy,streetwear', 'Boxy cut with a washed finish and chest print.', { stock: 'high' }),
  G('Ribbed Henley Tee', 't-shirts', 699, 999, 'MEN', 'COTTON', ['CASUAL'], ['Black', 'Beige', 'Maroon'], SZ_TOPS, 'Slim|Ribbed|Full|Henley|Cotton Rib', 'henley,ribbed,casual', 'Ribbed henley with a three-button placket.'),
  G('Polo Pique Tee', 't-shirts', 899, 1399, 'MEN', 'COTTON', ['CASUAL', 'OFFICE'], ['White', 'Navy', 'Green'], SZ_TOPS, 'Regular|Solid|Short|Polo|Pique Cotton', 'polo,pique,casual', 'Classic polo in textured pique cotton.', { stock: 'low' }),
  G('Everyday Plain Tee', 't-shirts', 499, 799, 'MEN', 'COTTON', ['CASUAL'], ['White', 'Black', 'Grey'], SZ_TOPS, 'Regular|Solid|Short|Round|Cotton', 'basic,plain,tee', 'The plain tee you will reach for every day.', { stock: 'out' }),
  G('Tapered Fit Jeans', 'jeans', 1799, 2599, 'MEN', 'DENIM', ['CASUAL'], ['Dark Wash', 'Mid Wash', 'Black'], SZ_WAIST, 'Tapered|Solid|Full|Round|Stretch Denim', 'jeans,tapered,denim', 'Tapered through the leg with a clean, modern break.', { featured: true }),
  G('Baggy Fit Jeans', 'jeans', 2199, 2999, 'MEN', 'DENIM', ['CASUAL'], ['Light Wash', 'Black'], SZ_WAIST, 'Baggy|Solid|Full|Round|Rigid Denim', 'jeans,baggy,streetwear,new-arrival', 'Relaxed baggy jeans with a low-slung rise.'),
  G('Skinny Stretch Jeans', 'jeans', 1599, 2299, 'MEN', 'DENIM', ['CASUAL'], ['Black', 'Dark Wash', 'Grey'], SZ_WAIST, 'Skinny|Solid|Full|Round|Stretch Denim', 'jeans,skinny', 'High-stretch skinny jeans that move with you.'),
  G('Cargo Denim Jeans', 'jeans', 2399, 3299, 'MEN', 'DENIM', ['CASUAL'], ['Mid Wash', 'Khaki'], SZ_WAIST, 'Relaxed|Solid|Full|Round|Cotton Denim', 'cargo,jeans,streetwear', 'Utility cargo pockets on relaxed denim.', { stock: 'low' }),
  G('Stretch Chinos', 'trousers-chinos', 1399, 1999, 'MEN', 'COTTON', ['OFFICE', 'CASUAL'], ['Khaki', 'Navy', 'Olive'], SZ_WAIST, 'Slim|Solid|Full|Round|Cotton Stretch', 'chinos,stretch,office', 'Stretch cotton chinos with a tailored taper.'),
  G('Cargo Joggers', 'trousers-chinos', 1299, 1899, 'MEN', 'COTTON', ['CASUAL'], ['Black', 'Olive', 'Charcoal'], SZ_WAIST, 'Jogger|Solid|Full|Round|Cotton Twill', 'cargo,joggers,streetwear,new-arrival', 'Cuffed cargo joggers with a drawcord waist.', { stock: 'high' }),
  G('Pleated Formal Trousers', 'trousers-chinos', 1699, 2399, 'MEN', 'POLYESTER', ['OFFICE'], ['Charcoal', 'Navy', 'Black'], SZ_WAIST, 'Regular|Solid|Full|Round|Poly Viscose', 'formal,trousers,office', 'Single-pleat formal trousers with a flat front finish.'),
  G('Zip-up Hoodie', 'jackets-hoodies', 1899, 2699, 'UNISEX', 'COTTON', ['CASUAL'], ['Black', 'Grey', 'Maroon'], SZ_TOPS, 'Regular|Solid|Full|Hooded|Fleece Cotton', 'hoodie,winter,streetwear', 'Brushed fleece zip-up with kangaroo pockets.', { featured: true }),
  G('Bomber Jacket', 'jackets-hoodies', 3499, 4999, 'MEN', 'POLYESTER', ['CASUAL'], ['Olive', 'Black', 'Navy'], SZ_TOPS, 'Regular|Solid|Full|Ribbed|Nylon', 'bomber,jacket,winter,new-arrival', 'Satin-finish bomber with ribbed cuffs and hem.'),
  G('Denim Trucker Jacket', 'jackets-hoodies', 3999, 5499, 'MEN', 'DENIM', ['CASUAL'], ['Mid Wash', 'Black'], SZ_TOPS, 'Regular|Solid|Full|Spread Collar|Rigid Denim', 'denim,trucker,jacket', 'Classic trucker jacket in rigid denim.', { status: 'DRAFT' }),
  G('Cotton Short Kurta', 'ethnic-wear', 999, 1499, 'MEN', 'COTTON', ['CASUAL', 'FESTIVAL'], ['White', 'Mustard', 'Teal'], SZ_FREE_KURTA, 'Regular|Solid|Full|Mandarin|Cotton', 'kurta,short-kurta,festive,diwali', 'Short kurta that pairs with jeans or pyjamas.'),
  G('Bandhgala Kurta Set', 'kurta-sets', 3999, 5499, 'MEN', 'SILK', ['WEDDING', 'FESTIVAL'], ['Navy', 'Wine', 'Black'], SZ_FREE_KURTA, 'Slim|Textured|Full|Bandhgala|Silk Blend', 'bandhgala,wedding,festive,diwali,set', 'Structured bandhgala kurta set for the festive season.'),
  G('Linen Kurta Pajama', 'kurta-sets', 1799, 2499, 'MEN', 'LINEN', ['FESTIVAL', 'CASUAL'], ['Ivory', 'Beige', 'Sky Blue'], SZ_FREE_KURTA, 'Regular|Solid|Full|Mandarin|Linen', 'linen,kurta,festive,diwali', 'Breathable linen kurta pajama for relaxed celebrations.'),
];
