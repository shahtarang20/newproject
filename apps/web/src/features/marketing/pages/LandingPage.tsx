import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TEMPLATE_IDS } from '@vastra/shared';
import {
  ArrowRight, BarChart3, Boxes, ClipboardList, FileSpreadsheet, Layers, MessageCircle, Package, PackageSearch,
  Share2, ShoppingBag, Store, UserCog, Wallet, BookOpen, Truck, Send, PlusCircle, Rocket, QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Seo } from '../components/Seo';
import { Reveal, SectionHeading } from '../components/Reveal';
import { ProductMockup } from '../components/ProductMockup';
import { TEMPLATE_META, TemplatePreview } from '../components/TemplatePreview';

const STEPS = [
  { icon: PlusCircle, title: 'Add product', text: 'Upload photos, set price, colours, sizes and stock.' },
  { icon: Rocket, title: 'Publish', text: 'Your storefront goes live on its own link, instantly.' },
  { icon: Share2, title: 'Share link', text: 'Send it on WhatsApp or print the QR code for your counter.' },
  { icon: Send, title: 'Customer enquires or orders', text: 'Guests browse, enquire or check out with cash on delivery.' },
  { icon: ClipboardList, title: 'You manage orders', text: 'Confirm, pack, ship and track every order from one dashboard.' },
];

const FEATURES = [
  { icon: BookOpen, title: 'Digital catalogue', text: 'Categories, collections and shareable catalogues that look great on any phone.' },
  { icon: MessageCircle, title: 'WhatsApp sharing and QR codes', text: 'One tap to share products or your whole shop, plus printable QR codes.' },
  { icon: Layers, title: 'Colour, size and stock variants', text: 'Model every colour and size, each with its own stock count.' },
  { icon: Wallet, title: 'Guest checkout with COD', text: 'No sign-up wall for customers. Cash on delivery works out of the box.' },
  { icon: Boxes, title: 'Inventory with history', text: 'Every stock change is recorded, so you always know what moved and why.' },
  { icon: PackageSearch, title: 'Order tracking', text: 'Customers follow their order status with a simple tracking page.' },
  { icon: BarChart3, title: 'Analytics', text: 'See views, enquiries, orders and best-sellers at a glance.' },
  { icon: UserCog, title: 'Staff roles', text: 'Invite your team with permissions that match what they should do.' },
  { icon: FileSpreadsheet, title: 'Bulk CSV import', text: 'Move an existing stock sheet into Vastra without retyping it.' },
  { icon: Package, title: 'Plans that grow with you', text: 'Start free and upgrade only when your shop needs more room.' },
];

const AUDIENCES = [
  { icon: Store, title: 'Saree shops', text: 'Show every drape, weave and colourway with proper variants.' },
  { icon: ShoppingBag, title: 'Boutiques', text: 'Curate collections and share new arrivals the day they land.' },
  { icon: Truck, title: 'Menswear', text: 'Sizes, fits and stock levels that stay accurate as you sell.' },
  { icon: Package, title: 'Kids wear', text: 'Age-wise sizing and festive collections in a tidy catalogue.' },
  { icon: QrCode, title: 'Footwear', text: 'Size-wise stock for every pair, shareable in a single link.' },
];

const PRINCIPLES = [
  { title: 'Built for the shop counter', text: 'Every screen is designed to be used quickly, on a phone, between customers.' },
  { title: 'Your customers, your relationship', text: 'Enquiries land on your WhatsApp. We do not sit between you and your buyers.' },
  { title: 'Honest limits', text: 'Plan limits are shown plainly on the pricing page. No surprises, no fine print.' },
];

const FAQS = [
  ['Do I need technical skills to set up my shop?', 'No. Add a product, publish, and share your link. If you can send a WhatsApp message, you can run a Vastra shop.'],
  ['Do my customers need an account to order?', 'No. Customers can check out as guests and pay with cash on delivery.'],
  ['Can I change my storefront design later?', 'Yes. Pick from seven templates and switch whenever you like. Your products stay exactly as they are.'],
  ['Can I bring my existing stock list?', 'Yes. Use bulk CSV import to load products in one go, if your plan includes it.'],
  ['What does it cost?', 'See the pricing page for current plans. You can start free and upgrade later.'],
  ['Can my staff help manage the shop?', 'Yes. Invite staff and give them roles so they only see what they need.'],
];

export default function LandingPage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <>
      <Seo
        description="Turn your garment or saree shop into a digital catalogue and ordering business in minutes. Storefront, WhatsApp sharing, variants, COD checkout and order management."
        path="/"
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.14),transparent_65%)]" />
        <div className="container grid items-center gap-12 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Built for garment and saree shops
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Turn your garment or saree shop into a{' '}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">digital catalogue and ordering business</span>{' '}
              in minutes
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
              Publish a beautiful storefront, share it on WhatsApp, and take enquiries and orders without building a website.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link to="/register">Start free <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/shop/shree-fashion">See a live demo</Link></Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No technical skills needed. Set up your first product in minutes.</p>
          </Reveal>
          <Reveal delay={0.1}><ProductMockup /></Reveal>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y bg-muted/30">
        <div className="container grid gap-8 py-10 md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <h3 className="text-sm font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container scroll-mt-20 py-24">
        <SectionHeading eyebrow="How it works" title="From first product to first order" description="Five simple steps. No developer, no designer, no waiting." />
        <ol className="mt-14 grid gap-4 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <li className="relative h-full rounded-2xl border bg-card p-5 shadow-soft">
                <span className="text-xs font-semibold text-primary">0{i + 1}</span>
                <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><s.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-muted/30 py-24">
        <div className="container">
          <SectionHeading eyebrow="Features" title="Everything a modern shop counter needs" description="The tools you would otherwise stitch together from chat groups, spreadsheets and notebooks." />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="group h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><f.icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="container scroll-mt-20 py-24">
        <SectionHeading eyebrow="Storefront templates" title="7 premium storefront templates" description="Each one has its own character. Pick the one that feels like your shop and switch any time." />
        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATE_IDS.map((id, i) => (
            <Reveal key={id} delay={(i % 4) * 0.05}>
              <figure className="space-y-3">
                <TemplatePreview id={id} />
                <figcaption>
                  <p className="text-sm font-semibold">{TEMPLATE_META[id].name}</p>
                  <p className="text-xs text-muted-foreground">{TEMPLATE_META[id].tagline}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
          <Reveal delay={0.1}>
            <Link to="/shop/shree-fashion" className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 p-4 text-center text-sm font-medium transition-colors hover:bg-accent">
              See one live <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Audience */}
      <section className="bg-muted/30 py-24">
        <div className="container">
          <SectionHeading eyebrow="Who it is for" title="Made for every kind of clothing shop" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border bg-card p-5 shadow-soft">
                  <a.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold tracking-tight">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container scroll-mt-20 py-24">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="mx-auto mt-10 max-w-2xl">
          {FAQS.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="container pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-violet-600 px-6 py-16 text-center text-primary-foreground sm:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Your shop, online by this evening</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">Create your free account, add your first product, and share your link.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90"><Link to="/register">Start free</Link></Button>
              <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10"><Link to="/shop/shree-fashion">See a live demo</Link></Button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
