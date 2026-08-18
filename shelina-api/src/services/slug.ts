import { prisma } from '../lib/prisma.js';

/** URL-safe slug from arbitrary text. Mirrors the frontend's `slugify`. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

type Entity = 'product' | 'category' | 'brand';

/**
 * Guarantees slug uniqueness per table by appending -2, -3, … when taken.
 * `excludeId` lets an update keep its own slug.
 */
export async function uniqueSlug(entity: Entity, source: string, excludeId?: string): Promise<string> {
  const base = slugify(source) || entity;
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const where = excludeId
      ? { slug: candidate, NOT: { id: excludeId } }
      : { slug: candidate };

    const found =
      entity === 'product'
        ? await prisma.product.findFirst({ where, select: { id: true } })
        : entity === 'category'
          ? await prisma.category.findFirst({ where, select: { id: true } })
          : await prisma.brand.findFirst({ where, select: { id: true } });

    if (!found) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
