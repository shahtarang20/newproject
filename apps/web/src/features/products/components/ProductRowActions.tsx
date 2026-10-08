import { Link } from 'react-router-dom';
import { Archive, Copy, Eye, EyeOff, Link2, MessageCircle, MoreHorizontal, Pencil, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product } from '@/types/catalog';
import { publicProductUrl, whatsappShareUrl } from '../utils';

export interface RowActionHandlers {
  onDuplicate: (p: Product) => void;
  onToggleStatus: (p: Product, next: 'ACTIVE' | 'DRAFT') => void;
  onArchive: (p: Product) => void;
  onDelete: (p: Product) => void;
  onQr: (p: Product) => void;
}

interface Props extends RowActionHandlers {
  product: Product;
  shopSlug: string;
  canWrite: boolean;
  canDelete: boolean;
}

export function ProductRowActions({ product: p, shopSlug, canWrite, canDelete, onDuplicate, onToggleStatus, onArchive, onDelete, onQr }: Props) {
  const url = publicProductUrl(shopSlug, p.slug);
  const live = p.status === 'ACTIVE' || p.status === 'OUT_OF_STOCK';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/products/${p.id}`}><Pencil className="h-4 w-4" /> {canWrite ? 'Edit' : 'View'}</Link>
          </DropdownMenuItem>
          {canWrite && (
            <DropdownMenuItem onSelect={() => onDuplicate(p)}><Copy className="h-4 w-4" /> Duplicate</DropdownMenuItem>
          )}
          {canWrite && (live ? (
            <DropdownMenuItem onSelect={() => onToggleStatus(p, 'DRAFT')}><EyeOff className="h-4 w-4" /> Unpublish</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onToggleStatus(p, 'ACTIVE')}><Eye className="h-4 w-4" /> Publish</DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={copyLink}><Link2 className="h-4 w-4" /> Copy public link</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={whatsappShareUrl(p.name, url)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Share on WhatsApp</a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onQr(p)}><QrCode className="h-4 w-4" /> QR code</DropdownMenuItem>
          {(canWrite || canDelete) && <DropdownMenuSeparator />}
          {canWrite && p.status !== 'ARCHIVED' && (
            <DropdownMenuItem onSelect={() => onArchive(p)}><Archive className="h-4 w-4" /> Archive</DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onSelect={() => onDelete(p)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
