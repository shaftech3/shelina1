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
import { ProductGrid } from '@/components/product/ProductGrid';
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
 * All content is resolved through hooks → services → data. Nothing here
 * imports mock data directly, so a real backend can be connected in a later
 * stage without touching this file.
 *
 * Section rhythm alternates surface/cream backgrounds and layout shapes
 * (showcase grid → product grid → split banner → grid → full-bleed editorial)
 * so the page reads as an editorial sequence rather than repeated rows.
 */
export function HomePage() {
  useSeo({
    title: 'Premium footwear, made in Pakistan',
    description:
      'Discover Shelina — leather chappals, shoes and sneakers for women and men. Hand-finished, contoured for comfort and delivered across Pakistan.',
    path: '/',
  });

  const hero = useHeroSlides();
  const categories = useCategories({ featured: true });
  const featured = useProducts({ featured: true, limit: 4 });
  const newIn = useProducts({ isNew: true, limit: 4 });
  // Banner slots are filled by position from the active banner list rather
  // than by hardcoded id, so banners added or disabled in the admin appear or
  // vanish here without a code change.
  const banners = useBanners();
  const [firstBanner, secondBanner] = banners.data ?? [];
  const brands = useBrands();
  const editorial = useEditorial();
  const trust = useTrustValues();

  const heroSlide = hero.data?.[0];

  return (
    <Layout overHero>
      {/* 1 — Hero */}
      {heroSlide ? (
        <Hero slide={heroSlide} />
      ) : (
        <Skeleton className="h-[44vh] min-h-[264px] w-full rounded-none lg:h-[620px]" />
      )}

      {/* 2 — Featured categories (editorial showcase grid) */}
      <Section aria-labelledby="categories-heading">
        <Container className="flex flex-col gap-10">
          <Reveal>
            <SectionHeader
              eyebrow="Browse"
              title="Shop by category"
              description="From everyday chappals to occasion heels — find the pair that fits how you live."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={17} />}>
                  All categories
                </ButtonLink>
              }
            />
          </Reveal>
          <CategoryShowcase
            categories={categories.data}
            loading={categories.loading}
            error={categories.error}
            onRetry={categories.retry}
          />
        </Container>
      </Section>

      {/* 3 — Featured products */}
      <Section tone="cream" aria-labelledby="featured-heading">
        <Container className="flex flex-col gap-10">
          <Reveal>
            <SectionHeader
              eyebrow="Curated"
              title="Featured this season"
              description="The pairs our customers keep coming back for."
              action={
                <ButtonLink href="/shop" variant="outline">
                  Shop all
                </ButtonLink>
              }
            />
          </Reveal>
          <ProductGrid
            products={featured.data}
            loading={featured.loading}
            error={featured.error}
            onRetry={featured.retry}
          />
        </Container>
      </Section>

      {/* 4 — Promotional banner (media right) */}
      {firstBanner && <Banner banner={firstBanner} />}

      {/* 5 — New arrivals: centred header + cream cards on white for contrast
              with the featured row above. */}
      <Section aria-labelledby="new-heading">
        <Container className="flex flex-col gap-10">
          <Reveal>
            <SectionHeader
              align="center"
              eyebrow="Just landed"
              title="New arrivals"
              description="Fresh silhouettes added to the atelier line this month."
            />
          </Reveal>
          <ProductGrid
            products={newIn.data}
            loading={newIn.loading}
            error={newIn.error}
            onRetry={newIn.retry}
            emptyMessage="New styles are on their way."
          />
          <Reveal className="flex justify-center">
            <ButtonLink href="/new-arrivals" size="lg" iconRight={<Icon name="arrow-right" size={18} />}>
              View the collection
            </ButtonLink>
          </Reveal>
        </Container>
      </Section>

      {/* 6 — Second promotional section (media left — different composition) */}
      {secondBanner && <Banner banner={secondBanner} />}

      {/* 7 — Brand showcase */}
      <Section aria-labelledby="brands-heading">
        <Container className="flex flex-col gap-10">
          <Reveal>
            <SectionHeader
              eyebrow="Our lines"
              title="Shelina brands"
              description="Four lines, one workshop — each with its own character."
              action={
                <ButtonLink href="/shop" variant="ghost" iconRight={<Icon name="arrow-right" size={17} />}>
                  All brands
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

      {/* 8 — Full-bleed editorial */}
      <EditorialFeature feature={editorial.data} loading={editorial.loading} />

      {/* 9 — Trust values */}
      <Section tone="cream" spacing="tight" aria-labelledby="trust-heading">
        <Container className="flex flex-col gap-10">
          <Reveal>
            <SectionHeader
              align="center"
              eyebrow="Why Shelina"
              title="Made to be worn, not just bought"
              as="h2"
            />
          </Reveal>
          <TrustSection values={trust.data} loading={trust.loading} />
        </Container>
      </Section>

      {/* 10 — Newsletter */}
      <Newsletter />
    </Layout>
  );
}
