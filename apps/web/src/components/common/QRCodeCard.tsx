import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CopyButton } from './CopyButton';
import { cn } from '@/utils/cn';

interface QRCodeCardProps {
  url: string;
  title?: string;
  description?: string;
  fileName?: string;
  size?: number;
  className?: string;
}

export function QRCodeCard({ url, title = 'Scan to open', description, fileName = 'qr-code', size = 176, className }: QRCodeCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = ref.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${fileName}.png`;
    a.click();
  };

  return (
    <Card className={cn('flex flex-col items-center gap-4 p-5 text-center', className)}>
      <div ref={ref} className="rounded-xl border bg-white p-3">
        {/* 4x canvas for crisp downloads, scaled down via CSS */}
        <QRCodeCanvas value={url} size={size * 4} level="M" marginSize={0} style={{ width: size, height: size }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        <p className="mt-1 max-w-[16rem] truncate text-xs text-muted-foreground">{url}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={download}>
          <Download className="h-4 w-4" /> Download PNG
        </Button>
        <CopyButton value={url} label="Link">
          Copy link
        </CopyButton>
      </div>
    </Card>
  );
}
