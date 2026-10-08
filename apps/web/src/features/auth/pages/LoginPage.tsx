import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormError, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { homePathForRole, useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/utils/errors';
import { pageTitle } from '@/utils/seo';
import { loginSchema, type LoginForm } from '../schemas';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string>();

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      const user = await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      const home = homePathForRole(user.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (e) {
      const msg = getErrorMessage(e, "We couldn't sign you in. Please try again.");
      setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <div>
      <Helmet><title>{pageTitle('Sign in')}</title></Helmet>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to manage your shop.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <FormField control={form.control} name="email" label="Email" render={({ field, ...a }) => (
          <Input {...field} id={a.id} type="email" autoComplete="email" inputMode="email" placeholder="you@shop.com" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
        )} />
        <FormField control={form.control} name="password" label="Password" render={({ field, ...a }) => (
          <div className="relative">
            <Input {...field} id={a.id} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" className="pr-10" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )} />
        <FormError message={formError} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Vastra?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">Create your shop</Link>
      </p>
    </div>
  );
}
