import { useCallback } from 'react';
import { useAsync, useDataRevision, type AsyncState } from '@/hooks';
import {
  brandService,
  categoryService,
  homepageService,
  productService,
  seoService,
  type AdminProductQuery,
  type HomepageContent,
} from '@/services';
import type { Brand, Category, Product, SeoSettings } from '@/types';

/**
 * Admin data hooks.
 *
 * Each wires the shared repository revision into its dependency list, so any
 * write — from this screen or another — refreshes the view without a reload.
 * They mirror the storefront hooks but read the ADMIN endpoints, which include
 * draft and archived rows the storefront must never show.
 */

export function useAdminProducts(query: AdminProductQuery = {}): AsyncState<Product[]> {
  const { search, categoryId, brand, status } = query;
  const revision = useDataRevision();

  const task = useCallback(
    () => productService.listAll({ search, categoryId, brand, status }),
    [search, categoryId, brand, status],
  );
  return useAsync(task, [search, categoryId, brand, status, revision]);
}

/** A single product for the edit form. `undefined` id resolves to null data. */
export function useAdminProduct(id: string | undefined): AsyncState<Product> {
  const revision = useDataRevision();
  const task = useCallback(() => {
    if (!id) return Promise.reject(new Error('No product specified'));
    return productService.getById(id);
  }, [id]);
  return useAsync(task, [id, revision]);
}

export function useAdminCategories(search?: string): AsyncState<Category[]> {
  const revision = useDataRevision();
  const task = useCallback(() => categoryService.listAll(search), [search]);
  return useAsync(task, [search, revision]);
}

export function useAdminBrands(search?: string): AsyncState<Brand[]> {
  const revision = useDataRevision();
  const task = useCallback(() => brandService.listAll(search), [search]);
  return useAsync(task, [search, revision]);
}

export function useAdminHomepage(): AsyncState<HomepageContent> {
  const revision = useDataRevision();
  const task = useCallback(() => homepageService.get(), []);
  return useAsync(task, [revision]);
}

export function useAdminSeo(): AsyncState<SeoSettings> {
  const revision = useDataRevision();
  const task = useCallback(() => seoService.get(), []);
  return useAsync(task, [revision]);
}

export interface AdminStats {
  products: number;
  activeProducts: number;
  draftProducts: number;
  featured: number;
  onSale: number;
  categories: number;
  brands: number;
}

/** Dashboard counts. Real totals only — no invented analytics. */
export function useAdminStats(): AsyncState<AdminStats> {
  const revision = useDataRevision();

  const task = useCallback(async (): Promise<AdminStats> => {
    const [productStats, categories, brands] = await Promise.all([
      productService.stats(),
      categoryService.listAll(),
      brandService.listAll(),
    ]);
    return {
      products: productStats.total,
      activeProducts: productStats.active,
      draftProducts: productStats.draft,
      featured: productStats.featured,
      onSale: productStats.onSale,
      categories: categories.length,
      brands: brands.length,
    };
  }, []);

  return useAsync(task, [revision]);
}
