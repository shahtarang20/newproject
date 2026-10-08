import type { Types } from 'mongoose';
import { Errors } from '@/common/errors';
import { audit, type AuditActor } from '@/common/audit';
import { uniqueSlug } from '@/common/slug';
import { invalidateShopCache } from '@/common/utils/cache';
import { Category, type ICategory } from '@/database/models/category.model';
import { Product } from '@/database/models/product.model';
import { escapeRegex, oid, retryOnDuplicate, withId, type Id } from '../products/product.utils';
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from './categories.schemas';

export interface CategoryDto extends Omit<ICategory, '_id' | 'shopId'> {
  id: string;
  shopId: Types.ObjectId;
  productCount: number;
  childCount: number;
  children?: CategoryDto[];
}

const notFound = () => Errors.notFound('CATEGORY_NOT_FOUND', 'Category not found');

async function productCounts(shopId: Types.ObjectId): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { shopId, deletedAt: null, categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

/** Ids of the category and all its descendants. */
export async function subtreeIds(shopId: Types.ObjectId, rootId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const all = await Category.find({ shopId }).select('parentId').lean();
  const children = new Map<string, Types.ObjectId[]>();
  for (const c of all) {
    const key = c.parentId ? String(c.parentId) : '';
    children.set(key, [...(children.get(key) ?? []), c._id]);
  }
  const out: Types.ObjectId[] = [rootId];
  for (let i = 0; i < out.length; i++) out.push(...(children.get(String(out[i])) ?? []));
  return out;
}

async function assertParent(shopId: Types.ObjectId, parentId: Id, selfId?: Types.ObjectId): Promise<Types.ObjectId> {
  const pid = oid(parentId);
  const parent = await Category.exists({ _id: pid, shopId });
  if (!parent) throw Errors.badRequest('CATEGORY_NOT_FOUND', 'Parent category not found');
  if (selfId) {
    const ids = await subtreeIds(shopId, selfId);
    if (ids.some((i) => i.equals(pid))) throw Errors.badRequest('VALIDATION_ERROR', 'A category cannot be moved under itself or its own sub-category');
  }
  return pid;
}

export async function listCategories(shopId: Types.ObjectId, q: ListCategoriesQuery): Promise<CategoryDto[]> {
  const filter: Record<string, unknown> = { shopId };
  if (q.isActive !== undefined) filter.isActive = q.isActive;
  if (q.parentId) filter.parentId = q.parentId === 'root' ? null : oid(q.parentId);
  if (q.q) filter.name = { $regex: escapeRegex(q.q), $options: 'i' };

  const [docs, counts, parents] = await Promise.all([
    Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean(),
    productCounts(shopId),
    Category.aggregate<{ _id: Types.ObjectId | null; n: number }>([
      { $match: { shopId, parentId: { $ne: null } } },
      { $group: { _id: '$parentId', n: { $sum: 1 } } },
    ]),
  ]);
  const childCounts = new Map(parents.map((p) => [String(p._id), p.n]));
  const flat = docs.map((d) => ({
    ...withId(d),
    productCount: counts.get(String(d._id)) ?? 0,
    childCount: childCounts.get(String(d._id)) ?? 0,
  })) as unknown as CategoryDto[];
  if (!q.tree) return flat;

  const byId = new Map(flat.map((c) => [c.id, { ...c, children: [] as CategoryDto[] }]));
  const roots: CategoryDto[] = [];
  for (const c of byId.values()) {
    const parent = c.parentId ? byId.get(String(c.parentId)) : undefined;
    if (parent) parent.children?.push(c);
    else roots.push(c);
  }
  return roots;
}

export async function getCategory(shopId: Types.ObjectId, id: Id): Promise<CategoryDto> {
  const doc = await Category.findOne({ _id: oid(id), shopId }).lean();
  if (!doc) throw notFound();
  const [productCount, childCount] = await Promise.all([
    Product.countDocuments({ shopId, categoryId: doc._id, deletedAt: null }),
    Category.countDocuments({ shopId, parentId: doc._id }),
  ]);
  return { ...withId(doc), productCount, childCount } as unknown as CategoryDto;
}

export async function createCategory(shopId: Types.ObjectId, input: CreateCategoryInput, actor: AuditActor): Promise<CategoryDto> {
  const parentId = input.parentId ? await assertParent(shopId, input.parentId) : null;
  const doc = await retryOnDuplicate(async () => {
    const slug = await uniqueSlug(Category, input.slug || input.name, { shopId });
    return Category.create({
      shopId,
      name: input.name,
      slug,
      parentId,
      description: input.description,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });
  });
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'category.create', entity: 'Category', entityId: doc._id, after: { name: doc.name, slug: doc.slug, parentId } });
  return { ...withId(doc.toObject()), productCount: 0, childCount: 0 } as unknown as CategoryDto;
}

