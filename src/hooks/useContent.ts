import { useCallback } from 'react';
import { bannerService, brandService, contentService, heroService } from '@/services';
import type { Banner, Brand, EditorialFeature, HeroSlide, TrustValue } from '@/types';
import { useAsync, type AsyncState } from './useAsync';
import { useDataRevision } from './useDataRevision';

/**
 * Content access hooks.
 * Pages consume these instead of importing mock data, keeping the
 * UI → hooks → services → data seam intact.
 */
export function useHeroSlides(): AsyncState<HeroSlide[]> {
  const revision = useDataRevision();
  const task = useCallback(() => heroService.list(), []);
  return useAsync(task, [revision]);
}

export function useBanner(id: string): AsyncState<Banner> {
  const revision = useDataRevision();
  const task = useCallback(() => bannerService.getById(id), [id]);
  return useAsync(task, [id, revision]);
}

/**
 * All active banners, in author order.
 *
 * The homepage fills its two banner slots from this list by position rather
 * than by hardcoded id, so a banner created or disabled in the admin is
 * reflected on the storefront without a code change.
 */
export function useBanners(): AsyncState<Banner[]> {
  const revision = useDataRevision();
  const task = useCallback(() => bannerService.list(), []);
  return useAsync(task, [revision]);
}

export function useBrands(): AsyncState<Brand[]> {
  const revision = useDataRevision();
  const task = useCallback(() => brandService.list(), []);
  return useAsync(task, [revision]);
}

export function useEditorial(): AsyncState<EditorialFeature> {
  const revision = useDataRevision();
  const task = useCallback(() => contentService.getEditorial(), []);
  return useAsync(task, [revision]);
}

export function useTrustValues(): AsyncState<TrustValue[]> {
  const task = useCallback(() => contentService.listTrustValues(), []);
  return useAsync(task, []);
}
