import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, param } from '../lib/errors.js';
import { requireAdmin } from '../middleware/authGuards.js';
import { bannerInputSchema, homepageInputSchema, seoInputSchema } from '../validation/schemas.js';
import { serializeBanner, serializeHomepage, serializeSeo } from '../services/serialize.js';

export const homepageRouter = Router();
export const bannersRouter = Router();
export const seoRouter = Router();

/* ─────────────────────────── Homepage ─────────────────────────── */

const HOMEPAGE_ID = 'homepage';

/** Public read. Banners come back ordered in the same query — no N+1. */
homepageRouter.get('/', async (_req, res, next) => {
  try {
    const homepage = await prisma.homepage.findUnique({
      where: { id: HOMEPAGE_ID },
      include: { banners: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!homepage) throw ApiError.notFound('Homepage content has not been seeded.');
    res.json({ success: true, data: serializeHomepage(homepage) });
  } catch (error) {
    next(error);
  }
});

homepageRouter.put('/', requireAdmin, async (req, res, next) => {
  try {
    const input = homepageInputSchema.parse(req.body);
    const homepage = await prisma.homepage.update({
      where: { id: HOMEPAGE_ID },
      data: input,
      include: { banners: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ success: true, data: serializeHomepage(homepage) });
  } catch (error) {
    next(error);
  }
});

/* ──────────────────────────── Banners ──────────────────────────── */

/**
 * Public callers get ACTIVE banners only. An authenticated admin can request
 * every banner with ?all=true so the admin list can show inactive ones.
 */
bannersRouter.get('/', async (req, res, next) => {
  try {
    let includeInactive = false;
    if (req.query.all === 'true') {
      const { readSession } = await import('../lib/auth.js');
      includeInactive = Boolean(readSession(req, 'admin'));
    }

    const banners = await prisma.banner.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: banners.map(serializeBanner) });
  } catch (error) {
    next(error);
  }
});

bannersRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = bannerInputSchema.parse(req.body);
    const count = await prisma.banner.count();
    const banner = await prisma.banner.create({
      data: { ...input, sortOrder: input.sortOrder || count, homepageId: HOMEPAGE_ID },
    });
    res.status(201).json({ success: true, data: serializeBanner(banner) });
  } catch (error) {
    next(error);
  }
});

bannersRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'banner id');
    const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Banner not found.');

    const input = bannerInputSchema.parse(req.body);
    const banner = await prisma.banner.update({ where: { id }, data: input });
    res.json({ success: true, data: serializeBanner(banner) });
  } catch (error) {
    next(error);
  }
});

bannersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'banner id');
    const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Banner not found.');
    await prisma.banner.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/* ────────────────────────────── SEO ────────────────────────────── */

const SEO_ID = 'seo';

seoRouter.get('/', async (_req, res, next) => {
  try {
    const seo = await prisma.seoSettings.findUnique({ where: { id: SEO_ID } });
    if (!seo) throw ApiError.notFound('SEO settings have not been seeded.');
    res.json({ success: true, data: serializeSeo(seo) });
  } catch (error) {
    next(error);
  }
});

seoRouter.put('/', requireAdmin, async (req, res, next) => {
  try {
    const input = seoInputSchema.parse(req.body);
    const seo = await prisma.seoSettings.update({ where: { id: SEO_ID }, data: input });
    res.json({ success: true, data: serializeSeo(seo) });
  } catch (error) {
    next(error);
  }
});
