import type { PlanFeatures, PlanLimits } from '@vastra/shared';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export interface PlanSeed {
  code: string;
  name: string;
  description: string;
  priceMinor: { MONTHLY: number; YEARLY: number };
  trialDays: number;
  limits: PlanLimits;
  features: PlanFeatures;
  isPublic: boolean;
  isDefault: boolean;
  sortOrder: number;
}

/**
 * SEED DEFAULTS ONLY. These rows are inserted once (when the plans collection is empty) and are then
 * editable by Super Admin. Enforcement ALWAYS reads limits from the database — never from this file.
 * null = unlimited.
 */
export const PLAN_SEEDS: readonly PlanSeed[] = [
  {
    code: 'FREE',
    name: 'Free',
    description: 'Get started with a digital catalogue for your shop.',
    priceMinor: { MONTHLY: 0, YEARLY: 0 },
    trialDays: 0,
    limits: { products: 25, images: 100, videos: 3, storageBytes: 500 * MB, customers: 100, ordersPerMonth: 30, staff: 1, catalogues: 2 },
    features: {
      customDomain: false, whatsappIntegration: false, analytics: true, advancedAnalytics: false,
      apiAccess: false, customBranding: false, bulkImport: false, prioritySupport: false,
    },
    isPublic: true,
    isDefault: true,
    sortOrder: 1,
  },
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'For growing shops that take regular orders.',
    priceMinor: { MONTHLY: 49900, YEARLY: 499000 },
    trialDays: 14,
    limits: { products: 200, images: 1000, videos: 20, storageBytes: 5 * GB, customers: 1000, ordersPerMonth: 300, staff: 3, catalogues: 10 },
    features: {
      customDomain: false, whatsappIntegration: true, analytics: true, advancedAnalytics: false,
      apiAccess: false, customBranding: false, bulkImport: true, prioritySupport: false,
    },
    isPublic: true,
    isDefault: false,
    sortOrder: 2,
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Higher limits, advanced analytics and branding.',
    priceMinor: { MONTHLY: 99900, YEARLY: 999000 },
    trialDays: 14,
    limits: { products: 1000, images: 6000, videos: 100, storageBytes: 25 * GB, customers: 10000, ordersPerMonth: 2000, staff: 10, catalogues: 50 },
    features: {
      customDomain: true, whatsappIntegration: true, analytics: true, advancedAnalytics: true,
      apiAccess: false, customBranding: true, bulkImport: true, prioritySupport: true,
    },
    isPublic: true,
    isDefault: false,
    sortOrder: 3,
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    description: 'Unlimited scale for large stores and multi-staff teams.',
    priceMinor: { MONTHLY: 249900, YEARLY: 2499000 },
    trialDays: 14,
    limits: { products: null, images: null, videos: null, storageBytes: 100 * GB, customers: null, ordersPerMonth: null, staff: 50, catalogues: null },
    features: {
      customDomain: true, whatsappIntegration: true, analytics: true, advancedAnalytics: true,
      apiAccess: true, customBranding: true, bulkImport: true, prioritySupport: true,
    },
    isPublic: true,
    isDefault: false,
    sortOrder: 4,
  },
];
