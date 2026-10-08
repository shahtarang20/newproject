import { useEffect, useRef, useState } from 'react';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '@/api/endpoints/storefront';
import { absoluteUrl } from '@/utils/seo';
import { cn } from '@/utils/cn';
import { useStorefront } from '../hooks/useStorefront';
import { sfButtonClass, sfFocusRing } from './ui-sf';

interface Props {
  productId?: string;
  title: string;
  path: string;
  className?: string;
}

export function ShareButton({ productId, title, path, className }: Props) {
  const { shopSlug } = useStorefront();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const url = absoluteUrl(path);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) return e.key === 'Escape' ? setOpen(false) : undefined;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const track = (channel: string) => trackEvent(shopSlug, { type: 'PRODUCT_SHARE', productId, meta: { channel } });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy. Please copy the link from the address bar.');
    }
    track('copy');
    setOpen(false);
  };

  const native = async () => {
    try {
      await navigator.share({ title, url });
      track('native');
    } catch {
      /* user cancelled */
    }
    setOpen(false);
  };

  const item = cn('flex w-full items-center gap-2 rounded-[var(--sf-radius,6px)] px-3 py-2.5 text-left text-sm hover:bg-[color:var(--sf-muted)]', sfFocusRing);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={sfButtonClass('ghost', 'md')}>
        <Share2 className="h-4 w-4" aria-hidden="true" /> Share
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-52 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-1 shadow-xl">
          <a role="menuitem" className={item} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} onClick={() => { track('whatsapp'); setOpen(false); }}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
          <button role="menuitem" type="button" className={item} onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />} Copy link
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button role="menuitem" type="button" className={item} onClick={native}>
              <Share2 className="h-4 w-4" aria-hidden="true" /> More options…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
