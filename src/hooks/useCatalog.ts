import { useCallback, useMemo } from 'react';
import { categoryService, productService, type ProductQuery } from '@/services';
import type { Category, Product } from '@/types';
import { useAsync, type AsyncState } from './useAsync';
import { useDataRevision } from './useDataRevision';

/**
 * Thin catalog access hooks. Components consume these instead of importing
 * services (or mock data) directly, so swapping in a REST backend is a
 * one-file change.
 */
export function useProducts(query: ProductQuery = {}): AsyncState<Product[]> {
  const {
    categoryId,
    categorySlugs,
    brands,
    featured,
    onSale,
    isNew,
    search,
    minPrice,
    maxPrice,
    availability,
    inStockOnly,
    sort,
    limit,
  } = query;

  // Array props would be a new reference on every render and re-fire the
  // request forever, so they are compared by value via a stable string key.
  const brandsKey = brands?.join('|') ?? '';
  const categoriesKey = categorySlugs?.join('|') ?? '';
  const availabilityKey = availability?.join('|') ?? '';

  const resolved = useMemo<ProductQuery>(
    () => ({
      categoryId,
      categorySlugs: categoriesKey ? categoriesKey.split('|') : undefined,
      brands: brandsKey ? brandsKey.split('|') : undefined,
      featured,
      onSale,
      isNew,
      search,
      minPrice,
      maxPrice,
      availability: availabilityKey
        ? (availabilityKey.split('|') as NonNullable<ProductQuery['availability']>)
        : undefined,
      inStockOnly,
      sort,
      limit,
    }),
    [
      categoryId,
      categoriesKey,
      brandsKey,
      featured,
      onSale,
      isNew,
      search,
      minPrice,
      maxPrice,
      availabilityKey,
      inStockOnly,
      sort,
      limit,
    ],
  );

  const revision = useDataRevision();
  const task = useCallback(() => productService.list(resolved), [resolved]);
  return useAsync(task, [resolved, revision]);
}

/** Single product by slug. Powers the product detail page. */
export function useProduct(slug: string | undefined): AsyncState<Product> {
  const revision = useDataRevision();
  const task = useCallback(() => {
    if (!slug) return Promise.reject(new Error('No product specified'));
    return productService.getBySlug(slug);
  }, [slug]);
  return useAsync(task, [slug, revision]);
}

/** Products in the same category, minus the one being viewed. */
export function useRelatedProducts(productId: string | undefined, limit = 4): AsyncState<Product[]> {
  const task = useCallback(() => {
    if (!productId) return Promise.resolve([]);
    return productService.related(productId, limit);
  }, [productId, limit]);
  return useAsync(task, [productId, limit]);
}

export function useCategories(options: { featured?: boolean; limit?: number } = {}): AsyncState<Category[]> {
  const { featured, limit } = options;
  const revision = useDataRevision();
  const task = useCallback(() => categoryService.list({ featured, limit }), [featured, limit]);
  return useAsync(task, [featured, limit, revision]);
}

export const useCatalog = { useProducts, useProduct, useCategories };
