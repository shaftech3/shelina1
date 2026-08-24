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
 * Implements a cinematic, luxury layout featuring:
 * - Full-bleed video/image hero with responsive atmospheric scrims
 * - Distinctive diamond-shaped category carousel with smooth touch snap
 * - Horizontally scrollable curated & new arrivals carousels
 * - Atmospheric brand showcase & editorial storytelling
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
  const featured = useProducts({ featured: true, limit: 8 });
  const newIn = useProducts({ isNew: true, limit: 8 });
  const banners = useBanners();
  const [firstBanner, secondBanner] = banners.data ?? [];
  const brands = useBrands();
  const editorial = useEditorial();
  const trust = useTrustValues();

  const heroSlide = hero.data?.[0];

  return (
    <Layout overHero>
      {/* 1 — Cinematic Hero */}
      {heroSlide ? (
        <Hero slide={heroSlide} slides={hero.data || undefined} />
      ) : (
        <Skeleton className="h-[48vh] min-h-[300px] w-full rounded-none lg:h-[680px]" />
      )}

      {/* 2 — Diamond Categories Carousel */}
      <Section aria-labelledby="categories-heading" className="overflow-hidden border-b border-border/40">
        <Container className="flex flex-col gap-6">
          <Reveal>
            <SectionHeader
              eyebrow="Curated Silhouettes"
              title="Shop by Category"
              description="Explore our hand-finished collections, contoured for comfort."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={17} />}>
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

      {/* 3 — Featured Collections (Horizontal Carousel) */}
      <Section tone="cream" aria-labelledby="featured-heading" className="overflow-hidden">
        <Container className="flex flex-col gap-8">
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
            products={featured.data}
            loading={featured.loading}
            error={featured.error}
            onRetry={featured.retry}
          />
        </Container>
      </Section>

      {/* 4 — Promotional Banner */}
      {firstBanner && <Banner banner={firstBanner} />}

      {/* 5 — New Arrivals (Horizontal Carousel) */}
      <Section aria-labelledby="new-heading" className="overflow-hidden">
        <Container className="flex flex-col gap-8">
          <Reveal>
            <SectionHeader
              align="center"
              eyebrow="Just Landed"
              title="New Arrivals"
              description="Fresh silhouettes and refined leathers released this month."
            />
          </Reveal>
          <ProductCarousel
            products={newIn.data}
            loading={newIn.loading}
            error={newIn.error}
            onRetry={newIn.retry}
            emptyMessage="New bespoke styles are on their way."
          />
          <Reveal className="flex justify-center pt-2">
            <ButtonLink href="/new-arrivals" size="lg" iconRight={<Icon name="arrow-right" size={18} />}>
              Explore Full Collection
            </ButtonLink>
          </Reveal>
        </Container>
      </Section>

      {/* 6 — Second Promotional Banner */}
      {secondBanner && <Banner banner={secondBanner} />}

      {/* 7 — Brand Showcase */}
      <Section aria-labelledby="brands-heading">
        <Container className="flex flex-col gap-10">
          <Reveal>
            <SectionHeader
              eyebrow="Our Signature Lines"
              title="Shelina Brands"
              description="Distinctive ateliers united under our master craftsmanship standard."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={17} />}>
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

      {/* 8 — Full-Bleed Editorial Story */}
      <EditorialFeature feature={editorial.data} loading={editorial.loading} />

      {/* 9 — Trust Values & Heritage */}
      <Section tone="cream" spacing="tight" aria-labelledby="trust-heading">
        <Container className="flex flex-col gap-10">
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

      {/* 10 — VIP Club Newsletter */}
      <Newsletter />
    </Layout>
  );
}
