import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeCard } from '@/components/common/QRCodeCard';
import { ShareButtons } from '@/components/common/ShareButtons';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  shareText?: string;
  fileName?: string;
}

/** QR code + share buttons for any public URL (product, catalogue). */
export function ShareDialog({ open, onOpenChange, url, title, shareText, fileName }: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Scan the code or share the link with customers.</DialogDescription>
        </DialogHeader>
        <QRCodeCard url={url} title="Scan to open" fileName={fileName ?? 'qr-code'} className="border-0 shadow-none" />
        <ShareButtons url={url} text={shareText ?? title} />
      </DialogContent>
    </Dialog>
  );
}
