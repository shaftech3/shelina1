import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, param } from '../lib/errors.js';
import { requireAdmin } from '../middleware/authGuards.js';
import { brandInputSchema, categoryInputSchema } from '../validation/schemas.js';
import { serializeBrand, serializeCategory } from '../services/serialize.js';
import { uniqueSlug } from '../services/slug.js';

export const categoriesRouter = Router();
export const brandsRouter = Router();

/* ─────────────────────────── Categories ─────────────────────────── */

categoriesRouter.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const categories = await prisma.category.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      // One aggregate query rather than a count per row — no N+1.
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({ success: true, data: categories.map(serializeCategory) });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.get('/:idOrSlug', async (req, res, next) => {
  try {
    const idOrSlug = param(req.params.idOrSlug, 'identifier');
    const category = await prisma.category.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw ApiError.notFound('Category not found.');
    res.json({ success: true, data: serializeCategory(category) });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = categoryInputSchema.parse(req.body);
    const slug = await uniqueSlug('category', input.slug || input.name);
    const category = await prisma.category.create({
      data: { ...input, slug },
      include: { _count: { select: { products: true } } },
    });
    res.status(201).json({ success: true, data: serializeCategory(category) });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'id');
    const existing = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) throw ApiError.notFound('Category not found.');

    const input = categoryInputSchema.parse(req.body);
    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug('category', input.slug, id)
        : existing.slug;

    const category = await prisma.category.update({
      where: { id },
      data: { ...input, slug },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: serializeCategory(category) });
  } catch (error) {
    next(error);
  }
});

/**
 * Referential safety (§40 / §5): a category still referenced by products
 * cannot be deleted. The schema also enforces this with onDelete: Restrict —
 * this check exists to return a helpful message instead of a raw FK error.
 */
categoriesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'id');
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw ApiError.notFound('Category not found.');

    if (category._count.products > 0) {
      throw ApiError.conflict(
        `This category is used by ${category._count.products} product${
          category._count.products === 1 ? '' : 's'
        }. Reassign them before deleting it.`,
      );
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/* ───────────────────────────── Brands ───────────────────────────── */

brandsRouter.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const brands = await prisma.brand.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({ success: true, data: brands.map(serializeBrand) });
  } catch (error) {
    next(error);
  }
});

brandsRouter.get('/:idOrSlug', async (req, res, next) => {
  try {
    const idOrSlug = param(req.params.idOrSlug, 'identifier');
    const brand = await prisma.brand.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw ApiError.notFound('Brand not found.');
    res.json({ success: true, data: serializeBrand(brand) });
  } catch (error) {
    next(error);
  }
});

brandsRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = brandInputSchema.parse(req.body);
    const slug = await uniqueSlug('brand', input.slug || input.name);
    const brand = await prisma.brand.create({
      data: { ...input, slug },
      include: { _count: { select: { products: true } } },
    });
    res.status(201).json({ success: true, data: serializeBrand(brand) });
  } catch (error) {
    next(error);
  }
});

brandsRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'id');
    const existing = await prisma.brand.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) throw ApiError.notFound('Brand not found.');

    const input = brandInputSchema.parse(req.body);
    const slug =
      input.slug && input.slug !== existing.slug ? await uniqueSlug('brand', input.slug, id) : existing.slug;

    const brand = await prisma.brand.update({
      where: { id },
      data: { ...input, slug },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: serializeBrand(brand) });
  } catch (error) {
    next(error);
  }
});

brandsRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'id');
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw ApiError.notFound('Brand not found.');

    if (brand._count.products > 0) {
      throw ApiError.conflict(
        `This brand is used by ${brand._count.products} product${
          brand._count.products === 1 ? '' : 's'
        }. Reassign them before deleting it.`,
      );
    }

    await prisma.brand.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
