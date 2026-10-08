import type { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { audit, type AuditActor } from '@/common/audit';
import { uniqueSlug } from '@/common/slug';
import { invalidateShopCache } from '@/common/utils/cache';
import { Catalogue } from '@/database/models/catalogue.model';
import { Product } from '@/database/models/product.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { copyProductMedia, removeAllProductMedia, type CopyResult } from '../media/media.service';
import { assertWithinLimit, decrementUsage, incrementUsage } from '../subscriptions/limits.service';
import { generateSku, skuConflict } from './product.keys';
import { recomputeProductSummary } from './product.summary';
import { oid, retryOnDuplicate, type Id } from './product.utils';
import { getProduct } from './products.service';
import { createVariants } from './variants.service';

/**
 * Soft delete: sets deletedAt + status ARCHIVED, frees slug/sku (`-deleted-<ts>`), deactivates variants (SKUs freed),
 * removes media objects and releases usage (products, images, videos, storage). Inventory history is kept.
 */
export async function deleteProduct(shopId: Types.ObjectId, id: Id, actor: AuditActor): Promise<void> {
  const pid = oid(id);
  const stamp = Date.now();
  const product = await Product.findOne({ _id: pid, shopId, deletedAt: null }).select('slug sku name status').lean();
  if (!product) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');

  const res = await Product.updateOne(
    { _id: pid, shopId, deletedAt: null },
    {
      $set: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
        slug: `${product.slug}-deleted-${stamp}`,
        ...(product.sku ? { sku: `${product.sku}-deleted-${stamp}` } : {}),
        media: [],
        mediaIds: [],
      },
      $unset: { primaryImageUrl: 1, primaryThumbUrl: 1 },
    },
  );
  if (!res.modifiedCount) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');

  await ProductVariant.updateMany({ shopId, productId: pid, sku: { $type: 'string' } }, [{ $set: { sku: { $concat: ['$sku', `-deleted-${stamp}`] }, isActive: false } }]);
  await ProductVariant.updateMany({ shopId, productId: pid }, { $set: { isActive: false } });
  await Catalogue.updateMany({ shopId, 'products.productId': pid }, { $pull: { products: { productId: pid } } });
  const removed = await removeAllProductMedia(shopId, pid);
  await decrementUsage(shopId, 'products', 1);
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'product.delete', entity: 'Product', entityId: pid, before: { name: product.name, slug: product.slug, sku: product.sku, status: product.status }, meta: removed });
}

/**
 * Duplicate: new DRAFT product ("<name> (Copy)", fresh slug + SKU, counters reset). Variants are copied with NEW SKUs and
 * stock 0 (no inventory transactions; variant images are not re-linked). Media is physically copied (download public
 * URL → re-upload under the new product's key prefix) so the two products never share storage objects; items that
 * exceed plan limits or fail to download are skipped and reported in `mediaCopy`.
 */
export async function duplicateProduct(shopId: Types.ObjectId, id: Id, actor: AuditActor) {
  const src = await Product.findOne({ _id: oid(id), shopId, deletedAt: null }).lean();
  if (!src) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
  await assertWithinLimit(shopId, 'products', 1);

  const name = `${src.name} (Copy)`.slice(0, 200);
  let sku = '';
  const copy = await retryOnDuplicate(async () => {
    const slug = await uniqueSlug(Product, name, { shopId });
    sku = generateSku(name);
    return Product.create({
      shopId, type: src.type, name, slug, sku, brand: src.brand, description: src.description, shortDescription: src.shortDescription,
      categoryId: src.categoryId ?? null, tags: src.tags, gender: src.gender, occasions: src.occasions, fabric: src.fabric, season: src.season,
      sareeAttrs: src.sareeAttrs, garmentAttrs: src.garmentAttrs,
      pricing: { taxPercent: src.pricing.taxPercent, hidePrice: src.pricing.hidePrice },
      seo: src.seo, status: 'DRAFT', isFeatured: false, lowStockThreshold: src.lowStockThreshold,
    });
  }).catch((err: unknown) => {
    throw skuConflict(err, sku);
  });

  try {
    const variants = await ProductVariant.find({ shopId, productId: src._id, isActive: true }).sort({ createdAt: 1 }).lean();
    await createVariants(
      shopId,
      copy,
      variants.map((v) => ({
        colour: v.colour?.name ? { name: v.colour.name, ...(v.colour.hex ? { hex: v.colour.hex } : {}) } : undefined,
        size: v.size,
        sellingPriceMinor: v.sellingPriceMinor,
        mrpMinor: v.mrpMinor,
        costPriceMinor: v.costPriceMinor,
        lowStockThreshold: v.lowStockThreshold,
        stock: 0,
      })),
      actor.userId,
    );
  } catch (err) {
    await Promise.all([ProductVariant.deleteMany({ shopId, productId: copy._id }), Product.deleteOne({ _id: copy._id, shopId })]);
    throw err;
  }
  await incrementUsage(shopId, 'products', 1);
  const mediaCopy: CopyResult = await copyProductMedia(shopId, src._id, copy._id, actor.userId);
  await recomputeProductSummary(copy._id, shopId);
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'product.duplicate', entity: 'Product', entityId: copy._id, meta: { sourceId: String(src._id), media: mediaCopy } });
  return { ...(await getProduct(shopId, copy._id)), mediaCopy };
}
