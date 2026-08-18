import type { Category } from '@/types';
import { api, toQuery } from './apiClient';
import { repository } from '@/data/repository';

/**
 * Categories, backed by the Stage 5 API. Same exported surface as the mock
 * implementation it replaced.
 */
export type CategoryInput = Omit<Category, 'id'>;

type ApiCategory = Category & { productCount?: number };

function toPayload(input: CategoryInput) {
  return {
    name: input.name.trim(),
    slug: input.slug?.trim() || undefined,
    description: input.description?.trim() || null,
    image: input.image?.src || null,
    imageAlt: input.image?.alt || null,
    group: input.group || null,
    featured: Boolean(input.featured),
    seoTitle: input.seo?.title?.trim() || null,
    seoDescription: input.seo?.description?.trim() || null,
  };
}

export const categoryService = {
  async list(options: { featured?: boolean; limit?: number } = {}): Promise<Category[]> {
    const categories = await api.get<ApiCategory[]>('/categories');
    let results = categories;
    if (options.featured) results = results.filter((category) => category.featured);
    return options.limit ? results.slice(0, options.limit) : results;
  },

  async getBySlug(slug: string): Promise<Category> {
    return api.get<ApiCategory>(`/categories/${encodeURIComponent(slug)}`);
  },

  async getById(id: string): Promise<Category> {
    return api.get<ApiCategory>(`/categories/${encodeURIComponent(id)}`);
  },

  async listAll(search?: string): Promise<Category[]> {
    return api.get<ApiCategory[]>(`/categories${toQuery({ search })}`);
  },

  async create(input: CategoryInput): Promise<Category> {
    const category = await api.post<ApiCategory>('/categories', toPayload(input));
    repository.invalidate();
    return category;
  },

  async update(id: string, input: CategoryInput): Promise<Category> {
    const category = await api.put<ApiCategory>(`/categories/${encodeURIComponent(id)}`, toPayload(input));
    repository.invalidate();
    return category;
  },

  /** Count of products referencing this category; drives the delete guard. */
  async productCount(id: string): Promise<number> {
    const category = await api.get<ApiCategory>(`/categories/${encodeURIComponent(id)}`);
    return category.productCount ?? 0;
  },

  /**
   * REFERENTIAL INTEGRITY (§40) is now enforced by the DATABASE and the API:
   * the schema uses onDelete: Restrict and the endpoint returns 409 with the
   * same "used by N products" message the admin UI already displays.
   */
  async remove(id: string): Promise<void> {
    await api.delete<null>(`/categories/${encodeURIComponent(id)}`);
    repository.invalidate();
  },
};
