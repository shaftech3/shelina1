import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useBrands, useCategories, useProducts, useSeo } from '@/hooks';
import { useShopFilters, SORT_OPTIONS } from '@/hooks/useShopFilters';
import { productService, type ProductSort } from '@/services';
import { Layout } from '@/components/layout';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  Button,
  Container,
  Drawer,
  EmptyState,
  Icon,
  Input,
  Section,
  Select,
} from '@/components/ui';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { FilterChip } from '@/components/shop/FilterChip';

/**
 * Page framing for the routes that all render this same listing view.
 * `/category/:slug` is the shop scoped to one category; `/new-arrivals` and
 * `/sale` are the shop with a fixed server-side flag. Keeping them as one
 * component avoids three near-identical pages drifting apart.
 */
type ShopContext = {
  heading: string;
  eyebrow: string;
  intro: string;
  path: string;
  /** Applied on top of the user's filters and not user-clearable. */
  scope: { isNew?: boolean; onSale?: boolean; categorySlug?: string };
};

function useShopContext(): ShopContext {
  const { pathname } = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const categories = useCategories();

  return useMemo(() => {
    if (pathname.startsWith('/new-arrivals')) {
      return {
        heading: 'New arrivals',
        eyebrow: 'Just in',
        intro: 'The most recent additions to the collection, newest first.',
        path: '/new-arrivals',
        scope: { isNew: true },
      };
    }
    if (pathname.startsWith('/sale')) {
      return {
        heading: 'Sale',
        eyebrow: 'Reduced',
        intro: 'Styles currently offered below their usual price.',
        path: '/sale',
        scope: { onSale: true },
      };
    }
    if (slug) {
      const category = categories.data?.find((entry) => entry.slug === slug);
      return {
        heading: category?.name ?? 'Category',
        eyebrow: 'Category',
        intro:
          category?.description ??
          'Every style in this category, with sizes and colours listed per pair.',
        path: `/category/${slug}`,
        scope: { categorySlug: slug },
      };
    }
    return {
      heading: 'Shop all',
      eyebrow: 'The collection',
      intro:
        'Every style currently in the workshop — leather chappals, shoes and sneakers for women and men. Sizes and colours are listed per pair, exactly as stocked.',
      path: '/shop',
      scope: {},
    };
  }, [pathname, slug, categories.data]);
}

