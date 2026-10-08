import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CopyButton } from '@/components/common/CopyButton';
import { QRCodeCard } from '@/components/common/QRCodeCard';

export const shopShareKey = (shopId?: string) => `vastra:shop-shared:${shopId ?? ''}`;
export const storefrontUrl = (slug: string) => `${window.location.origin}/shop/${slug}`;

export function markShared(shopId?: string) {
  try {
    localStorage.setItem(shopShareKey(shopId), '1');
    window.dispatchEvent(new Event('vastra:shop-shared'));
  } catch {
    /* storage unavailable */
  }
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slug: string;
  shopId?: string;
  shopName?: string;
}

export function ShareShopDialog({ open, onOpenChange, slug, shopId, shopName }: Props) {
  const url = storefrontUrl(slug);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Browse ${shopName ?? 'our'} catalogue online: ${url}`)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share your shop</DialogTitle>
          <DialogDescription>Send customers this link or let them scan the QR code.</DialogDescription>
        </DialogHeader>
        <QRCodeCard url={url} title={shopName ?? 'Your shop'} fileName={`${slug}-qr`} className="border-0 p-0 shadow-none" />
        <div className="grid grid-cols-2 gap-2" onClickCapture={() => markShared(shopId)}>
          <Button asChild variant="outline">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
            </a>
          </Button>
          <CopyButton value={url} label="Shop link" size="default" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
