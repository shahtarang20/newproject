import { Router } from 'express';
import mongoose from 'mongoose';
import auth from './auth/auth.routes';
import shops from './shops/shops.routes';
import products from './products/products.routes';
import media from './media/media.routes';
import categories from './categories/categories.routes';
import catalogues from './catalogues/catalogues.routes';
import customers from './customers/customers.routes';
import orders from './orders/orders.routes';
import inventory from './inventory/inventory.routes';
import enquiries from './enquiries/enquiries.routes';
import offers from './offers/offers.routes';
import analytics from './analytics/analytics.routes';
import subscriptions from './subscriptions/subscriptions.routes';
import admin from './admin/admin.routes';
import staff from './staff/staff.routes';
import notifications from './notifications/notifications.routes';
import payments from './payments/payments.routes';
import storefront from './storefront/storefront.routes';
import bulk from './bulk/bulk.routes';
import qr from './qr/qr.routes';

/** Mounted by app.ts under /api. */
const router = Router();

router.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    success: dbUp,
    data: { status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down', uptime: Math.round(process.uptime()) },
    message: dbUp ? 'OK' : 'Database unavailable',
  });
});

router.use('/auth', auth);
router.use('/shop', shops);
router.use('/products/:productId/media', media); // before /products so the nested router wins
router.use('/products', products);
router.use('/categories', categories);
router.use('/catalogues', catalogues);
router.use('/customers', customers);
router.use('/orders', orders);
router.use('/inventory', inventory);
router.use('/enquiries', enquiries);
router.use('/offers', offers);
router.use('/analytics', analytics);
router.use('/subscription', subscriptions);
router.use('/admin', admin);
router.use('/staff', staff);
router.use('/notifications', notifications);
router.use('/webhooks', payments);
router.use('/storefront', storefront);
router.use('/bulk', bulk);
router.use('/qr', qr);

export default router;
