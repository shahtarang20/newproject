import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTemplate } from '../templates/useTemplate';

/** Every template renders its mobile bottom navigation with this landmark label. */
const NAV_SELECTOR = 'nav[aria-label="Quick navigation"]';
/** The bar's opaque background tucks this many px under the nav (which paints on top) so no sub-pixel seam shows page content. */
const NAV_TUCK_PX = 4;
/** Published on <html> while the bar is mounted so floating buttons and the page spacer can clear it. */
const BAR_HEIGHT_VAR = '--sf-sticky-h';

/** Distance from the viewport bottom to the top of the template's bottom nav (0 when absent or hidden). */
function useBottomNavOffset(): number {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const nav = document.querySelector<HTMLElement>(NAV_SELECTOR);
    if (!nav) return;
    const measure = () => {
      const rect = nav.getBoundingClientRect();
      const visible = rect.height > 0 && getComputedStyle(nav).display !== 'none';
      setOffset(visible ? Math.max(0, Math.round(window.innerHeight - rect.top)) : 0);
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(nav);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return offset;
}

/** Mobile-only bar pinned just above the template's bottom nav when the template opts in (`productPage.stickyBuyBar`). */
export function StickyBuyBar({ children }: { children: ReactNode }) {
  const { productPage } = useTemplate();
  const offset = useBottomNavOffset();
  const ref = useRef<HTMLDivElement>(null);
  const enabled = productPage.stickyBuyBar;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(BAR_HEIGHT_VAR, `${el.offsetHeight}px`);
    publish();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.removeProperty(BAR_HEIGHT_VAR);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      ref={ref}
      style={{ bottom: Math.max(0, offset - NAV_TUCK_PX) }}
      className="fixed inset-x-0 z-[39] border-t border-[color:var(--sf-border)] bg-[color:var(--sf-bg)] px-4 pb-[calc(0.75rem+4px)] pt-3 md:hidden"
    >
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

/** Spacer so content isn't hidden behind the sticky bar (desktop: renders nothing). */
export function StickyBuyBarSpacer() {
  const { productPage } = useTemplate();
  return productPage.stickyBuyBar ? <div aria-hidden="true" className="md:hidden" style={{ height: `calc(var(${BAR_HEIGHT_VAR}, 0px) + 0.5rem)` }} /> : null;
}
