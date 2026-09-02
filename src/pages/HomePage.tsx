import { Hero, Banner, BrandShowcase, EditorialFeature, TrustSection, Newsletter } from '@/components/marketing';
import {
  useBanners,
  useBrands,
  useCategories,
  useEditorial,
  useHeroSlides,
  useProducts,
  useSeo,
  useTrustValues,
} from '@/hooks';
import { Layout } from '@/components/layout';
import { CategoryShowcase } from '@/components/category/CategoryShowcase';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { ProductGrid } from '@/components/product/ProductGrid';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  ButtonLink,
  Container,
  Icon,
  Reveal,
  Section,
  SectionHeader,
  Skeleton,
} from '@/components/ui';

/**
 * Shelina storefront homepage.
 *
 * Implements a refined, high-engagement fashion-store flow:
 * 1. Hero — cinematic visual welcome
 * 2. Categories — compact, clean square navigation showcase
 * 3. Featured Collection — horizontal scrolling product carousel
 * 4. New Arrivals — curated 4-product grid (2x2 on mobile, 4-col on desktop)
 * 5. Best Sellers — horizontal scrolling product carousel
 * 6. Trending Styles — curated 4-product grid (2x2 on mobile, 4-col on desktop)
 * 7. Handcrafted Essentials — horizontal scrolling product carousel
 * 8. Brand Showcase & Editorial Story
 * 9. Trust Values & VIP Newsletter
 */
