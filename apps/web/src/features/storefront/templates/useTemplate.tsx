import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { ButtonStyle } from '@vastra/shared';
import type { TemplateDefinition } from './types';
import { getCachedTemplate, loadTemplate } from './registry';

const TemplateContext = createContext<TemplateDefinition | null>(null);

export function useTemplate(): TemplateDefinition {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error('useTemplate must be used inside <TemplateProvider>');
  return ctx;
}

const BUTTON_RADIUS: Record<ButtonStyle, string> = { rounded: '10px', pill: '9999px', square: '0px' };

const loadedFonts = new Set<string>();
function ensureFont(href: string) {
  if (!href || loadedFonts.has(href) || typeof document === 'undefined') return;
  loadedFonts.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

interface ProviderProps {
  templateId: unknown;
  primaryColor?: string;
  buttonStyle?: ButtonStyle;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Loads the shop's template lazily, injects its CSS variables on a wrapper element and
 * applies shop-level overrides (primary colour, button radius).
 */
export function TemplateProvider({ templateId, primaryColor, buttonStyle = 'rounded', fallback = null, children }: ProviderProps) {
  const [template, setTemplate] = useState<TemplateDefinition | undefined>(() => getCachedTemplate(templateId));

  useEffect(() => {
    let alive = true;
    loadTemplate(templateId).then((t) => alive && setTemplate(t));
    return () => {
      alive = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (template) ensureFont(template.tokens.fontsHref);
  }, [template]);

  if (!template) return <>{fallback}</>;

  const style = {
    ...template.tokens.vars,
    ...(primaryColor ? { '--sf-primary': primaryColor } : {}),
    '--sf-btn-radius': BUTTON_RADIUS[buttonStyle],
    backgroundColor: 'var(--sf-bg)',
    color: 'var(--sf-fg)',
    fontFamily: 'var(--sf-font-body)',
  } as CSSProperties;

  return (
    <TemplateContext.Provider value={template}>
      <div data-template={template.id} className="min-h-screen antialiased" style={style}>
        {children}
      </div>
    </TemplateContext.Provider>
  );
}
