import QRCode from 'qrcode';
import { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { env } from '@/config/env';
import { Catalogue, Product } from '@/database/models';

export interface QrImage {
  body: Buffer | string;
  contentType: string;
  filename: string;
  url: string;
}

const base = (shopSlug: string): string => `${env.FRONTEND_URL.replace(/\/+$/, '')}/shop/${shopSlug}`;

export async function render(url: string, format: 'png' | 'svg', size: number, name: string): Promise<QrImage> {
  const opts = { errorCorrectionLevel: 'M' as const, margin: 2, width: size };
  if (format === 'svg') {
    return { body: await QRCode.toString(url, { ...opts, type: 'svg' }), contentType: 'image/svg+xml; charset=utf-8', filename: `${name}.svg`, url };
  }
  return { body: await QRCode.toBuffer(url, { ...opts, type: 'png' }), contentType: 'image/png', filename: `${name}.png`, url };
}

export const shopUrl = (shopSlug: string): string => base(shopSlug);

export async function catalogueUrl(shopId: Types.ObjectId, shopSlug: string, id: string): Promise<{ url: string; name: string }> {
  const c = await Catalogue.findOne({ _id: id, shopId }).select('slug').lean();
  if (!c) throw Errors.notFound('CATALOGUE_NOT_FOUND', 'Catalogue not found');
  return { url: `${base(shopSlug)}/catalogue/${c.slug}`, name: `catalogue-${c.slug}` };
}

export async function productUrl(shopId: Types.ObjectId, shopSlug: string, id: string): Promise<{ url: string; name: string }> {
  const p = await Product.findOne({ _id: id, shopId, deletedAt: null }).select('slug').lean();
  if (!p) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
  return { url: `${base(shopSlug)}/product/${p.slug}`, name: `product-${p.slug}` };
}
