import { Link, Outlet } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Brand } from './Brand';

const POINTS = [
  'A beautiful catalogue link you can share on WhatsApp',
  'Enquiries and orders in one inbox',
  'Stock that updates itself when you sell',
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/25 blur-3xl" />
        <Brand className="relative text-white" />
        <div className="relative max-w-md">
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight">Your shop, online in minutes.</h2>
          <p className="mt-4 text-zinc-400">Built for garment, saree and boutique owners who want to sell more without the tech headache.</p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-zinc-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} Vastra</p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Brand className="lg:hidden" />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
