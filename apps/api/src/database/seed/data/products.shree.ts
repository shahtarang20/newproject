import type { Fabric, Gender, Occasion } from '@vastra/shared';
import type { ProductSpec, StockMode } from '../types';

export const SZ_TOPS = ['S', 'M', 'L', 'XL', 'XXL'];
export const SZ_WOMEN = ['XS', 'S', 'M', 'L', 'XL'];
export const SZ_KIDS = ['2-3Y', '4-5Y', '6-7Y', '8-9Y'];
export const SZ_WAIST = ['28', '30', '32', '34', '36'];
export const SZ_FREE = ['FREE'];

interface GOpts { stock?: StockMode; status?: 'DRAFT'; featured?: boolean; brand?: string }

/** Compact garment spec factory. */
export const G = (
  name: string, cat: string, price: number, mrp: number, gender: Gender, fabric: Fabric, occ: Occasion[],
  colours: string[], sizes: string[], ga: string, tags: string, blurb: string, o: GOpts = {},
): ProductSpec => ({ type: 'GARMENT', name, cat, price, mrp, gender, fabric, occ, colours, sizes, ga, tags: tags.split(','), blurb, ...o });

export const SHREE_PRODUCTS: ProductSpec[] = [
  G('Classic Oxford Cotton Shirt', 'men-shirts', 1299, 1799, 'MEN', 'COTTON', ['OFFICE', 'CASUAL'], ['White', 'Sky Blue', 'Navy'], SZ_TOPS, 'Regular|Solid|Full|Spread Collar|100% Cotton', 'oxford,shirt,office,new-arrival', 'A wardrobe staple in breathable Oxford weave with a crisp spread collar.', { featured: true, brand: 'Shree Basics' }),
  G('Linen Casual Shirt', 'men-shirts', 1599, 2199, 'MEN', 'LINEN', ['CASUAL'], ['Beige', 'Olive', 'White'], SZ_TOPS, 'Relaxed|Solid|Full|Camp Collar|100% Linen', 'linen,summer,casual', 'Airy pure linen shirt that stays cool through the longest summer day.'),
  G('Checked Flannel Shirt', 'men-shirts', 1399, 1999, 'MEN', 'COTTON', ['CASUAL'], ['Red', 'Navy', 'Charcoal'], SZ_TOPS, 'Regular|Checks|Full|Button-down|Brushed Cotton', 'flannel,checks,winter', 'Soft brushed-cotton flannel in a classic check for cooler evenings.', { stock: 'high' }),
  G('Formal Slim Fit Shirt', 'men-shirts', 999, 1499, 'MEN', 'COTTON', ['OFFICE'], ['White', 'Sky Blue', 'Grey'], SZ_TOPS, 'Slim|Solid|Full|Spread Collar|Cotton Blend', 'formal,office,slim-fit', 'Wrinkle-resistant slim fit shirt cut for the boardroom.', { stock: 'low' }),
  G('Cotton Straight Kurta', 'men-kurtas', 899, 1299, 'MEN', 'COTTON', ['CASUAL', 'TRADITIONAL'], ['White', 'Sky Blue', 'Mint'], SZ_TOPS, 'Straight|Solid|Full|Mandarin|100% Cotton', 'kurta,daily,cotton', 'Everyday cotton kurta with a clean mandarin collar and side slits.'),
  G('Jacquard Festive Kurta', 'men-kurtas', 2499, 3499, 'MEN', 'SILK', ['FESTIVAL', 'WEDDING'], ['Maroon', 'Gold', 'Bottle Green'], SZ_TOPS, 'Straight|Jacquard|Full|Mandarin|Silk Blend', 'festive,diwali,jacquard,wedding', 'Self-jacquard silk blend kurta that makes every festival entry count.', { featured: true }),
  G('Nehru Jacket Kurta Set', 'men-kurtas', 3299, 4599, 'MEN', 'SILK', ['WEDDING', 'FESTIVAL'], ['Navy', 'Wine', 'Cream'], SZ_TOPS, 'Regular|Solid|Full|Mandarin|Silk Blend', 'nehru-jacket,wedding,diwali,set', 'Three-piece kurta, pyjama and Nehru jacket set for weddings and celebrations.'),
  G('Anarkali Cotton Kurti', 'women-kurtis', 1199, 1699, 'WOMEN', 'COTTON', ['CASUAL', 'FESTIVAL'], ['Pink', 'Teal', 'Mustard'], SZ_WOMEN, 'Flared|Printed|Three-quarter|Round|Cotton', 'anarkali,kurti,cotton,diwali', 'Flared Anarkali cut in soft cotton with a hand-block inspired print.', { featured: true }),
  G('Printed Rayon Straight Kurti', 'women-kurtis', 699, 999, 'WOMEN', 'RAYON', ['CASUAL', 'OFFICE'], ['Navy', 'Green', 'Rust'], SZ_WOMEN, 'Straight|Printed|Three-quarter|V-neck|Rayon', 'rayon,kurti,office,new-arrival', 'Lightweight rayon kurti for work days, easy to wash and wear.', { stock: 'high' }),
  G('Chikankari Georgette Kurti', 'women-kurtis', 1899, 2599, 'WOMEN', 'GEORGETTE', ['PARTY', 'FESTIVAL'], ['White', 'Peach', 'Lavender'], SZ_WOMEN, 'Straight|Chikankari|Full|Round|Georgette', 'chikankari,georgette,festive,diwali', 'Lucknowi chikankari embroidery on flowy georgette with a cotton lining.'),
  G('A-line Embroidered Kurti', 'women-kurtis', 1499, 2199, 'WOMEN', 'RAYON', ['PARTY'], ['Maroon', 'Teal'], SZ_WOMEN, 'A-line|Embroidered|Three-quarter|Round|Rayon', 'a-line,embroidered', 'A-line silhouette with thread embroidery at the yoke.', { status: 'DRAFT' }),
  G('Bridal Velvet Lehenga', 'lehengas', 15999, 21999, 'WOMEN', 'VELVET', ['WEDDING'], ['Maroon', 'Wine', 'Bottle Green'], SZ_WOMEN, 'Flared|Zardozi|Half|Sweetheart|Velvet', 'bridal,wedding,velvet,premium', 'Heavy zardozi bridal lehenga in rich velvet with a net dupatta.', { stock: 'low', featured: true }),
  G('Georgette Sequin Lehenga', 'lehengas', 8999, 12999, 'WOMEN', 'GEORGETTE', ['WEDDING', 'PARTY'], ['Pink', 'Peach', 'Teal'], SZ_WOMEN, 'Flared|Sequin|Sleeveless|Boat|Georgette', 'sequin,lehenga,wedding,sangeet', 'Shimmering sequin lehenga set designed for sangeet and receptions.'),
  G('Net Embroidered Lehenga', 'lehengas', 6499, 9499, 'WOMEN', 'OTHER', ['WEDDING', 'FESTIVAL'], ['Lavender', 'Mint', 'Rani'], SZ_WOMEN, 'Flared|Embroidered|Half|Round|Net', 'net,lehenga,festive,diwali,wedding', 'Net lehenga with thread-work flowers and a matching dupatta.'),
  G('Boys Cotton Kurta Pajama Set', 'kids-wear', 899, 1299, 'KIDS', 'COTTON', ['FESTIVAL', 'TRADITIONAL'], ['Cream', 'Sky Blue', 'Mustard'], SZ_KIDS, 'Regular|Solid|Full|Mandarin|Cotton', 'kids,boys,kurta,diwali', 'Comfortable two-piece set that little ones can wear all day.'),
  G('Girls Party Frock', 'kids-wear', 799, 1199, 'KIDS', 'POLYESTER', ['PARTY'], ['Pink', 'Lavender', 'Mint'], SZ_KIDS, 'Flared|Solid|Sleeveless|Round|Polyester Net', 'kids,girls,frock,party', 'Layered net frock with a satin bow, perfect for birthdays.', { stock: 'high' }),
  G('Kids Denim Dungaree', 'kids-wear', 999, 1399, 'KIDS', 'DENIM', ['CASUAL'], ['Light Wash', 'Dark Wash'], SZ_KIDS, 'Regular|Solid|Sleeveless|Round|Stretch Denim', 'kids,denim,dungaree', 'Soft stretch denim dungaree with adjustable straps.'),
  G('Girls Lehenga Choli', 'kids-wear', 1999, 2899, 'KIDS', 'OTHER', ['FESTIVAL', 'WEDDING'], ['Rani', 'Orange', 'Purple'], SZ_KIDS, 'Flared|Embroidered|Half|Round|Art Silk', 'kids,girls,lehenga,diwali,festive', 'Mini lehenga choli with mirror work and a net dupatta.'),
  G('Graphic Round Neck Tee', 't-shirts', 499, 799, 'UNISEX', 'COTTON', ['CASUAL'], ['White', 'Black', 'Navy'], SZ_TOPS, 'Regular|Graphic|Short|Round|180 GSM Cotton', 'tee,graphic,casual', 'Bio-washed 180 GSM cotton tee with a bold front print.', { stock: 'out' }),
  G('Cotton Polo Tee', 't-shirts', 699, 999, 'MEN', 'COTTON', ['CASUAL', 'OFFICE'], ['Navy', 'Maroon', 'Olive'], SZ_TOPS, 'Regular|Solid|Short|Polo|Pique Cotton', 'polo,tee,casual,new-arrival', 'Pique cotton polo with ribbed collar and cuffs.'),
  G('Slim Fit Stretch Jeans', 'jeans-bottoms', 1599, 2299, 'MEN', 'DENIM', ['CASUAL'], ['Dark Wash', 'Mid Wash', 'Black'], SZ_WAIST, 'Slim|Solid|Full|Round|98% Cotton 2% Elastane', 'jeans,denim,slim-fit,new-arrival', 'Mid-rise slim jeans with just enough stretch for all-day comfort.', { featured: true }),
  G('Cotton Chinos', 'jeans-bottoms', 1299, 1799, 'MEN', 'COTTON', ['OFFICE', 'CASUAL'], ['Khaki', 'Navy', 'Olive'], SZ_WAIST, 'Slim|Solid|Full|Round|Cotton Twill', 'chinos,office,casual', 'Smart cotton twill chinos that go from office to weekend.', { stock: 'low' }),
  G('Palazzo Cotton Pants', 'jeans-bottoms', 599, 899, 'WOMEN', 'COTTON', ['CASUAL'], ['Black', 'White', 'Mustard'], SZ_WOMEN, 'Wide|Solid|Full|Round|Cotton', 'palazzo,women,cotton', 'Wide-leg palazzo with an elasticated waist.', { status: 'DRAFT' }),
];
