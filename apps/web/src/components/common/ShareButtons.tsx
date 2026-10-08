import { Facebook, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from './CopyButton';

interface ShareButtonsProps {
  url: string;
  text?: string;
  className?: string;
}

export function ShareButtons({ url, text = 'Check this out', className }: ShareButtonsProps) {
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      <Button asChild variant="outline" size="sm">
        <a href={wa} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={fb} target="_blank" rel="noopener noreferrer">
          <Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook
        </a>
      </Button>
      <CopyButton value={url} label="Link">
        Copy link
      </CopyButton>
    </div>
  );
}
