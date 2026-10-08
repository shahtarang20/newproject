/** Loads Razorpay's checkout script on demand (once). */
interface RazorpayInstance {
  open(): void;
  on?(event: string, cb: (resp: unknown) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (!loading) {
    loading = new Promise<boolean>((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve(!!window.Razorpay);
      s.onerror = () => {
        loading = null;
        s.remove();
        resolve(false);
      };
      document.body.appendChild(s);
    });
  }
  return loading;
}

export interface RazorpayResult {
  status: 'success' | 'dismissed' | 'failed' | 'unavailable';
  payload?: unknown;
}

export async function openRazorpay(clientPayload: Record<string, unknown>, prefill: { name?: string; contact?: string; email?: string }): Promise<RazorpayResult> {
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) return { status: 'unavailable' };
  return new Promise<RazorpayResult>((resolve) => {
    const rzp = new window.Razorpay!({
      ...clientPayload,
      prefill: { ...(clientPayload.prefill as object | undefined), ...prefill },
      handler: (resp: unknown) => resolve({ status: 'success', payload: resp }),
      modal: { ...(clientPayload.modal as object | undefined), ondismiss: () => resolve({ status: 'dismissed' }) },
    });
    rzp.on?.('payment.failed', () => resolve({ status: 'failed' }));
    rzp.open();
  });
}
