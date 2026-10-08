import { Types, type PipelineStage } from 'mongoose';
import { buildMeta } from '@/common/pagination';
import { InventoryTransaction } from '@/database/models/inventory-transaction.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { Shop } from '@/database/models/shop.model';
import type { InventoryListQuery, TransactionsQuery } from './inventory.schemas';

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface InventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  productSlug?: string;
  imageUrl?: string;
  sku?: string;
  colour?: string;
  size?: string;
  stock: number;
  lowStockThreshold: number;
  status: 'OK' | 'LOW' | 'OUT';
  sellingPriceMinor: number;
}

export interface InventorySummary {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
}

/** Shared head of the pipeline: variants of live products with a resolved threshold and status. */
function basePipeline(shopId: Types.ObjectId, shopThreshold: number, extraMatch: Record<string, unknown> = {}): PipelineStage[] {
  return [
    { $match: { shopId, isActive: true, ...extraMatch } },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $match: { 'product.deletedAt': null, 'product.shopId': shopId } },
    { $addFields: { threshold: { $ifNull: ['$lowStockThreshold', { $ifNull: ['$product.lowStockThreshold', shopThreshold] }] } } },
    {
      $addFields: {
        status: { $cond: [{ $lte: ['$stock', 0] }, 'OUT', { $cond: [{ $lte: ['$stock', '$threshold'] }, 'LOW', 'OK'] }] },
      },
    },
  ];
}

export async function listInventory(shopId: string, q: InventoryListQuery): Promise<{ rows: InventoryRow[]; summary: InventorySummary; meta: ReturnType<typeof buildMeta> }> {
  const sid = new Types.ObjectId(shopId);
  const shop = await Shop.findById(sid).select('notificationSettings').lean();
  const shopThreshold = shop?.notificationSettings?.lowStockThreshold ?? 5;
  const extra: Record<string, unknown> = {};
  if (q.productId) extra.productId = new Types.ObjectId(q.productId);

  const pipeline = basePipeline(sid, shopThreshold, extra);
  const search: PipelineStage[] = q.q
    ? [
        {
          $match: {
            $or: [{ 'product.name': new RegExp(escapeRegex(q.q), 'i') }, { sku: new RegExp(escapeRegex(q.q), 'i') }, { 'product.sku': new RegExp(escapeRegex(q.q), 'i') }],
          },
        },
      ]
    : [];
  const statusMatch: PipelineStage[] = q.filter === 'low' ? [{ $match: { status: 'LOW' } }] : q.filter === 'out' ? [{ $match: { status: 'OUT' } }] : [];

  const [pageAgg, summaryAgg] = await Promise.all([
    ProductVariant.aggregate([
      ...pipeline,
      ...search,
      ...statusMatch,
      {
        $facet: {
          rows: [
            { $sort: { stock: 1, 'product.name': 1, _id: 1 } },
            { $skip: (q.page - 1) * q.limit },
            { $limit: q.limit },
          ],
          total: [{ $count: 'n' }],
        },
      },
    ]),
    ProductVariant.aggregate([
      ...pipeline,
      {
        $group: {
          _id: null,
          products: { $addToSet: '$productId' },
          totalVariants: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          lowStock: { $sum: { $cond: [{ $eq: ['$status', 'LOW'] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ['$status', 'OUT'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const facet = pageAgg[0] as { rows: Array<Record<string, any>>; total: Array<{ n: number }> }; // eslint-disable-line @typescript-eslint/no-explicit-any -- raw aggregation output
  const rows: InventoryRow[] = facet.rows.map((r) => ({
    variantId: String(r._id),
    productId: String(r.productId),
    productName: r.product.name,
    productSlug: r.product.slug,
    imageUrl: r.imageUrl ?? r.product.primaryThumbUrl ?? r.product.primaryImageUrl,
    sku: r.sku,
    colour: r.colour?.name,
    size: r.size,
    stock: r.stock,
    lowStockThreshold: r.threshold,
    status: r.status,
    sellingPriceMinor: r.sellingPriceMinor,
  }));
  const s = summaryAgg[0] as { products: unknown[]; totalVariants: number; totalStock: number; lowStock: number; outOfStock: number } | undefined;
  const summary: InventorySummary = {
    totalProducts: s?.products.length ?? 0,
    totalVariants: s?.totalVariants ?? 0,
    totalStock: s?.totalStock ?? 0,
    lowStock: s?.lowStock ?? 0,
    outOfStock: s?.outOfStock ?? 0,
  };
  return { rows, summary, meta: buildMeta(q.page, q.limit, facet.total[0]?.n ?? 0) };
}

export async function listTransactions(shopId: string, q: TransactionsQuery) {
  const sid = new Types.ObjectId(shopId);
  const filter: Record<string, unknown> = { shopId: sid };
  if (q.variantId) filter.variantId = new Types.ObjectId(q.variantId);
  if (q.productId) filter.productId = new Types.ObjectId(q.productId);
  if (q.type) filter.type = q.type;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };

  const [total, docs] = await Promise.all([
    InventoryTransaction.countDocuments(filter),
    InventoryTransaction.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
  ]);

  const variants = await ProductVariant.find({ shopId: sid, _id: { $in: [...new Set(docs.map((d) => String(d.variantId)))] } })
    .select('sku size colour productId')
    .populate({ path: 'productId', select: 'name', options: { lean: true } })
    .lean();
  const vMap = new Map(variants.map((v) => [String(v._id), v]));

  const items = docs.map((d) => {
    const v = vMap.get(String(d.variantId));
    const product = v?.productId as unknown as { name?: string } | undefined;
    return {
      id: String(d._id),
      type: d.type,
      quantity: d.quantity,
      balanceAfter: d.balanceAfter,
      reason: d.reason,
      productId: String(d.productId),
      productName: product?.name,
      variantId: String(d.variantId),
      sku: v?.sku,
      colour: v?.colour?.name,
      size: v?.size,
      orderId: d.orderId ? String(d.orderId) : undefined,
      createdBy: d.createdBy ? String(d.createdBy) : undefined,
      createdAt: d.createdAt,
    };
  });
  return { items, meta: buildMeta(q.page, q.limit, total) };
}
