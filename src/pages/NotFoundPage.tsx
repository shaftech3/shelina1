import { useSeo } from '@/hooks';
import { Layout } from '@/components/layout';
import { ButtonLink, Container, Section } from '@/components/ui';

export function NotFoundPage() {
  useSeo({ title: 'Page not found', description: 'This page could not be found.', path: '/404', noIndex: true });

  return (
    <Layout>
      <Section>
        <Container className="flex flex-col items-center gap-6 py-16 text-center">
          <span className="eyebrow text-primary-deep">Error 404</span>
          <h1 className="text-h1">This page has stepped out</h1>
          <p className="max-w-prose text-body text-ink-muted">
            The page you were looking for doesn’t exist or has moved. Let’s get you back to the collection.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/">Back to home</ButtonLink>
            <ButtonLink href="/shop" variant="outline">
              Browse the collection
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </Layout>
  );
}