export function HomePage() {
  useSeo({
    title: 'Premium Handcrafted Footwear — Shelina Atelier',
    description:
      'Discover Shelina — luxury leather chappals, bespoke shoes, and sneakers for women and men. Hand-finished and contoured for supreme comfort.',
    path: '/',
  });

  const hero = useHeroSlides();
  const categories = useCategories({ featured: true });

  // Product data streams for rhythmic alternating homepage sections
  const featured = useProducts({ featured: true, limit: 10 });
  const newIn = useProducts({ isNew: true, limit: 8 });
  const bestSellers = useProducts({ sort: 'newest', limit: 10 });
  const onSale = useProducts({ onSale: true, limit: 8 });
  const allProducts = useProducts({ limit: 16 });

  const banners = useBanners();
  const [firstBanner, secondBanner] = banners.data ?? [];
  const brands = useBrands();
  const editorial = useEditorial();
  const trust = useTrustValues();

  const heroSlide = hero.data?.[0];

  // Resolve exactly 4 curated products for grid sections
  const newArrivals4 = (newIn.data && newIn.data.length >= 4)
    ? newIn.data.slice(0, 4)
    : (allProducts.data ? allProducts.data.slice(0, 4) : null);

  const trending4 = (onSale.data && onSale.data.length >= 4)
    ? onSale.data.slice(0, 4)
    : (allProducts.data && allProducts.data.length >= 8
        ? allProducts.data.slice(4, 8)
        : (allProducts.data ? allProducts.data.slice(0, 4) : null));

  const homepageSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Shelina',
      url: 'https://shelina1.onrender.com',
      logo: 'https://shelina1.onrender.com/images/brand/shelina-logo.jpeg',
      description: 'Handcrafted leather footwear atelier specializing in premium chappals, bespoke shoes, and sneakers in Pakistan.',
      email: 'shelinaoffical@gmail.com',
      telephone: '+92-324-7741080',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'PK',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Shelina',
      url: 'https://shelina1.onrender.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://shelina1.onrender.com/shop?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <Layout overHero>
      <JsonLd id="homepage-jsonld" data={homepageSchema} />

      {/* 1 — Cinematic Hero */}
      {heroSlide ? (
        <Hero slide={heroSlide} slides={hero.data || undefined} />
      ) : (
        <Skeleton className="h-[48vh] min-h-[300px] w-full rounded-none lg:h-[680px]" />
      )}

      {/* 2 — Compact Square Categories Showcase */}
      <Section spacing="tight" aria-labelledby="categories-heading" className="overflow-hidden border-b border-border/40 py-5 sm:py-7">
        <Container className="flex flex-col gap-4 sm:gap-5">
          <Reveal>
            <SectionHeader
              eyebrow="Curated Silhouettes"
              title="Shop by Category"
              description="Explore our hand-finished collections, contoured for comfort."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={16} />}>
                  All Collections
                </ButtonLink>
              }
            />
          </Reveal>
          <CategoryShowcase
            categories={categories.data}
            loading={categories.loading}
            error={categories.error}
            onRetry={categories.retry}
            priority
          />
        </Container>
      </Section>

      {/* 3 — Scrolling Section: Featured Collection */}
      <Section tone="cream" spacing="tight" aria-labelledby="featured-heading" className="overflow-hidden py-6 sm:py-8 md:py-10">
        <Container className="flex flex-col gap-5 sm:gap-6">
          <Reveal>
            <SectionHeader
              eyebrow="Season's Choice"
              title="Featured Footwear"
              description="Iconic pairs and timeless craftsmanship, favored by our atelier."
              action={
                <ButtonLink href="/shop" variant="outline">
                  View All
                </ButtonLink>
              }
            />
          </Reveal>
          <ProductCarousel
            products={featured.data && featured.data.length > 0 ? featured.data : allProducts.data}
            loading={featured.loading || allProducts.loading}
            error={featured.error}
            onRetry={featured.retry}
          />
        </Container>
      </Section>

      {/* 4 — 4-Product Grid: New Arrivals (2x2 on Mobile, 4-Col Desktop) */}
      <Section spacing="tight" aria-labelledby="new-arrivals-heading" className="py-6 sm:py-8 md:py-10">
        <Container className="flex flex-col gap-5 sm:gap-6">
          <Reveal>
            <SectionHeader
              eyebrow="Just Landed"
              title="New Arrivals"
              description="Fresh silhouettes and refined leathers released this season."
              action={
                <ButtonLink href="/new-arrivals" variant="ghost" iconRight={<Icon name="arrow-right" size={16} />}>
                  Explore All
                </ButtonLink>
              }
            />
          </Reveal>
          <ProductGrid
            products={newArrivals4}
            loading={newIn.loading || allProducts.loading}
            error={newIn.error}
            onRetry={newIn.retry}
            columns={4}
            skeletonCount={4}
          />
        </Container>
      </Section>

      {/* Promotional Banner (if available) */}
      {firstBanner && <Banner banner={firstBanner} />}

      {/* 5 — Scrolling Section: Best Sellers */}
      <Section tone="cream" spacing="tight" aria-labelledby="bestsellers-heading" className="overflow-hidden py-6 sm:py-8 md:py-10">
        <Container className="flex flex-col gap-5 sm:gap-6">
          <Reveal>
            <SectionHeader
              eyebrow="Most Coveted"
              title="Best Sellers"
              description="Customer favorites celebrated for enduring quality and daylong comfort."
              action={
                <ButtonLink href="/shop?sort=bestselling" variant="outline">
                  Shop Best Sellers
                </ButtonLink>
              }
            />
          </Reveal>
          <ProductCarousel
            products={bestSellers.data && bestSellers.data.length > 0 ? bestSellers.data : allProducts.data}
            loading={bestSellers.loading || allProducts.loading}
            error={bestSellers.error}
            onRetry={bestSellers.retry}
            emptyMessage="Celebrated styles will appear here soon."
          />
        </Container>
      </Section>

      {/* 6 — 4-Product Grid: Trending Styles (2x2 on Mobile, 4-Col Desktop) */}
      <Section spacing="tight" aria-labelledby="trending-heading" className="py-6 sm:py-8 md:py-10">
        <Container className="flex flex-col gap-5 sm:gap-6">
          <Reveal>
            <SectionHeader
              eyebrow="Curated Styles"
              title="Trending Silhouettes"
              description="Hand-selected statements designed to elevate everyday elegance."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={16} />}>
                  View Curated
                </ButtonLink>
              }
            />
          </Reveal>
          <ProductGrid
            products={trending4}
            loading={onSale.loading || allProducts.loading}
            error={onSale.error}
            onRetry={onSale.retry}
            columns={4}
            skeletonCount={4}
          />
        </Container>
      </Section>

      {/* Second Promotional Banner (if available) */}
      {secondBanner && <Banner banner={secondBanner} />}

      {/* 7 — Scrolling Section: Handcrafted Essentials */}
      <Section tone="cream" spacing="tight" aria-labelledby="essentials-heading" className="overflow-hidden py-6 sm:py-8 md:py-10">
        <Container className="flex flex-col gap-5 sm:gap-6">
          <Reveal>
            <SectionHeader
              eyebrow="Atelier Standards"
              title="Handcrafted Essentials"
              description="Signature Peshawari, Khussas, and bespoke loafers built to endure."
              action={
                <ButtonLink href="/shop" variant="outline">
                  All Footwear
                </ButtonLink>
              }
            />
          </Reveal>
          <ProductCarousel
            products={allProducts.data && allProducts.data.length > 0 ? allProducts.data : featured.data}
            loading={allProducts.loading}
            error={allProducts.error}
            onRetry={allProducts.retry}
          />
        </Container>
      </Section>

      {/* 8 — Signature Brand Lines */}
      <Section spacing="tight" aria-labelledby="brands-heading" className="py-7 sm:py-9">
        <Container className="flex flex-col gap-6 sm:gap-8">
          <Reveal>
            <SectionHeader
              eyebrow="Our Signature Lines"
              title="Shelina Brands"
              description="Distinctive ateliers united under our master craftsmanship standard."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={16} />}>
                  Explore Brands
                </ButtonLink>
              }
            />
          </Reveal>
          <BrandShowcase
            brands={brands.data}
            loading={brands.loading}
            error={brands.error}
            onRetry={brands.retry}
          />
        </Container>
      </Section>

      {/* 9 — Full-Bleed Editorial Story */}
      <EditorialFeature feature={editorial.data} loading={editorial.loading} />

      {/* 10 — Trust Values & Heritage */}
      <Section tone="cream" spacing="tight" aria-labelledby="trust-heading" className="py-7 sm:py-9">
        <Container className="flex flex-col gap-6 sm:gap-8">
          <Reveal>
            <SectionHeader
              align="center"
              eyebrow="The Shelina Promise"
              title="Handcrafted to be Treasured"
              as="h2"
            />
          </Reveal>
          <TrustSection values={trust.data} loading={trust.loading} />
        </Container>
      </Section>

      {/* 11 — VIP Club Newsletter */}
      <Newsletter />
    </Layout>
  );
}
