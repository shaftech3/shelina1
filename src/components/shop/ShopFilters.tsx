import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { Button, Checkbox, Divider, Input } from '@/components/ui';
import type { Brand, Category } from '@/types';
import type { UseShopFiltersResult } from '@/hooks/useShopFilters';

interface ShopFiltersProps {
  categories: Category[];
  brands: Brand[];
  bounds: { min: number; max: number };
  controls: UseShopFiltersResult;
  className?: string;
  /** Rendered inside the mobile drawer, which supplies its own actions. */
  compact?: boolean;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-label font-medium text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * The filter panel body. Rendered as a desktop sidebar and, unchanged, inside
 * the mobile drawer — one implementation, two placements.
 */
export function ShopFilters({
  categories,
  brands,
  bounds,
  controls,
  className,
  compact = false,
}: ShopFiltersProps) {
  const { filters, toggleCategory, toggleBrand, setPriceRange, setInStockOnly, clearFilters, isFiltered } =
    controls;

  // Price is typed, so it is held locally and committed on blur / Enter.
  // Writing to the URL on every keystroke would refetch on each digit.
  const [minDraft, setMinDraft] = useState(filters.minPrice?.toString() ?? '');
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice?.toString() ?? '');

  useEffect(() => {
    setMinDraft(filters.minPrice?.toString() ?? '');
    setMaxDraft(filters.maxPrice?.toString() ?? '');
  }, [filters.minPrice, filters.maxPrice]);

  const commitPrice = () => {
    const parse = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
    };
    let min = parse(minDraft);
    let max = parse(maxDraft);
    // A reversed range is almost certainly a typo; swap rather than return zero
    // results with no explanation.
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
    setPriceRange(min, max);
  };

  return (
    <div className={cn('flex flex-col gap-7', className)}>
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-h4 text-ink">Filter</h2>
          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xs text-caption text-primary-deep underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <Group title="Category">
        <div className="flex flex-col gap-2.5">
          {categories.map((category) => (
            <Checkbox
              key={category.id}
              label={category.name}
              checked={filters.categories.includes(category.slug)}
              onChange={() => toggleCategory(category.slug)}
            />
          ))}
        </div>
      </Group>

      <Divider />

      <Group title="Brand">
        <div className="flex flex-col gap-2.5">
          {brands.map((brand) => (
            <Checkbox
              key={brand.id}
              label={brand.name}
              checked={filters.brands.includes(brand.name)}
              onChange={() => toggleBrand(brand.name)}
            />
          ))}
        </div>
      </Group>

      <Divider />

      <Group title="Price">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={String(bounds.min)}
            value={minDraft}
            onChange={(event) => setMinDraft(event.target.value)}
            onBlur={commitPrice}
            onKeyDown={(event) => event.key === 'Enter' && commitPrice()}
            aria-label="Minimum price"
            className="w-full"
          />
          <span aria-hidden className="text-ink-subtle">
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={String(bounds.max)}
            value={maxDraft}
            onChange={(event) => setMaxDraft(event.target.value)}
            onBlur={commitPrice}
            onKeyDown={(event) => event.key === 'Enter' && commitPrice()}
            aria-label="Maximum price"
            className="w-full"
          />
        </div>
        <p className="text-caption text-ink-subtle">
          Catalogue range {formatPrice(bounds.min)} – {formatPrice(bounds.max)}
        </p>
      </Group>

      <Divider />

      <Group title="Availability">
        <Checkbox
          label="In stock only"
          checked={filters.inStockOnly}
          onChange={(event) => setInStockOnly(event.target.checked)}
        />
      </Group>

      {compact && isFiltered && (
        <Button variant="outline" fullWidth onClick={clearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
