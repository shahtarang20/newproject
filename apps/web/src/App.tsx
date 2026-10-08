import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/api/queryClient';
import { ConfirmProvider } from '@/components/common/ConfirmDialog';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Splash } from '@/components/common/Splash';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from '@/routes/router';
import { useAuthStore } from '@/stores/auth.store';
import { applyTheme, useUiStore } from '@/stores/ui.store';

export default function App() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyTheme('system');
    mql.addEventListener('change', fn);
    return () => mql.removeEventListener('change', fn);
  }, [theme]);

  // Public storefront pages don't need to wait on auth; everything else does (guards show a splash).
  const booting = status === 'idle' || status === 'loading';
  const isPublicShop = window.location.pathname.startsWith('/shop/');

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={150}>
            <ConfirmProvider>
              {booting && !isPublicShop ? <Splash /> : <RouterProvider router={router} future={{ v7_startTransition: true }} />}
              <Toaster />
            </ConfirmProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
