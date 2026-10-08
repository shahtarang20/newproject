export const SITE_NAME = 'Vastra';

export function pageTitle(title?: string): string {
  return title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Digital catalogue & orders for garment and saree shops`;
}

export function absoluteUrl(path = ''): string {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

/** Build a wa.me link. Phone may contain spaces/+; defaults to India (91) for 10-digit numbers. */
export function whatsappLink(phone: string, text?: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
