import type { Brand } from '@/types';
import { api, toQuery } from './apiClient';
import { repository } from '@/data/repository';

/** Brands, backed by the Stage 5 API. Same surface as the mock version. */
export type BrandInput = Omit<Brand, 'id'>;

type ApiBrand = Brand & { productCount?: number };

function toPayload(input: BrandInput) {
  return {
    name: input.name.trim(),
    slug: input.slug?.trim() || undefined,
    description: input.description?.trim() || null,
    logo: input.logo?.src || null,
    logoAlt: input.logo?.alt || null,
    seoTitle: input.seo?.title?.trim() || null,
    seoDescription: input.seo?.description?.trim() || null,
  };
}

export const brandService = {
  async list(): Promise<Brand[]> {
    return api.get<ApiBrand[]>('/brands');
  },

  async getBySlug(slug: string): Promise<Brand> {
    return api.get<ApiBrand>(`/brands/${encodeURIComponent(slug)}`);
  },

  async getById(id: string): Promise<Brand> {
    return api.get<ApiBrand>(`/brands/${encodeURIComponent(id)}`);
  },

  async listAll(search?: string): Promise<Brand[]> {
    return api.get<ApiBrand[]>(`/brands${toQuery({ search })}`);
  },

  async create(input: BrandInput): Promise<Brand> {
    const brand = await api.post<ApiBrand>('/brands', toPayload(input));
    repository.invalidate();
    return brand;
  },

  /**
   * Products reference a brand by id in the database, so renaming a brand is
   * now a single row update — the Stage 4 cascading rename is no longer
   * needed, and the relation cannot drift.
   */
  async update(id: string, input: BrandInput): Promise<Brand> {
    const brand = await api.put<ApiBrand>(`/brands/${encodeURIComponent(id)}`, toPayload(input));
    repository.invalidate();
    return brand;
  },

  async productCount(id: string): Promise<number> {
    const brand = await api.get<ApiBrand>(`/brands/${encodeURIComponent(id)}`);
    return brand.productCount ?? 0;
  },

  /** Refused with 409 by the API when products still reference the brand. */
  async remove(id: string): Promise<void> {
    await api.delete<null>(`/brands/${encodeURIComponent(id)}`);
    repository.invalidate();
  },
};
