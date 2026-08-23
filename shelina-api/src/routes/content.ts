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

const DEFAULT_HOMEPAGE = {
  eyebrow: 'Atelier Collection',
  heading: 'Step into your style',
  subheading: 'Handcrafted leather footwear made with quiet precision in Pakistan.',
  badge: 'Spring / Summer 2026',
  image: '/images/hero/hero-main.jpg',
  imageAlt: 'Handcrafted leather footwear display',
  ctaText: 'Explore Collection',
  ctaLink: '/products',
  secondaryCtaText: 'Our Story',
  secondaryCtaLink: '/about',
  editorialEyebrow: 'Our Craft',
  editorialHeading: 'Made by hand, shaped by time',
  editorialDescription: 'Every Shelina pair begins with full-grain leather selected for its temper and grain. Cut, lasted and finished by craftsmen in Lahore.',
  editorialImage: '/images/categories/ladies-chappals.jpg',
  editorialImageAlt: 'Leather craftsman at work',
  editorialCtaText: 'Learn More',
  editorialCtaLink: '/about',
};

/** Public read. Banners come back ordered in the same query — no N+1. */
homepageRouter.get('/', async (_req, res, next) => {
  try {
    let homepage = await prisma.homepage.findUnique({
      where: { id: HOMEPAGE_ID },
      include: { banners: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!homepage) {
      homepage = await prisma.homepage.upsert({
        where: { id: HOMEPAGE_ID },
        update: {},
        create: { id: HOMEPAGE_ID, ...DEFAULT_HOMEPAGE },
        include: { banners: { orderBy: { sortOrder: 'asc' } } },
      });
    }
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

const DEFAULT_SEO = {
  siteTitle: 'Shelina',
  siteDescription: 'Handcrafted leather chappals, shoes and sneakers for women and men, made in Pakistan.',
  defaultImage: '/images/hero/hero-main.jpg',
  keywords: ['leather chappals', 'ladies shoes', 'gents shoes', 'sneakers', 'Pakistan'],
  ogTitle: 'Shelina Footwear',
  ogDescription: 'Handcrafted leather footwear made with quiet precision.',
  ogImage: '/images/hero/hero-main.jpg',
  twitterTitle: 'Shelina Footwear',
  twitterDescription: 'Handcrafted leather footwear made with quiet precision.',
  twitterImage: '/images/hero/hero-main.jpg',
};

seoRouter.get('/', async (_req, res, next) => {
  try {
    let seo = await prisma.seoSettings.findUnique({ where: { id: SEO_ID } });
    if (!seo) {
      seo = await prisma.seoSettings.upsert({
        where: { id: SEO_ID },
        update: {},
        create: { id: SEO_ID, ...DEFAULT_SEO },
      });
    }
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
