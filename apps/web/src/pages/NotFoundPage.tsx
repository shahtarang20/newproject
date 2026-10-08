import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Helmet>
        <title>Page not found · Vastra</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Compass className="h-7 w-7" />
      </span>
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">We can't find that page</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The link may be broken, or the page may have moved.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
