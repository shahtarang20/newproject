import type { Types } from 'mongoose';
import { AnalyticsDaily } from '@/database/models/analytics-daily.model';
import { AnalyticsEvent } from '@/database/models/analytics-event.model';
import { AuditLog } from '@/database/models/audit-log.model';
import { Catalogue } from '@/database/models/catalogue.model';
import { Category } from '@/database/models/category.model';
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
import { Shop, type IShop } from '@/database/models/shop.model';
import { PRODUCT_SPECS } from '../data/products';
import { DAY_MS, Rng } from '../prng';
import type { ShopContext, ShopDef } from '../types';
import { planAnalytics } from './analytics';
import { planCatalog } from './catalog';
import { planCustomers, type DemoCustomer } from './customers';
import { planAudit, planEnquiries, planNotifications } from './engagement';
import { planCatalogues, planOffers } from './extras';
import { planInventory } from './inventory';
import { applyOrderAggregates, planOrders } from './orders';
import { wipeTenantData } from './reset';

export interface ShopSeedResult {
  slug: string;
  name: string;
  templateId: string;
  products: number;
  variants: number;
  images: number;
  categories: number;
  catalogues: number;
  offers: number;
  coupons: number;
  customers: number;
  orders: number;
  inventoryTxns: number;
  enquiries: number;
  analyticsDaily: number;
  analyticsEvents: number;
  notifications: number;
  auditLogs: number;
}

export interface ShopSeedOptions { adminId: Types.ObjectId; proPlanCode: string; demoCustomer?: DemoCustomer; ownerName: string }

/** Generates (deterministically) and persists all tenant data for one seeded shop. Existing tenant data is wiped first. */
export async function seedShopData(def: ShopDef, shop: IShop, ownerId: Types.ObjectId, opts: ShopSeedOptions, now: Date): Promise<ShopSeedResult> {
  const ctx: ShopContext = { def, shopId: shop._id, ownerId, ownerName: opts.ownerName, currency: shop.currency, flatRateMinor: def.flatRateMinor, freeAboveMinor: def.freeAboveMinor };
  const rng = new Rng(def.rngSeed);
  await wipeTenantData(shop._id);

  const catalog = planCatalog(ctx, PRODUCT_SPECS[def.slug] ?? [], rng, now);
  const catalogues = planCatalogues(ctx, catalog, rng, now);
  const { offers, coupon } = planOffers(ctx, catalog, now);
  const customerPlan = planCustomers(ctx, rng, now, opts.demoCustomer);
  const orderPlan = await planOrders(ctx, rng, now, catalog.built, customerPlan, coupon, offers[0].startsAt ?? new Date(now.getTime() - 45 * DAY_MS));
  applyOrderAggregates(orderPlan.orders, customerPlan, catalog.built, coupon);
  const txns = planInventory(ctx, catalog.built, orderPlan.events, rng, now);
  const enquiries = planEnquiries(ctx, rng, now, catalog.built, customerPlan);
  const analytics = planAnalytics(ctx, rng, now, catalog.built, orderPlan.orders, enquiries, catalogues.map((c) => c._id));
  const notifications = planNotifications(ctx, now, catalog.built, orderPlan.orders, enquiries);
  const audit = planAudit(ctx, now, catalog.built, orderPlan.orders, catalogues.map((c) => ({ id: c._id, name: c.name, at: c.createdAt })), opts.adminId, opts.proPlanCode);

  const variants = catalog.built.flatMap((b) => b.variants);
  await Category.insertMany(catalog.categories);
  await Product.insertMany(catalog.built.map((b) => b.product));
  await ProductVariant.insertMany(variants);
  await Media.insertMany(catalog.media);
  await Catalogue.insertMany(catalogues);
  await Offer.insertMany(offers);
  await Coupon.insertMany([coupon]);
  await Customer.insertMany(customerPlan.customers);
  await CustomerAddress.insertMany(customerPlan.addresses);
  await Order.insertMany(orderPlan.orders);
  await Payment.insertMany(orderPlan.payments);
  await InventoryTransaction.insertMany(txns);
  await Enquiry.insertMany(enquiries);
  await AnalyticsDaily.insertMany(analytics.daily);
  await AnalyticsEvent.insertMany(analytics.events);
  await Notification.insertMany(notifications);
  await AuditLog.insertMany(audit);

  // Usage counters computed from exactly what was inserted (same keys limits.service enforces).
  const periodStart = shop.usage.periodStart;
  await Shop.updateOne(
    { _id: shop._id },
    {
      $set: {
        usage: {
          products: catalog.built.length, images: catalog.media.length, videos: 0, customers: customerPlan.customers.length, staff: 1,
          catalogues: catalogues.length, storageBytes: catalog.storageBytes, ordersThisPeriod: orderPlan.orders.filter((o) => o.createdAt >= periodStart).length, periodStart,
        },
      },
    },
  );

  return {
    slug: def.slug, name: def.name, templateId: def.templateId, products: catalog.built.length, variants: variants.length, images: catalog.media.length,
    categories: catalog.categories.length, catalogues: catalogues.length, offers: offers.length, coupons: 1, customers: customerPlan.customers.length,
    orders: orderPlan.orders.length, inventoryTxns: txns.length, enquiries: enquiries.length, analyticsDaily: analytics.daily.length,
    analyticsEvents: analytics.events.length, notifications: notifications.length, auditLogs: audit.length,
  };
}
