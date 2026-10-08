import { useParams } from 'react-router-dom';

/** Reads `:shopSlug` from the storefront routes. Throws-free: returns '' when missing. */
export function useShopSlug(): string {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  return shopSlug ?? '';
}
