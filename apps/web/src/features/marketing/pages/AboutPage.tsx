import { Link } from 'react-router-dom';
import { Heart, Smartphone, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Seo } from '../components/Seo';
import { Reveal, SectionHeading } from '../components/Reveal';

const PRINCIPLES = [
  { icon: Smartphone, title: 'Phone first', text: 'Shop owners and customers both live on their phones. So do we.' },
  { icon: Heart, title: 'Respect the craft', text: 'Garments are visual and personal. Our templates let your products lead.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Each shop is isolated from every other, and your customers belong to you.' },
  { icon: Sparkles, title: 'Simple over clever', text: 'We would rather do a few things well than bury you in settings.' },
];

const OWNER = ['Sign up and name your shop', 'Add products with photos, colours, sizes and stock', 'Publish and share your link or QR code', 'Receive enquiries and orders, then manage them in one place'];
const CUSTOMER = ['Opens your link on any phone', 'Browses categories and picks a size and colour', 'Enquires on WhatsApp or checks out as a guest with COD', 'Tracks the order with a simple status page'];

function Steps({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <ol className="mt-4 space-y-3">
        {items.map((t, i) => (
          <li key={t} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{i + 1}</span>
            <span className="pt-0.5 text-muted-foreground">{t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <Seo title="About" description="Vastra helps local garment and saree shops go digital with a catalogue, storefront and order management." path="/about" />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_70%)]" />
        <div className="container max-w-3xl py-20 text-center sm:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Our mission</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Every local clothing shop deserves a great digital counter</h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Many garment and saree shops still run on photo albums, chat groups and handwritten ledgers. Vastra gives them a catalogue, a storefront and an order desk, ready in minutes and without needing a developer.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="container pb-20">
        <SectionHeading eyebrow="Principles" title="What we hold ourselves to" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05}>
              <div className="h-full rounded-2xl border bg-card p-6 shadow-soft">
                <p.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-20">
        <div className="container">
          <SectionHeading eyebrow="The product" title="How it works for both sides of the counter" />
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
            <Reveal><Steps title="For the shop owner" items={OWNER} /></Reveal>
            <Reveal delay={0.08}><Steps title="For the customer" items={CUSTOMER} /></Reveal>
          </div>
        </div>
      </section>

      <section className="container py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to open your digital counter?</h2>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg"><Link to="/register">Start free</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/contact">Talk to us</Link></Button>
        </div>
      </section>
    </>
  );
}
