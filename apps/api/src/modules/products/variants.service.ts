import type { HydratedDocument, Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { audit, type AuditActor } from '@/common/audit';
import { InventoryTransaction } from '@/database/models/inventory-transaction.model';
import { Media } from '@/database/models/media.model';
import { Product } from '@/database/models/product.model';
import { ProductVariant, type IProductVariant } from '@/database/models/product-variant.model';
import { generateSku, normaliseSku } from './product.keys';
import { recomputeProductSummary } from './product.summary';
import { isDuplicateKey, oid, randomToken, retryOnDuplicate, withId } from './product.utils';
import type { VariantCreateInput, VariantUpdateInput } from './variants.schemas';

type ProductRef = { _id: Types.ObjectId; sku?: string; name: string };

const notFound = () => Errors.notFound('INVALID_VARIANT', 'Variant not found');

interface Normalised {
  colour?: { name: string; hex?: string };
  size?: string;
  sku?: string;
  sellingPriceMinor?: number;
  mrpMinor?: number;
  costPriceMinor?: number;
  stock?: number;
  lowStockThreshold?: number | null;
  barcode?: string | null;
  imageMediaId?: string | null;
  isActive?: boolean;
}

function normalise(i: VariantCreateInput | VariantUpdateInput): Normalised {
  const name = typeof i.colour === 'string' ? i.colour : (i.colour?.name ?? i.colourName);
  const hexVal = typeof i.colour === 'object' && i.colour ? (i.colour.hex ?? i.colourHex) : i.colourHex;
  return {
    colour: name ? { name, ...(hexVal ? { hex: hexVal } : {}) } : undefined,
    size: i.size,
    sku: i.sku ? normaliseSku(i.sku) : undefined,
    sellingPriceMinor: i.sellingPriceMinor ?? i.priceMinor,
    mrpMinor: i.mrpMinor,
    costPriceMinor: i.costPriceMinor,
    stock: i.stock,
    lowStockThreshold: i.lowStockThreshold,
    barcode: i.barcode,
    imageMediaId: i.imageMediaId,
    isActive: i.isActive,
  };
}

const variantSku = (p: ProductRef, n: Normalised, attempt: number): string => {
  const parts = [p.sku ?? generateSku(p.name), n.colour?.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase(), n.size?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()];
  const base = parts.filter(Boolean).join('-');
  return attempt === 0 ? base : `${base}-${randomToken(3)}`;
};

async function resolveImage(shopId: Types.ObjectId, productId: Types.ObjectId, mediaId: string): Promise<{ imageMediaId: Types.ObjectId; imageUrl: string }> {
  const m = await Media.findOne({ _id: oid(mediaId), shopId, productId, kind: 'IMAGE' }).select('url thumbUrl').lean();
  if (!m) throw Errors.badRequest('VALIDATION_ERROR', 'imageMediaId must be an image uploaded to this product');
  return { imageMediaId: m._id, imageUrl: m.thumbUrl ?? m.url };
}

async function assertNoTwin(shopId: Types.ObjectId, productId: Types.ObjectId, n: Normalised, excludeId?: Types.ObjectId): Promise<void> {
  const filter: Record<string, unknown> = { shopId, productId, isActive: true, 'colour.name': n.colour?.name ?? null, size: n.size ?? null };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await ProductVariant.exists(filter)) {
    throw Errors.conflict('CONFLICT', `A variant with colour "${n.colour?.name ?? '-'}" and size "${n.size ?? '-'}" already exists on this product`);
  }
}