export async function updateCategory(shopId: Types.ObjectId, id: Id, input: UpdateCategoryInput, actor: AuditActor): Promise<CategoryDto> {
  const cid = oid(id);
  const before = await Category.findOne({ _id: cid, shopId }).lean();
  if (!before) throw notFound();

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const key of ['name', 'sortOrder', 'isActive'] as const) if (input[key] !== undefined) $set[key] = input[key];
  for (const key of ['description', 'imageUrl'] as const) {
    if (input[key] === null) $unset[key] = 1;
    else if (input[key] !== undefined) $set[key] = input[key];
  }
  if (input.parentId !== undefined) $set.parentId = input.parentId === null ? null : await assertParent(shopId, input.parentId, cid);

  await retryOnDuplicate(async () => {
    if (input.slug !== undefined) $set.slug = await uniqueSlug(Category, input.slug, { shopId }, 'slug', { excludeId: cid });
    await Category.updateOne({ _id: cid, shopId }, { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) });
  });
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'category.update', entity: 'Category', entityId: cid, before: { name: before.name, slug: before.slug, parentId: before.parentId, isActive: before.isActive }, after: input });
  return getCategory(shopId, cid);
}

export async function reorderCategories(shopId: Types.ObjectId, items: Array<{ id: string; sortOrder: number }>, actor: AuditActor): Promise<void> {
  await Category.bulkWrite(items.map((i) => ({ updateOne: { filter: { _id: oid(i.id), shopId }, update: { $set: { sortOrder: i.sortOrder } } } })));
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'category.reorder', entity: 'Category', meta: { count: items.length } });
}

export async function setCategoryImage(shopId: Types.ObjectId, id: Id, imageUrl: string, actor: AuditActor): Promise<CategoryDto> {
  const res = await Category.updateOne({ _id: oid(id), shopId }, { $set: { imageUrl } });
  if (!res.matchedCount) throw notFound();
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'category.image', entity: 'Category', entityId: String(id), after: { imageUrl } });
  return getCategory(shopId, id);
}

export async function deleteCategory(shopId: Types.ObjectId, id: Id, reassignTo: string | undefined, actor: AuditActor): Promise<void> {
  const cid = oid(id);
  const cat = await Category.findOne({ _id: cid, shopId }).lean();
  if (!cat) throw notFound();

  const [productCount, childCount] = await Promise.all([
    Product.countDocuments({ shopId, categoryId: cid, deletedAt: null }),
    Category.countDocuments({ shopId, parentId: cid }),
  ]);
  if ((productCount > 0 || childCount > 0) && !reassignTo) {
    throw Errors.conflict(
      'CONFLICT',
      `This category has ${productCount} product(s) and ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'}. Move them first or pass ?reassignTo=<categoryId|none>.`,
    );
  }

  let target: Types.ObjectId | null = null;
  if (reassignTo && reassignTo !== 'none') {
    target = oid(reassignTo);
    const subtree = await subtreeIds(shopId, cid);
    if (subtree.some((i) => i.equals(target as Types.ObjectId))) throw Errors.badRequest('VALIDATION_ERROR', 'reassignTo cannot be this category or one of its sub-categories');
    if (!(await Category.exists({ _id: target, shopId }))) throw Errors.badRequest('CATEGORY_NOT_FOUND', 'Target category not found');
  }
  if (reassignTo) {
    // Includes soft-deleted products so nothing keeps a dangling reference.
    await Product.updateMany({ shopId, categoryId: cid }, { $set: { categoryId: target } });
    await Category.updateMany({ shopId, parentId: cid }, { $set: { parentId: target } });
  }
  await Category.deleteOne({ _id: cid, shopId });
  invalidateShopCache(String(shopId));
  void audit(actor, { action: 'category.delete', entity: 'Category', entityId: cid, before: { name: cat.name, slug: cat.slug }, meta: { reassignTo: reassignTo ?? null, productCount, childCount } });
}
