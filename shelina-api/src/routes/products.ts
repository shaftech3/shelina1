import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, param } from '../lib/errors.js';
import { requireAdmin } from '../middleware/authGuards.js';
import { productInputSchema, productUpdateSchema } from '../validation/schemas.js';
import { serializeProduct } from '../services/serialize.js';
import { uniqueSlug } from '../services/slug.js';

export const productsRouter = Router();

/**
 * `include` is fixed and shallow: category/brand names plus ordered media in a
 * single query. Prisma resolves the relations with a join-style batch, so a
 * list of N products does not become N+1 round trips.
 */
const PRODUCT_INCLUDE = {
  brand: { select: { name: true } },
  media: true,
} as const;

const asArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.length) return value.split(',');
  return [];
};

/* ─────────────────────────── Public read ─────────────────────────── */

/**
 * GET /api/products
 *
 * Supports the storefront's existing query behaviour: search, category (id or
 * slug), brand, price range, availability and sorting. Admin callers may also
 * pass `status` / `all=true` to see drafts; anonymous callers only ever get
 * active products.
 */
productsRouter.get('/', async (req, res, next) => {
  try {
    const {
      search,
      categoryId,
      categorySlug,
      brand,
      brandId,
      minPrice,
      maxPrice,
      featured,
      onSale,
      isNew,
      sort,
      limit,
      status,
      all,
    } = req.query as Record<string, string | undefined>;

    // Draft/archived products are admin-only. Requesting them requires a valid
    // admin session — this is enforced here, not in the browser.
    const wantsAll = all === 'true' || Boolean(status);
    let includeNonActive = false;
    if (wantsAll) {
      const { readSession } = await import('../lib/auth.js');
      includeNonActive = Boolean(readSession(req, 'admin'));
    }

    const where: Record<string, unknown> = {};
    if (!includeNonActive) where.status = 'active';
    else if (status) where.status = status;

    if (categoryId) where.categoryId = categoryId;
    if (categorySlug) where.category = { slug: { in: asArray(categorySlug) } };
    if (brandId) where.brandId = brandId;
    if (brand) where.brand = { name: { in: asArray(brand) } };
    if (featured === 'true') where.featured = true;
    if (onSale === 'true') where.onSale = true;
    if (isNew === 'true') where.newArrival = true;

    if (minPrice || maxPrice) {
      const price: Record<string, number> = {};
      if (minPrice) price.gte = Number(minPrice);
      if (maxPrice) price.lte = Number(maxPrice);
      where.price = price;
    }

    if (search) {
      const term = search.trim();
      if (term) {
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { shortDescription: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { brand: { name: { contains: term, mode: 'insensitive' } } },
          { category: { name: { contains: term, mode: 'insensitive' } } },
        ];
      }
    }

    const orderBy =
      sort === 'price-low'
        ? [{ price: 'asc' as const }]
        : sort === 'price-high'
          ? [{ price: 'desc' as const }]
          : sort === 'name-asc'
            ? [{ name: 'asc' as const }]
            : sort === 'newest'
              ? [{ createdAt: 'desc' as const }]
              : [{ featured: 'desc' as const }, { createdAt: 'desc' as const }];

    const products = await prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy,
      ...(limit ? { take: Number(limit) } : {}),
    });

    res.json({ success: true, data: products.map(serializeProduct) });
  } catch (error) {
    next(error);
  }
});

/** Accepts an id OR a slug so the PDP can keep using pretty URLs. */
productsRouter.get('/:idOrSlug', async (req, res, next) => {
  try {
    const idOrSlug = param(req.params.idOrSlug, 'product identifier');
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw ApiError.notFound('Product not found.');
    res.json({ success: true, data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

/* ───────────────────── Admin-only mutations ───────────────────── */

/** Verifies referenced category/brand exist before writing. */
async function assertRelations(categoryId: string, brandId: string) {
  const [category, brand] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } }),
  ]);
  if (!category) throw ApiError.badRequest('That category does not exist.', { categoryId: 'Unknown category.' });
  if (!brand) throw ApiError.badRequest('That brand does not exist.', { brandId: 'Unknown brand.' });
}

productsRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = productInputSchema.parse(req.body);
    await assertRelations(input.categoryId, input.brandId);

    if (input.sku) {
      const clash = await prisma.product.findUnique({ where: { sku: input.sku }, select: { id: true } });
      if (clash) throw ApiError.conflict('That SKU is already used by another product.');
    }

    const slug = await uniqueSlug('product', input.slug || input.name);
    const { media, sizes, colors, slug: _ignored, ...rest } = input;

    const product = await prisma.product.create({
      data: {
        ...rest,
        slug,
        sizes,
        colors,
        media: {
          create: media.map((item, index) => ({ ...item, sortOrder: index })),
        },
      },
      include: PRODUCT_INCLUDE,
    });

    res.status(201).json({ success: true, data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

productsRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'product id');
    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!existing) throw ApiError.notFound('Product not found.');

    const input = productUpdateSchema.parse(req.body);
    await assertRelations(input.categoryId, input.brandId);

    if (input.sku) {
      const clash = await prisma.product.findFirst({
        where: { sku: input.sku, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw ApiError.conflict('That SKU is already used by another product.');
    }

    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug('product', input.slug, id)
        : existing.slug;

    const { media, sizes, colors, slug: _ignored, ...rest } = input;

    // Media is replaced wholesale: the admin form submits the full ordered
    // list, so diffing rows would add complexity without changing the result.
    const product = await prisma.$transaction(async (tx) => {
      await tx.productMedia.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          ...rest,
          slug,
          sizes,
          colors,
          media: { create: media.map((item, index) => ({ ...item, sortOrder: index })) },
        },
        include: PRODUCT_INCLUDE,
      });
    });

    res.json({ success: true, data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
});

productsRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'product id');
    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Product not found.');

    // Media rows cascade via the schema relation.
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