async function createOne(shopId: Types.ObjectId, product: ProductRef, input: VariantCreateInput, userId?: string): Promise<HydratedDocument<IProductVariant>> {
  const n = normalise(input);
  await assertNoTwin(shopId, product._id, n);
  const image = n.imageMediaId ? await resolveImage(shopId, product._id, n.imageMediaId) : undefined;
  const stock = n.stock ?? 0;
  let doc: HydratedDocument<IProductVariant>;
  try {
    doc = await retryOnDuplicate(
      (attempt) =>
        ProductVariant.create({
          shopId,
          productId: product._id,
          sku: n.sku ?? variantSku(product, n, attempt),
          colour: n.colour,
          size: n.size,
          sellingPriceMinor: n.sellingPriceMinor ?? 0,
          mrpMinor: n.mrpMinor ?? 0,
          costPriceMinor: n.costPriceMinor,
          stock,
          lowStockThreshold: n.lowStockThreshold ?? undefined,
          barcode: n.barcode ?? undefined,
          isActive: n.isActive ?? true,
          ...image,
        }),
      n.sku ? 1 : 5,
    );
  } catch (err) {
    if (isDuplicateKey(err) && n.sku) throw Errors.conflict('CONFLICT', `SKU "${n.sku}" is already used by another variant`);
    throw err;
  }
  if (stock > 0) {
    await InventoryTransaction.create({
      shopId, productId: product._id, variantId: doc._id, type: 'PURCHASE', quantity: stock, balanceAfter: stock,
      reason: 'Opening stock', unitCostMinor: n.costPriceMinor, createdBy: userId ? oid(userId) : undefined,
    });
  }
  return doc;
}

/** Sequentially creates variants (+ opening-stock transactions). Caller recomputes the summary. */
export async function createVariants(shopId: Types.ObjectId, product: ProductRef, inputs: VariantCreateInput[], userId?: string): Promise<Array<HydratedDocument<IProductVariant>>> {
  const out: Array<HydratedDocument<IProductVariant>> = [];
  for (const input of inputs) out.push(await createOne(shopId, product, input, userId));
  return out;
}

async function loadProduct(shopId: Types.ObjectId, productId: Types.ObjectId): Promise<ProductRef> {
  const p = await Product.findOne({ _id: productId, shopId, deletedAt: null }).select('sku name').lean();
  if (!p) throw Errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
  return p;
}

export async function listVariants(shopId: Types.ObjectId, productId: Types.ObjectId) {
  await loadProduct(shopId, productId);
  return (await ProductVariant.find({ shopId, productId }).sort({ createdAt: 1 }).lean()).map((v) => withId(v));
}

export async function addVariant(shopId: Types.ObjectId, productId: Types.ObjectId, input: VariantCreateInput, actor: AuditActor) {
  const product = await loadProduct(shopId, productId);
  const doc = await createOne(shopId, product, input, actor.userId);
  await recomputeProductSummary(productId, shopId);
  void audit(actor, { action: 'variant.create', entity: 'ProductVariant', entityId: doc._id, after: { productId, sku: doc.sku, price: doc.sellingPriceMinor, stock: doc.stock } });
  return withId(doc.toObject());
}

