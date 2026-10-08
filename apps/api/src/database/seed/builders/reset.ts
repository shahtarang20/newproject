import { Types } from 'mongoose';
import { AnalyticsDaily } from '@/database/models/analytics-daily.model';
import { AnalyticsEvent } from '@/database/models/analytics-event.model';
import { AuditLog } from '@/database/models/audit-log.model';
import { Cart } from '@/database/models/cart.model';
import { Catalogue } from '@/database/models/catalogue.model';
import { Category } from '@/database/models/category.model';
import { Counter } from '@/database/models/counter.model';
import { Coupon } from '@/database/models/coupon.model';
import { CustomerAddress } from '@/database/models/customer-address.model';
import { Customer } from '@/database/models/customer.model';
import { Enquiry } from '@/database/models/enquiry.model';
import { InventoryTransaction } from '@/database/models/inventory-transaction.model';
import { Media } from '@/database/models/media.model';
import { Notification } from '@/database/models/notification.model';
import { Offer } from '@/database/models/offer.model';
import { Order } from '@/database/models/order.model';
import { Payment } from '@/database/models/payment.model';
import { ProductVariant } from '@/database/models/product-variant.model';
import { Product } from '@/database/models/product.model';
import { RefreshToken } from '@/database/models/refresh-token.model';
import { Shop } from '@/database/models/shop.model';
import { ShopStaff } from '@/database/models/shop-staff.model';
import { Subscription } from '@/database/models/subscription.model';
import { User } from '@/database/models/user.model';

/** Deletes every tenant-scoped document of one seeded shop (and its order counters). Shop/user/subscription rows are kept. */
export async function wipeTenantData(shopId: Types.ObjectId): Promise<void> {
  await Promise.all([
    Category.deleteMany({ shopId }), Product.deleteMany({ shopId }), ProductVariant.deleteMany({ shopId }), Media.deleteMany({ shopId }),
    Catalogue.deleteMany({ shopId }), InventoryTransaction.deleteMany({ shopId }), Customer.deleteMany({ shopId }), CustomerAddress.deleteMany({ shopId }),
    Cart.deleteMany({ shopId }), Order.deleteMany({ shopId }), Payment.deleteMany({ shopId }), Enquiry.deleteMany({ shopId }), Offer.deleteMany({ shopId }),
    Coupon.deleteMany({ shopId }), Notification.deleteMany({ shopId }), AnalyticsEvent.deleteMany({ shopId }), AnalyticsDaily.deleteMany({ shopId }),
    AuditLog.deleteMany({ shopId }), Counter.deleteMany({ _id: new RegExp(`^order:${String(shopId)}:`) }),
  ]);
}

/** --reset: additionally drops the seeded shops themselves, their staff/subscription rows and their owner accounts. */
export async function dropSeededShops(slugs: string[], ownerEmails: string[]): Promise<number> {
  const shops = await Shop.find({ slug: { $in: slugs } }).select('_id').lean();
  for (const s of shops) {
    await wipeTenantData(s._id);
    await Promise.all([ShopStaff.deleteMany({ shopId: s._id }), Subscription.deleteMany({ shopId: s._id }), Shop.deleteOne({ _id: s._id })]);
  }
  const owners = await User.find({ email: { $in: ownerEmails } }).select('_id').lean();
  const ids = owners.map((u) => u._id);
  await Promise.all([RefreshToken.deleteMany({ userId: { $in: ids } }), User.deleteMany({ _id: { $in: ids } })]);
  return shops.length;
}
