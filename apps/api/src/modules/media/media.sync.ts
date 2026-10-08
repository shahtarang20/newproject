import { Media } from '@/database/models/media.model';
import { Product, type IProductMediaRef } from '@/database/models/product.model';
import { invalidateShopCache } from '@/common/utils/cache';
import { oid, type Id } from '../products/product.utils';

/**
 * Re-derives Product.media / mediaIds / primaryImageUrl / primaryThumbUrl from the Media collection.
 * Guarantees exactly one primary image whenever at least one image exists.
 */
export async function syncProductMedia(productId: Id, shopId: Id): Promise<void> {
  const pid = oid(productId);
  const sid = oid(shopId);
  const items = await Media.find({ shopId: sid, productId: pid }).sort({ sortOrder: 1, createdAt: 1 }).lean();

  const images = items.filter((m) => m.kind === 'IMAGE');
  let primary = images.find((m) => m.isPrimary) ?? images[0];
  if (primary) {
    const primaryId = primary._id;
    const stale = items.filter((m) => m.isPrimary && !m._id.equals(primaryId)).map((m) => m._id);
    const ops: Array<Promise<unknown>> = [];
    if (stale.length) ops.push(Media.updateMany({ _id: { $in: stale } }, { $set: { isPrimary: false } }));
    if (!primary.isPrimary) ops.push(Media.updateOne({ _id: primaryId }, { $set: { isPrimary: true } }));
    await Promise.all(ops);
    primary = { ...primary, isPrimary: true };
  }

  const refs: IProductMediaRef[] = items.map((m, i) => ({
    mediaId: m._id,
    kind: m.kind,
    url: m.url,
    thumbUrl: m.thumbUrl,
    isPrimary: primary ? m._id.equals(primary._id) : false,
    sortOrder: i,
  }));
  await Product.updateOne(
    { _id: pid, shopId: sid },
    {
      $set: {
        media: refs,
        mediaIds: items.map((m) => m._id),
        ...(primary ? { primaryImageUrl: primary.url, primaryThumbUrl: primary.thumbUrl ?? primary.url } : {}),
      },
      ...(primary ? {} : { $unset: { primaryImageUrl: 1, primaryThumbUrl: 1 } }),
    },
  );
  invalidateShopCache(String(sid));
}
