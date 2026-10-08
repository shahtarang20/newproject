import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import MarketingLayout from '@/layouts/MarketingLayout';
import StorefrontLayout from '@/layouts/StorefrontLayout';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RedirectIfAuthed, RequireAuth, RequirePermission, RequireRole } from './guards';
import { lazyPage } from './lazyPage';

const guarded = (permission: Parameters<typeof RequirePermission>[0]['permission'], element: React.ReactNode): RouteObject['element'] => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

const dashboardRoutes: RouteObject[] = [
  { index: true, element: lazyPage(() => import('@/features/dashboard/pages/DashboardPage')) },
  { path: 'products', element: guarded('products:read', lazyPage(() => import('@/features/products/pages/ProductsPage'))) },
  { path: 'products/new', element: guarded('products:write', lazyPage(() => import('@/features/products/pages/ProductFormPage'))) },
  { path: 'products/:id', element: guarded('products:read', lazyPage(() => import('@/features/products/pages/ProductFormPage'))) },
  { path: 'categories', element: guarded('products:read', lazyPage(() => import('@/features/categories/pages/CategoriesPage'))) },
  { path: 'inventory', element: guarded('inventory:read', lazyPage(() => import('@/features/inventory/pages/InventoryPage'))) },
  { path: 'orders', element: guarded('orders:read', lazyPage(() => import('@/features/orders/pages/OrdersPage'))) },
  { path: 'orders/:id', element: guarded('orders:read', lazyPage(() => import('@/features/orders/pages/OrderDetailPage'))) },
  { path: 'customers', element: guarded('customers:read', lazyPage(() => import('@/features/customers/pages/CustomersPage'))) },
  { path: 'customers/:id', element: guarded('customers:read', lazyPage(() => import('@/features/customers/pages/CustomerDetailPage'))) },
  { path: 'catalogue', element: guarded('catalogues:write', lazyPage(() => import('@/features/catalogues/pages/CataloguesPage'))) },
  { path: 'enquiries', element: guarded('enquiries:read', lazyPage(() => import('@/features/enquiries/pages/EnquiriesPage'))) },
  { path: 'offers', element: guarded('offers:write', lazyPage(() => import('@/features/offers/pages/OffersPage'))) },
  { path: 'staff', element: guarded('staff:manage', lazyPage(() => import('@/features/staff/pages/StaffPage'))) },
  { path: 'analytics', element: guarded('analytics:read', lazyPage(() => import('@/features/analytics/pages/AnalyticsPage'))) },
  { path: 'settings', element: guarded('settings:write', lazyPage(() => import('@/features/settings/pages/SettingsPage'))) },
  { path: 'settings/shop', element: guarded('settings:write', lazyPage(() => import('@/features/settings/pages/ShopSettingsPage'))) },
  { path: 'settings/catalogue', element: guarded('settings:write', lazyPage(() => import('@/features/settings/pages/CatalogueSettingsPage'))) },
  { path: 'settings/notifications', element: guarded('settings:write', lazyPage(() => import('@/features/settings/pages/NotificationSettingsPage'))) },
  { path: 'subscription', element: guarded('subscription:manage', lazyPage(() => import('@/features/subscription/pages/SubscriptionPage'))) },
  { path: 'notifications', element: lazyPage(() => import('@/features/notifications/pages/NotificationsPage')) },
  { path: 'bulk', element: guarded('products:write', lazyPage(() => import('@/features/bulk/pages/BulkPage'))) },
];

const superAdminRoutes: RouteObject[] = [
  { index: true, element: lazyPage(() => import('@/features/super-admin/pages/SuperAdminDashboardPage')) },
  { path: 'shops', element: lazyPage(() => import('@/features/super-admin/pages/ShopsPage')) },
  { path: 'users', element: lazyPage(() => import('@/features/super-admin/pages/UsersPage')) },
  { path: 'plans', element: lazyPage(() => import('@/features/super-admin/pages/PlansPage')) },
  { path: 'subscriptions', element: lazyPage(() => import('@/features/super-admin/pages/SubscriptionsPage')) },
  { path: 'analytics', element: lazyPage(() => import('@/features/super-admin/pages/AdminAnalyticsPage')) },
  { path: 'storage', element: lazyPage(() => import('@/features/super-admin/pages/StoragePage')) },
  { path: 'settings', element: lazyPage(() => import('@/features/super-admin/pages/AdminSettingsPage')) },
  { path: 'logs', element: lazyPage(() => import('@/features/super-admin/pages/LogsPage')) },
];

const storefrontRoutes: RouteObject[] = [
  { index: true, element: lazyPage(() => import('@/features/storefront/pages/HomePage')) },
  { path: 'products', element: lazyPage(() => import('@/features/storefront/pages/ProductsPage')) },
  { path: 'category/:categorySlug', element: lazyPage(() => import('@/features/storefront/pages/CategoryPage')) },
  { path: 'product/:productSlug', element: lazyPage(() => import('@/features/storefront/pages/ProductPage')) },
  { path: 'catalogue/:catalogueSlug', element: lazyPage(() => import('@/features/storefront/pages/CataloguePage')) },
  { path: 'cart', element: lazyPage(() => import('@/features/storefront/pages/CartPage')) },
  { path: 'checkout', element: lazyPage(() => import('@/features/storefront/pages/CheckoutPage')) },
  { path: 'order-success', element: lazyPage(() => import('@/features/storefront/pages/OrderSuccessPage')) },
  { path: 'track-order', element: lazyPage(() => import('@/features/storefront/pages/TrackOrderPage')) },
];

function Root() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          { path: '/', element: lazyPage(() => import('@/features/marketing/pages/LandingPage')) },
          { path: '/pricing', element: lazyPage(() => import('@/features/marketing/pages/PricingPage')) },
          { path: '/about', element: lazyPage(() => import('@/features/marketing/pages/AboutPage')) },
          { path: '/contact', element: lazyPage(() => import('@/features/marketing/pages/ContactPage')) },
        ],
      },
      {
        element: <RedirectIfAuthed />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/login', element: lazyPage(() => import('@/features/auth/pages/LoginPage')) },
              { path: '/register', element: lazyPage(() => import('@/features/auth/pages/RegisterPage')) },
            ],
          },
        ],
      },
      {
        element: <AuthLayout />,
        children: [{ path: '/accept-invite', element: lazyPage(() => import('@/features/auth/pages/AcceptInvitePage')) }],
      },
      { path: '/shop/:shopSlug', element: <StorefrontLayout />, children: storefrontRoutes },
      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <RequireRole roles={['SHOP_USER']}>
              <DashboardLayout />
            </RequireRole>
          </RequireAuth>
        ),
        children: dashboardRoutes,
      },
      {
        path: '/super-admin',
        element: (
          <RequireAuth>
            <RequireRole roles={['SUPER_ADMIN']}>
              <SuperAdminLayout />
            </RequireRole>
          </RequireAuth>
        ),
        children: superAdminRoutes,
      },
      { path: '/home', element: <Navigate to="/" replace /> },
      { path: '*', element: lazyPage(() => import('@/pages/NotFoundPage')) },
    ],
  },
], {
  // Opt in to React Router v7 behaviour now so the dev console stays free of upgrade warnings.
  future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true },
});
