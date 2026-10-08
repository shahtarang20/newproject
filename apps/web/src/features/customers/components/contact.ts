/** wa.me needs digits only incl. country code; assume India for bare 10-digit numbers. */
export function waLink(phone: string, text?: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
