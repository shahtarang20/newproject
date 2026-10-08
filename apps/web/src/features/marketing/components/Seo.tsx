import { Helmet } from 'react-helmet-async';
import { pageTitle } from '@/utils/seo';

export function Seo({ title, description, path }: { title?: string; description: string; path?: string }) {
  const full = pageTitle(title);
  const url = typeof window !== 'undefined' && path ? new URL(path, window.location.origin).toString() : undefined;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {url && <link rel="canonical" href={url} />}
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
