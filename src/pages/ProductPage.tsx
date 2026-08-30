import { useParams } from 'react-router-dom';
import { useProduct, useRelatedProducts, useSeo } from '@/hooks';
import { Layout } from '@/components/layout';
import {
  Breadcrumb,
  ButtonLink,
  Container,
  Divider,
  Reveal,
  Section,
  SectionHeader,
  Skeleton,
} from '@/components/ui';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductPurchasePanel } from '@/components/product/ProductPurchasePanel';
import { JsonLd } from '@/components/seo/JsonLd';
import { STORE_CONFIG } from '@/lib/constants';
import { effectivePrice } from '@/lib/format';

/** Skeleton mirroring the real two-column layout to avoid a jarring swap. */
function ProductSkeleton() {
  return (
    <div className="grid w-full min-w-0 max-w-full gap-10 lg:grid-cols-2 lg:gap-14 overflow-hidden" aria-busy="true" aria-live="polite">
      <Skeleton className="aspect-[4/5] max-h-[75vh] w-full rounded-lg" />
      <div className="flex w-full min-w-0 max-w-full flex-col gap-5 pt-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-full max-w-xs" />
        <Skeleton className="h-11 w-full max-w-xs" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, loading, error } = useProduct(slug);
  const related = useRelatedProducts(product?.id, 4);

  useSeo({
    title: product ? product.name : loading ? 'Loading product' : 'Product not found',
    description:
      product?.shortDescription ?? `Browse footwear from ${STORE_CONFIG.name}.`,
    path: `/product/${slug ?? ''}`,
    noIndex: !product,
  });

  // A missing product is an expected outcome, not a crash: the service throws
  // a 404 ServiceError and we render a real recovery state.
  if (!loading && (error || !product)) {
    return (
      <Layout>
        <Section>
          <Container className="flex flex-col items-center gap-6 py-16 text-center">
            <span className="eyebrow text-primary-deep">Not available</span>
            <h1 className="text-h1">Product not found</h1>
            <p className="max-w-prose text-body text-ink-muted">
              This style may have sold out or been retired. Everything currently in stock is on the
              shop page.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/shop">Back to shop</ButtonLink>
              <ButtonLink href="/" variant="outline">
                Back to home
              </ButtonLink>
            </div>
          </Container>
        </Section>
      </Layout>
    );
  }

  const payable = product ? effectivePrice(product.price, product.salePrice) : 0;
  const inStock = product ? product.stockStatus !== 'out-of-stock' : false;

  const productSchema = product
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          image: product.images.map((img) => img.src),
          description: product.shortDescription || product.description || product.name,
          sku: product.sku || product.id,
          brand: {
            '@type': 'Brand',
            name: product.brand || STORE_CONFIG.name,
          },
          offers: {
            '@type': 'Offer',
            url: `https://shelina1.onrender.com/product/${product.slug}`,
            priceCurrency: 'PKR',
            price: payable,
            itemCondition: 'https://schema.org/NewCondition',
            availability: inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'Shelina',
            },
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://shelina1.onrender.com/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Shop',
              item: 'https://shelina1.onrender.com/shop',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: product.name,
              item: `https://shelina1.onrender.com/product/${product.slug}`,
            },
          ],
        },
      ]
    : null;

  return (
    <Layout>
      {productSchema && <JsonLd id={`product-jsonld-${product?.id}`} data={productSchema} />}
      <Section spacing="tight" className="w-full max-w-full overflow-hidden">
        <Container className="w-full min-w-0 max-w-full overflow-hidden">
          {loading || !product ? (
            <ProductSkeleton />
          ) : (
            <div className="w-full min-w-0 max-w-full overflow-hidden">
              <Breadcrumb
                className="mb-6 w-full min-w-0 max-w-full overflow-hidden"
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Shop', href: '/shop' },
                  { label: product.name },
                ]}
              />

              {/* Mobile order is media → info, which the source order already
                  gives us; lg splits it into two columns. min-w-0 prevents grid blowout. */}
              <div className="grid w-full min-w-0 max-w-full gap-8 lg:grid-cols-2 lg:gap-14">
                <div className="w-full min-w-0 max-w-full motion-safe:animate-fade-in overflow-hidden">
                  <ProductGallery
                    images={product.images}
                    video={product.video}
                    productName={product.name}
                  />
                </div>

                <div className="w-full min-w-0 max-w-full overflow-hidden">
                  <ProductPurchasePanel product={product} className="lg:pt-2" />
                </div>
              </div>

              {product.description && (
                <div className="mt-14 w-full min-w-0 max-w-3xl overflow-hidden lg:mt-20">
                  <Divider className="mb-10" />
                  <h2 className="mb-4 font-display text-h3 text-ink">Details</h2>
                  <p className="whitespace-pre-line text-body leading-relaxed text-ink-muted break-words">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </Container>
      </Section>

      {product && (related.data?.length ?? 0) > 0 && (
        <Section tone="cream" className="w-full max-w-full overflow-hidden">
          <Container className="w-full min-w-0 max-w-full overflow-hidden">
            <Reveal>
              <SectionHeader
                eyebrow="You may also like"
                title="More from this category"
                className="mb-9"
              />
            </Reveal>
            <ProductGrid products={related.data} loading={related.loading} columns={4} />
          </Container>
        </Section>
      )}
    </Layout>
  );
}
