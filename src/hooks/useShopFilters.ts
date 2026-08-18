import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductSort } from '@/services';

/**
 * Shop filter state, stored in the URL rather than component state.
 *
 * Putting it in the query string is what makes refresh, back/forward and
 * link-sharing work without any extra bookkeeping. Defaults are never written
 * to the URL, so a clean `/shop` stays clean.
 */

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A–Z' },
];

const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

export interface ShopFilters {
  search: string;
  categories: string[];
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  sort: ProductSort;
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export interface UseShopFiltersResult {
  filters: ShopFilters;
  /** True when anything differs from the default view. */
  isFiltered: boolean;
  /** Count of active filter groups, for the mobile "Filters (2)" label. */
  activeCount: number;
  setSearch: (value: string) => void;
  toggleCategory: (slug: string) => void;
  toggleBrand: (name: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setInStockOnly: (value: boolean) => void;
  setSort: (value: ProductSort) => void;
  clearFilters: () => void;
}

export function useShopFilters(): UseShopFiltersResult {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<ShopFilters>(() => {
    const sortParam = params.get('sort');
    return {
      search: params.get('q') ?? '',
      categories: parseList(params.get('category')),
      brands: parseList(params.get('brand')),
      minPrice: parseNumber(params.get('min')),
      maxPrice: parseNumber(params.get('max')),
      inStockOnly: params.get('stock') === 'in',
      sort: sortParam && VALID_SORTS.has(sortParam) ? (sortParam as ProductSort) : 'featured',
    };
  }, [params]);

  /** Applies a patch, dropping empty values so defaults never hit the URL. */
  const patch = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const toggleIn = useCallback(
    (key: string, list: string[], value: string) => {
      const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
      patch({ [key]: next.length ? next.join(',') : null });
    },
    [patch],
  );

  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.categories.length ? 1 : 0) +
    (filters.brands.length ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0);

  return {
    filters,
    isFiltered: activeCount > 0,
    activeCount,
    setSearch: useCallback((value: string) => patch({ q: value.trim() ? value : null }), [patch]),
    toggleCategory: useCallback(
      (slug: string) => toggleIn('category', filters.categories, slug),
      [toggleIn, filters.categories],
    ),
    toggleBrand: useCallback(
      (name: string) => toggleIn('brand', filters.brands, name),
      [toggleIn, filters.brands],
    ),
    setPriceRange: useCallback(
      (min?: number, max?: number) =>
        patch({
          min: min === undefined ? null : String(min),
          max: max === undefined ? null : String(max),
        }),
      [patch],
    ),
    setInStockOnly: useCallback((value: boolean) => patch({ stock: value ? 'in' : null }), [patch]),
    setSort: useCallback(
      (value: ProductSort) => patch({ sort: value === 'featured' ? null : value }),
      [patch],
    ),
    clearFilters: useCallback(() => {
      // Preserve sort — clearing filters shouldn't reorder the grid underfoot.
      setParams(
        (current) => {
          const next = new URLSearchParams();
          const sort = current.get('sort');
          if (sort) next.set('sort', sort);
          return next;
        },
        { replace: true },
      );
    }, [setParams]),
  };
}
