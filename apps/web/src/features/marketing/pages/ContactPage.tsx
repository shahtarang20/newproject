import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MessageCircle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form';
import { Seo } from '../components/Seo';
import { Reveal } from '../components/Reveal';

const SUPPORT_EMAIL = 'support@vastra.example';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(20).regex(/^[+\d\s()-]*$/, 'Enter a valid phone number').optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
});
type Values = z.infer<typeof schema>;

export default function ContactPage() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', message: '' } });

  // TODO(contact-endpoint): replace the mailto hand-off with a POST to a backend contact endpoint once it exists.
  const onSubmit = (v: Values) => {
    const body = [v.message, '', `Name: ${v.name}`, `Email: ${v.email}`, v.phone ? `Phone: ${v.phone}` : ''].filter(Boolean).join('\n');
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Vastra enquiry from ${v.name}`)}&body=${encodeURIComponent(body)}`;
  };

  const cards = [
    { icon: Mail, title: 'Email', text: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    { icon: MessageCircle, title: 'Sales and onboarding', text: 'Tell us about your shop and we will help you get started.', href: undefined },
    { icon: Clock, title: 'Response time', text: 'We aim to reply within one working day.', href: undefined },
  ];

  return (
    <>
      <Seo title="Contact" description="Questions about Vastra? Get in touch with our team." path="/contact" />
      <div className="container grid gap-12 py-16 lg:grid-cols-[1fr_1.1fr] lg:py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contact</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Let us help you get your shop online</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">Questions about plans, setup or templates? Send us a note.</p>
          <div className="mt-8 space-y-3">
            {cards.map((c) => {
              const inner = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><c.icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-sm font-semibold">{c.title}</span>
                    <span className="block text-sm text-muted-foreground">{c.text}</span>
                  </span>
                </>
              );
              return c.href ? (
                <a key={c.title} href={c.href} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:bg-secondary/60">{inner}</a>
              ) : (
                <div key={c.title} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft">{inner}</div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField control={form.control} name="name" label="Name" required render={({ field, ...a }) => <Input autoComplete="name" {...field} {...pick(a)} />} />
              <FormField control={form.control} name="email" label="Email" required render={({ field, ...a }) => <Input type="email" autoComplete="email" {...field} {...pick(a)} />} />
            </div>
            <FormField control={form.control} name="phone" label="Phone (optional)" render={({ field, ...a }) => <Input type="tel" autoComplete="tel" {...field} {...pick(a)} />} />
            <FormField control={form.control} name="message" label="Message" required render={({ field, ...a }) => <Textarea rows={5} {...field} {...pick(a)} />} />
            <Button type="submit" size="lg" className="w-full"><ExternalLink className="h-4 w-4" /> Compose email</Button>
            <p className="text-center text-xs text-muted-foreground">Opens your email app with your message prefilled. Nothing is sent until you press send there.</p>
          </form>
        </Reveal>
      </div>
    </>
  );
}

function pick(a: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) {
  return { id: a.id, 'aria-invalid': a['aria-invalid'], 'aria-describedby': a['aria-describedby'] };
}
