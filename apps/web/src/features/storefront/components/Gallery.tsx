import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Play, ZoomIn } from 'lucide-react';
import type { PublicMedia } from '@/types/storefront';
import { cn } from '@/utils/cn';
import { useTemplate } from '../templates/useTemplate';
import { sfFocusRing } from './ui-sf';
import { fetchPriority } from '@/utils/dom';

interface Props {
  media: PublicMedia[];
  name: string;
  /** when set (e.g. a variant image) the gallery jumps to the matching media */
  activeUrl?: string;
  className?: string;
}

function ZoomImage({ m, name, priority }: { m: PublicMedia; name: string; priority: boolean }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const kind = useRef<string>('mouse');

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
    if (e.pointerType === 'mouse') setZoom(true);
  };

  if (m.kind === 'VIDEO') {
    return (
      <video
        src={m.url}
        poster={m.thumbUrl}
        controls
        playsInline
        preload="none"
        className="h-full w-full bg-black object-contain"
        aria-label={m.alt ?? `${name} video`}
      />
    );
  }
  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', zoom ? 'cursor-zoom-out' : 'cursor-zoom-in')}
      onPointerMove={move}
      onPointerDown={(e) => {
        kind.current = e.pointerType;
      }}
      onPointerLeave={() => setZoom(false)}
      onClick={() => {
        if (kind.current !== 'mouse') {
          setZoom((z) => !z);
        }
      }}
    >
      <img
        src={m.url}
        alt={m.alt ?? name}
        width={m.width}
        height={m.height}
        loading={priority ? 'eager' : 'lazy'}
        {...fetchPriority(priority ? 'high' : 'auto')}
        decoding="async"
        draggable={false}
        style={{ transformOrigin: origin }}
        className={cn('h-full w-full object-cover transition-transform duration-200 motion-reduce:transition-none', zoom && 'scale-[2]')}
      />
      {!zoom && (
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[color:var(--sf-bg)]/80 p-1.5 md:hidden">
          <ZoomIn className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

export function Gallery({ media, name, activeUrl, className }: Props) {
  const { productPage } = useTemplate();
  const layout = productPage.galleryLayout;
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const items = media.length ? media : [];

  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
    setIndex(i);
  }, []);

  useEffect(() => {
    if (!activeUrl) return;
    const i = items.findIndex((m) => m.url === activeUrl);
    if (i >= 0) goTo(i);
  }, [activeUrl, items, goTo]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  if (!items.length) {
    return (
      <div className={cn('flex aspect-[4/5] items-center justify-center rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)] text-sm text-[color:var(--sf-muted-fg)]', className)}>
        No image available
      </div>
    );
  }

  const aspect = 'aspect-[4/5]';
  const stacked = layout === 'stacked';

  const thumbs = items.length > 1 && !stacked && (
    <div
      className={cn(
        'hidden gap-2 md:flex',
        layout === 'thumbs-left' ? 'max-h-[640px] w-20 shrink-0 flex-col overflow-y-auto' : 'mt-3 overflow-x-auto',
      )}
      role="tablist"
      aria-label="Product images"
    >
      {items.map((m, i) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Show image ${i + 1}`}
          onClick={() => goTo(i)}
          className={cn(
            'relative h-24 w-[4.75rem] shrink-0 overflow-hidden rounded-[var(--sf-radius,6px)] border-2 transition',
            sfFocusRing,
            i === index ? 'border-[color:var(--sf-primary)]' : 'border-transparent opacity-75 hover:opacity-100',
          )}
        >
          <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          {m.kind === 'VIDEO' && <Play className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );

  return (
    <div className={cn(layout === 'thumbs-left' && 'md:flex md:gap-3', className)} role="region" aria-roledescription="carousel" aria-label={`${name} images`}>
      {layout === 'thumbs-left' && thumbs}
      <div className="relative min-w-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          className={cn(
            'flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            stacked && 'md:grid md:grid-cols-2 md:gap-3 md:overflow-visible',
          )}
        >
          {items.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                'w-full shrink-0 snap-center overflow-hidden bg-[color:var(--sf-muted)] md:rounded-[var(--sf-radius,6px)]',
                aspect,
                stacked && 'md:w-auto md:shrink',
                stacked && i === 0 && items.length % 2 === 1 && 'md:col-span-2',
              )}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
            >
              <ZoomImage m={m} name={name} priority={i === 0} />
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <>
            <div className={cn('pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5', stacked && 'md:hidden')} aria-hidden="true">
              {items.map((m, i) => (
                <span key={m.id} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-[color:var(--sf-primary)]' : 'w-1.5 bg-white/80 shadow')} />
              ))}
            </div>
            <div className={cn('absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-2 md:flex pointer-events-none', stacked && 'md:hidden')}>
              <button
                type="button"
                aria-label="Previous image"
                disabled={index === 0}
                onClick={() => goTo(Math.max(0, index - 1))}
                className={cn('pointer-events-auto rounded-full bg-[color:var(--sf-bg)]/85 p-2 shadow disabled:opacity-0', sfFocusRing)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                disabled={index === items.length - 1}
                onClick={() => goTo(Math.min(items.length - 1, index + 1))}
                className={cn('pointer-events-auto rounded-full bg-[color:var(--sf-bg)]/85 p-2 shadow disabled:opacity-0', sfFocusRing)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
        {layout === 'thumbs-bottom' && thumbs}
      </div>
    </div>
  );
}
