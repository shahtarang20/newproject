import mongoose from 'mongoose';
import { env } from '@/config/env';
import { connectDatabase, disconnectDatabase } from '@/database/connection';
import { normalisePhone } from '@/common/utils/phone';
import { ensurePlans, resolveCredentials, upsertShopWithSubscription, upsertUser, type Credential } from './builders/accounts';
import { dropSeededShops } from './builders/reset';
import { seedShopData, type ShopSeedResult } from './builders/shop';
import { SHOP_DEFS } from './data/shops';

/* eslint-disable no-console */
const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const FORCE = args.has('--force');

const printCreds = (label: string, c: Credential): string => `${label.padEnd(12)} ${c.email.padEnd(28)} ${c.generated ? `${c.password}   (generated, shown once)` : '(from env)'}`;

async function main(): Promise<void> {
  if (env.isProd && !FORCE) {
    console.error('Refusing to seed: NODE_ENV=production. Re-run with --force if you really mean it.');
    process.exit(1);
  }
  const now = new Date();
  const creds = resolveCredentials();
  await connectDatabase();
  console.log(`Seeding "${mongoose.connection.name}"${RESET ? ' (--reset: dropping seeded shops first)' : ''} ...`);

  if (RESET) {
    const dropped = await dropSeededShops(SHOP_DEFS.map((d) => d.slug), SHOP_DEFS.map((d) => creds.ownerEmail(d.ownerEmailKey)));
    console.log(`Dropped ${dropped} seeded shop(s) and their owners.`);
  }

  const proPlan = await ensurePlans();
  const adminId = await upsertUser({ email: creds.superAdmin.email, name: 'Vastra Admin', role: 'SUPER_ADMIN', password: creds.superAdmin.password });
  const customerPhone = normalisePhone('+919000000099');
  const customerUserId = await upsertUser({ email: creds.customer.email, name: 'Demo Customer', phone: customerPhone, role: 'CUSTOMER', password: creds.customer.password });

  const results: ShopSeedResult[] = [];
  for (const def of SHOP_DEFS) {
    const email = creds.ownerEmail(def.ownerEmailKey);
    const ownerId = await upsertUser({ email, name: def.ownerName, phone: def.ownerPhone, role: 'SHOP_USER', password: creds.owner.password });
    const shop = await upsertShopWithSubscription(def, ownerId, email, proPlan, now);
    const demoCustomer = def.ownerEmailKey === 'owner' ? { userId: customerUserId, name: 'Demo Customer', email: creds.customer.email, phone: customerPhone } : undefined;
    results.push(await seedShopData(def, shop, ownerId, { adminId, proPlanCode: proPlan.code, demoCustomer, ownerName: def.ownerName }, now));
    console.log(`  seeded ${def.name}`);
  }

  const front = env.FRONTEND_URL.replace(/\/+$/, '');
  console.log('\n=== Vastra demo data ready ===\n');
  console.log('Demo logins (passwords come from SEED_*_PASSWORD env vars; empty ones were generated for this run):');
  console.log('  ' + printCreds('Super admin', creds.superAdmin));
  console.log('  ' + printCreds('Customer', creds.customer));
  for (const def of SHOP_DEFS) console.log('  ' + printCreds('Owner', { ...creds.owner, email: creds.ownerEmail(def.ownerEmailKey) }) + `  -> ${def.name}`);
  console.log(`\nPlan: ${proPlan.code} (assigned to all demo shops)\n\nPublic storefronts:`);
  for (const r of results) console.log(`  ${front}/shop/${r.slug}   [${r.templateId}]`);
  console.log('\nCounts per shop:');
  for (const r of results) {
    console.log(`  ${r.name}: ${r.products} products, ${r.variants} variants, ${r.images} images, ${r.categories} categories, ${r.catalogues} catalogues, ${r.offers} offers + ${r.coupons} coupon (WELCOME10), ${r.customers} customers, ${r.orders} orders, ${r.inventoryTxns} stock txns, ${r.enquiries} enquiries, ${r.analyticsDaily} daily rollups, ${r.analyticsEvents} events, ${r.notifications} notifications, ${r.auditLogs} audit logs`);
  }
}

main()
  .then(() => disconnectDatabase())
  .catch(async (err: unknown) => {
    console.error('Seed failed:', err);
    await disconnectDatabase();
    process.exit(1);
  });