export async function updateVariant(shopId: Types.ObjectId, productId: Types.ObjectId, variantId: Types.ObjectId, input: VariantUpdateInput, actor: AuditActor) {
  await loadProduct(shopId, productId);
  const before = await ProductVariant.findOne({ _id: variantId, shopId, productId }).lean();
  if (!before) throw notFound();
  const n = normalise(input);

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  const colourTouched = input.colour !== undefined || input.colourName !== undefined || input.colourHex !== undefined;
  if (colourTouched) {
    if (n.colour) $set.colour = n.colour;
    else if (before.colour?.name) $set['colour.hex'] = input.colourHex; // hex-only change keeps the name
  }
  if (n.size !== undefined) $set.size = n.size;
  if (n.sku !== undefined) $set.sku = n.sku;
  if (n.sellingPriceMinor !== undefined) $set.sellingPriceMinor = n.sellingPriceMinor;
  if (n.mrpMinor !== undefined) $set.mrpMinor = n.mrpMinor;
  if (n.costPriceMinor !== undefined) $set.costPriceMinor = n.costPriceMinor;
  if (n.isActive !== undefined) $set.isActive = n.isActive;
  if (n.lowStockThreshold !== undefined) (n.lowStockThreshold === null ? ($unset.lowStockThreshold = 1) : ($set.lowStockThreshold = n.lowStockThreshold));
  if (n.barcode !== undefined) (n.barcode === null ? ($unset.barcode = 1) : ($set.barcode = n.barcode));
  if (n.imageMediaId !== undefined) {
    if (n.imageMediaId === null) {
      $set.imageMediaId = null;
      $unset.imageUrl = 1;
    } else Object.assign($set, await resolveImage(shopId, productId, n.imageMediaId));
  }
  if (colourTouched || n.size !== undefined) {
    await assertNoTwin(shopId, productId, { colour: (n.colour ?? before.colour) as Normalised['colour'], size: n.size ?? before.size }, variantId);
  }

  try {
    const update = { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
    if (Object.keys(update).length) await ProductVariant.updateOne({ _id: variantId, shopId, productId }, update);
  } catch (err) {
    if (isDuplicateKey(err)) throw Errors.conflict('CONFLICT', `SKU "${n.sku ?? ''}" is already used by another variant`);
    throw err;
  }

  if (n.sellingPriceMinor !== undefined || n.mrpMinor !== undefined) {
    if ((n.sellingPriceMinor ?? before.sellingPriceMinor) !== before.sellingPriceMinor || (n.mrpMinor ?? before.mrpMinor) !== before.mrpMinor) {
      void audit(actor, {
        action: 'variant.price_change', entity: 'ProductVariant', entityId: variantId,
        before: { sellingPriceMinor: before.sellingPriceMinor, mrpMinor: before.mrpMinor },
        after: { sellingPriceMinor: n.sellingPriceMinor ?? before.sellingPriceMinor, mrpMinor: n.mrpMinor ?? before.mrpMinor },
        meta: { productId: String(productId) },
      });
    }
  }

  // Stock never gets overwritten silently: apply the delta atomically and journal it.
  if (n.stock !== undefined && n.stock !== before.stock) {
    const delta = n.stock - before.stock;
    const updated = await ProductVariant.findOneAndUpdate(
      { _id: variantId, shopId, productId, ...(delta < 0 ? { stock: { $gte: -delta } } : {}) },
      { $inc: { stock: delta } },
      { new: true },
    ).lean();
    if (!updated) throw Errors.conflict('CONFLICT', 'Stock changed while you were editing. Reload and try again.');
    await InventoryTransaction.create({
      shopId, productId, variantId, type: 'ADJUSTMENT', quantity: delta, balanceAfter: updated.stock,
      reason: input.stockReason || 'Manual adjustment', createdBy: actor.userId ? oid(actor.userId) : undefined,
    });
    void audit(actor, { action: 'variant.stock_change', entity: 'ProductVariant', entityId: variantId, before: { stock: before.stock }, after: { stock: updated.stock }, meta: { delta, productId: String(productId) } });
  }

  await recomputeProductSummary(productId, shopId);
  void audit(actor, { action: 'variant.update', entity: 'ProductVariant', entityId: variantId, meta: { fields: Object.keys(input) } });
  return withId((await ProductVariant.findById(variantId).lean()) as IProductVariant);
}

/** Hard-deletes a variant. If it has sales history it is deactivated instead (orders keep referencing it). */
export async function deleteVariant(shopId: Types.ObjectId, productId: Types.ObjectId, variantId: Types.ObjectId, actor: AuditActor): Promise<{ deleted: boolean; deactivated: boolean }> {
  await loadProduct(shopId, productId);
  const v = await ProductVariant.findOne({ _id: variantId, shopId, productId }).lean();
  if (!v) throw notFound();

  if (v.stock > 0) {
    await InventoryTransaction.create({
      shopId, productId, variantId, type: 'ADJUSTMENT', quantity: -v.stock, balanceAfter: 0,
      reason: 'Variant removed', createdBy: actor.userId ? oid(actor.userId) : undefined,
    });
  }
  const hasSales = await InventoryTransaction.exists({ shopId, variantId, type: 'SALE' });
  if (hasSales) {
    const stamp = Date.now();
    await ProductVariant.updateOne(
      { _id: variantId, shopId },
      { $set: { isActive: false, stock: 0, ...(v.sku ? { sku: `${v.sku}-deleted-${stamp}` } : {}) } },
    );
  } else {
    await ProductVariant.deleteOne({ _id: variantId, shopId });
  }
  await Media.updateMany({ shopId, variantId }, { $set: { variantId: null } });
  await recomputeProductSummary(productId, shopId);
  void audit(actor, { action: 'variant.delete', entity: 'ProductVariant', entityId: variantId, before: { sku: v.sku, stock: v.stock }, meta: { productId: String(productId), deactivated: Boolean(hasSales) } });
  return { deleted: !hasSales, deactivated: Boolean(hasSales) };
}