export function ShopPage() {
  const context = useShopContext();

  useSeo({
    title: context.heading,
    description: context.intro,
    path: context.path,
  });

  const controls = useShopFilters();
  const { filters, isFiltered, activeCount, setSearch, clearFilters, setSort } = controls;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bounds, setBounds] = useState({ min: 0, max: 0 });

  // Search input is debounced into the URL so typing doesn't refetch per key.
  const [searchDraft, setSearchDraft] = useState(filters.search);
  useEffect(() => setSearchDraft(filters.search), [filters.search]);
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = setTimeout(() => setSearch(searchDraft), 260);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, setSearch]);

  useEffect(() => {
    let active = true;
    productService.priceRange().then((range) => {
      if (active) setBounds(range);
    });
    return () => {
      active = false;
    };
  }, []);

  const categories = useCategories();
  const brands = useBrands();

  // A category route pins its own slug; the sidebar filters narrow within it.
  const scopedCategories = context.scope.categorySlug
    ? [context.scope.categorySlug]
    : filters.categories;

  // Category slugs go to the service as-is; it owns the slug→id mapping.
  const { data: products, loading, error, retry } = useProducts({
    search: filters.search || undefined,
    isNew: context.scope.isNew,
    onSale: context.scope.onSale,
    categorySlugs: scopedCategories.length ? scopedCategories : undefined,
    brands: filters.brands.length ? filters.brands : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    inStockOnly: filters.inStockOnly || undefined,
    sort: filters.sort,
  });

  const count = products?.length ?? 0;

  const activeChips = [
    ...(context.scope.categorySlug ? [] : filters.categories).map((slug) => ({
      key: `cat-${slug}`,
      label: categories.data?.find((category) => category.slug === slug)?.name ?? slug,
      onRemove: () => controls.toggleCategory(slug),
    })),
    ...filters.brands.map((name) => ({
      key: `brand-${name}`,
      label: name,
      onRemove: () => controls.toggleBrand(name),
    })),
    ...(filters.inStockOnly
      ? [{ key: 'stock', label: 'In stock only', onRemove: () => controls.setInStockOnly(false) }]
      : []),
  ];

  const shopSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: context.heading,
      description: context.intro,
      url: `https://shelina1.onrender.com${context.path}`,
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
          name: context.heading,
          item: `https://shelina1.onrender.com${context.path}`,
        },
      ],
    },
  ];

  return (
    <Layout>
      <JsonLd id={`shop-jsonld-${context.path}`} data={shopSchema} />
      {/* Heading and catalogue share one band: two stacked Sections summed
          their vertical padding into a large dead gap, and `cn` is a plain
          joiner (no tailwind-merge), so a `pb-0` override loses to the
          responsive `md:py-16` living inside its own media query. */}
      <Section spacing="tight">
        <Container>
          <div className="mb-10 flex max-w-2xl flex-col gap-3 md:mb-12">
            <span className="eyebrow text-primary-deep">{context.eyebrow}</span>
            <h1 className="font-display text-h1 text-ink">{context.heading}</h1>
            <p className="text-body text-ink-muted">{context.intro}</p>
          </div>
          <div className="grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-12">
            {/* Desktop sidebar. Hidden on mobile, where the drawer takes over. */}
            <aside className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-height)+1.5rem)]">
                <ShopFilters
                  categories={context.scope.categorySlug ? [] : (categories.data ?? [])}
                  brands={brands.data ?? []}
                  bounds={bounds}
                  controls={controls}
                />
              </div>
            </aside>

            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-4">
                <Input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  iconLeft={<Icon name="search" size={18} />}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setFiltersOpen(true)}
                    >
                      Filters{activeCount > 0 ? ` (${activeCount})` : ''}
                    </Button>

                    <p className="text-body-sm text-ink-muted" role="status" aria-live="polite">
                      {loading ? 'Loading…' : `${count} ${count === 1 ? 'product' : 'products'}`}
                    </p>
                  </div>

                  <Select
                    options={SORT_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={filters.sort}
                    onChange={(event) => setSort(event.target.value as ProductSort)}
                    aria-label="Sort products"
                    className="h-11 w-auto min-w-[11rem]"
                  />
                </div>

                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeChips.map((chip) => (
                      <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
                    ))}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xs text-caption text-primary-deep underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Distinguishes "your search matched nothing" from "your filters
                  matched nothing" — different problems, different recoveries. */}
              {!loading && !error && count === 0 ? (
                filters.search ? (
                  <EmptyState
                    icon="search"
                    title="No products found"
                    description={`Nothing matches “${filters.search}”. Try a different term, or browse the full collection.`}
                    action={
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button onClick={() => setSearch('')}>Clear search</Button>
                        {isFiltered && (
                          <Button variant="outline" onClick={clearFilters}>
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    }
                  />
                ) : (
                  <EmptyState
                    title="No products match these filters"
                    description="Try widening the price range or removing a filter."
                    action={<Button onClick={clearFilters}>Clear filters</Button>}
                  />
                )
              ) : (
                <ProductGrid
                  products={products}
                  loading={loading}
                  error={error}
                  onRetry={retry}
                  skeletonCount={8}
                  columns={3}
                  priority
                />
              )}
            </div>
          </div>
        </Container>
      </Section>

      {/* Reuses the Stage 1 Drawer: focus trap, Escape and scroll lock included. */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter"
        side="left"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={clearFilters} disabled={!isFiltered}>
              Reset
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Show {count} {count === 1 ? 'result' : 'results'}
            </Button>
          </div>
        }
      >
        <ShopFilters
          categories={context.scope.categorySlug ? [] : (categories.data ?? [])}
          brands={brands.data ?? []}
          bounds={bounds}
          controls={controls}
          compact
        />
      </Drawer>
    </Layout>
  );
}
