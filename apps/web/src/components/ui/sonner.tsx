import { Toaster as Sonner } from 'sonner';
import { useUiStore } from '@/stores/ui.store';

export function Toaster() {
  const theme = useUiStore((s) => s.theme);
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: 'rounded-xl border shadow-float font-sans' } }}
    />
  );
}

export { toast } from 'sonner';
