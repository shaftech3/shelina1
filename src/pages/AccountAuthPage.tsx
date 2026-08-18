import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSeo } from '@/hooks';
import { useCustomerAccount } from '@/hooks';
import { customerAccountService, ApiValidationError } from '@/services';
import { Layout } from '@/components/layout';
import { Button, Container, Input, Section, useToast } from '@/components/ui';

interface AccountAuthPageProps {
  mode: 'sign-in' | 'register';
}

/**
 * Customer sign-in and registration.
 *
 * Both modes share this component because the forms differ by exactly one
 * field. Passwords are sent over the API and verified against a bcrypt hash on
 * the server — nothing is hashed, stored or compared in the browser, and the
 * session comes back as an HttpOnly cookie this code cannot read.
 *
 * Entirely separate from the admin login at /admin/login.
 */
export function AccountAuthPage({ mode }: AccountAuthPageProps) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  /**
   * Where to go after signing in. Checkout sends `?redirect=/checkout` so a
   * guest who tried to buy something lands back on checkout with their cart
   * intact rather than being dumped on the account page.
   *
   * Only same-site paths are honoured — an absolute URL here would be an open
   * redirect.
   */
  const requested = new URLSearchParams(search).get('redirect');
  const redirectTo = requested && requested.startsWith('/') && !requested.startsWith('//')
    ? requested
    : '/account';
  const { notify } = useToast();
  const { isAuthenticated, initialising } = useCustomerAccount();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const title = isRegister ? 'Create account' : 'Sign in';

  useSeo({
    title,
    description: isRegister
      ? 'Create a Shelina account to save your details for faster checkout.'
      : 'Sign in to your Shelina account.',
    path: pathname,
    noIndex: true,
  });

  // Already signed in? Nothing to do here.
  useEffect(() => {
    if (!initialising && isAuthenticated) navigate(redirectTo, { replace: true });
  }, [initialising, isAuthenticated, navigate, redirectTo]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  /** Client-side checks are for fast feedback only; the server re-validates. */
  const validate = () => {
    const next: Record<string, string> = {};
    if (isRegister && !form.name.trim()) next.name = 'Enter your name.';
    if (!form.email.trim()) next.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Enter your password.';
    else if (isRegister && form.password.length < 8)
      next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      if (isRegister) {
        await customerAccountService.register(form);
        notify({ title: 'Account created', description: 'You are now signed in.', tone: 'success' });
      } else {
        await customerAccountService.signIn({ email: form.email, password: form.password });
        notify({ title: 'Signed in', tone: 'success' });
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // Surface the server's field errors against the right inputs.
      if (error instanceof ApiValidationError) {
        setErrors(error.fields);
      } else {
        notify({
          title: isRegister ? 'Could not create account' : 'Could not sign in',
          description: error instanceof Error ? error.message : 'Please try again.',
          tone: 'error',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Section>
        <Container className="py-10">
          <div className="mx-auto w-full max-w-[440px]">
            <h1 className="text-h2">{title}</h1>
            <p className="mt-2 text-body-sm text-ink-muted">
              {isRegister
                ? 'Save your details so checkout is quicker next time.'
                : 'Welcome back. Sign in to your Shelina account.'}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
              {isRegister && (
                <Input
                  label="Full name"
                  name="name"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  error={errors.name}
                />
              )}

              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                error={errors.email}
              />

              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                value={form.password}
                onChange={(event) => set('password', event.target.value)}
                error={errors.password}
                hint={isRegister ? 'At least 8 characters.' : undefined}
              />

              <Button type="submit" fullWidth loading={submitting} disabled={submitting}>
                {isRegister ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-body-sm text-ink-muted">
              {isRegister ? 'Already have an account? ' : 'New to Shelina? '}
              <Link
                // Carry the redirect across, so switching between sign-in and
                // register does not lose a pending checkout.
                to={`${isRegister ? '/account/sign-in' : '/account/register'}${
                  redirectTo === '/account' ? '' : `?redirect=${encodeURIComponent(redirectTo)}`
                }`}
                className="rounded-xs font-medium text-primary-deep underline underline-offset-4 focus-visible:outline-none focus-visible:shadow-focus"
              >
                {isRegister ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </div>
        </Container>
      </Section>
    </Layout>
  );
}
