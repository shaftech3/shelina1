import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAccount, useSeo } from '@/hooks';
import { Layout } from '@/components/layout';
import { Button, ButtonLink, Card, Container, Icon, Section, Spinner, useToast } from '@/components/ui';

/**
 * Customer account overview.
 *
 * Deliberately minimal: profile details and sign out. Order history, saved
 * addresses and wishlists are Stage 6+ and are not stubbed here — an empty
 * "Your orders" panel would imply orders exist.
 */
export function AccountPage() {
  const navigate = useNavigate();
  const { customer, isAuthenticated, initialising, signOut } = useCustomerAccount();
  const { notify } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  useSeo({
    title: 'My account',
    description: 'Your Shelina account details.',
    path: '/account',
    noIndex: true,
  });

  // Client-side redirect for UX. The account holds no sensitive server data in
  // this stage; anything that does is protected by the API's own guards.
  useEffect(() => {
    if (!initialising && !isAuthenticated) navigate('/account/sign-in', { replace: true });
  }, [initialising, isAuthenticated, navigate]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      notify({ title: 'Signed out', description: 'Your bag has been kept.', tone: 'success' });
      navigate('/');
    } catch {
      notify({ title: 'Could not sign out', description: 'Please try again.', tone: 'error' });
    } finally {
      setSigningOut(false);
    }
  };

  if (initialising) {
    return (
      <Layout>
        <Section>
          <Container className="flex justify-center py-20">
            <Spinner />
          </Container>
        </Section>
      </Layout>
    );
  }

  if (!customer) return null;

  return (
    <Layout>
      <Section>
        <Container className="py-10">
          <div className="mx-auto w-full max-w-[560px]">
            <h1 className="text-h2">My account</h1>
            <p className="mt-2 text-body-sm text-ink-muted">Your Shelina profile details.</p>

            <Card className="mt-7 p-6">
              <dl className="flex flex-col gap-5">
                <div>
                  <dt className="text-caption uppercase tracking-[0.08em] text-ink-subtle">Name</dt>
                  <dd className="mt-1 text-body text-ink">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-caption uppercase tracking-[0.08em] text-ink-subtle">Email</dt>
                  <dd className="mt-1 break-words text-body text-ink">{customer.email}</dd>
                </div>
              </dl>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/account/orders" iconLeft={<Icon name="receipt" size={18} />}>
                My orders
              </ButtonLink>
              <Button
                variant="outline"
                onClick={() => void handleSignOut()}
                loading={signingOut}
                disabled={signingOut}
                iconLeft={<Icon name="logout" size={18} />}
              >
                Log out
              </Button>
            </div>

            <p className="mt-8 text-caption text-ink-subtle">
              Saved addresses arrive in a later stage.
            </p>
          </div>
        </Container>
      </Section>
    </Layout>
  );
}
