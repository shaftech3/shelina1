import 'dotenv/config';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * ============================================================================
 * DEVELOPMENT SEED
 * ============================================================================
 *
 * Seeds the SAME Stage 3 catalogue the storefront has always shown — the mock
 * modules in the frontend are read directly and converted, so there is exactly
 * one dataset and the shop looks identical after migrating to PostgreSQL.
 * A second, unrelated demo dataset is deliberately NOT created.
 *
 * The seed is idempotent: it upserts by slug, so re-running it will not
 * duplicate rows.
 *
 * The admin password is taken from SEED_ADMIN_PASSWORD and hashed with bcrypt
 * before it is stored. No password is hardcoded here, and no plaintext is ever
 * written to the database.
 */

const candidateDirs = [
  path.resolve(process.cwd(), '../src/data/mock'),
  path.resolve(process.cwd(), 'src/data/mock'),
  path.resolve(process.cwd(), '../shelina/src/data/mock'),
];
const FRONTEND_MOCK_DIR = candidateDirs.find((dir) => fs.existsSync(dir)) ?? candidateDirs[0];

/**
 * The mock files are TypeScript modules with no runtime dependencies beyond
 * their type imports. Strip the type-only syntax and evaluate them so the seed
 * always reflects the real Stage 3 data instead of a hand-copied duplicate.
 */
function loadMock<T>(file: string, exportName: string): T {
  const filePath = path.join(FRONTEND_MOCK_DIR, file);
  let source = fs.readFileSync(filePath, 'utf8');
  source = source.replace(/^import type .*$/gm, '');
  // Strip the type annotation from EVERY exported const, not just the one we
  // want: these files often export several values and a leftover annotation
  // is a syntax error once the module is evaluated as plain JS.
  source = source.replace(/export const (\w+)\s*:\s*[^=]+=/g, 'const $1 =');
  source = source.replace(/export const /g, 'const ');
  source += `\nmodule.exports = ${exportName};`;

  const require = createRequire(import.meta.url);
  const Module = require('node:module');
  const compiled = new Module(filePath, undefined);
  compiled.paths = Module._nodeModulePaths(path.dirname(filePath));
  compiled._compile(source, filePath.replace(/\.ts$/, '.cjs'));
  return compiled.exports as T;
}

interface MockImage { src: string; alt: string; width?: number; height?: number }
interface MockProduct {
  id: string; slug: string; name: string; brand?: string; categoryId: string;
  price: number; salePrice?: number | null; images: MockImage[];
  sizes: { value: string; available: boolean }[];
  colors: { name: string; swatch?: string; available: boolean }[];
  stockStatus: string; stockCount?: number; featured?: boolean; isNew?: boolean;
  shortDescription?: string; description?: string; sku?: string;
  video?: { src: string; poster?: string; title: string };
  status?: string; tags?: string[]; seo?: { title?: string; description?: string };
}
interface MockCategory {
  id: string; slug: string; name: string; description?: string;
  image: MockImage; group?: string; featured?: boolean;
  seo?: { title?: string; description?: string };
}
interface MockBrand {
  id: string; slug: string; name: string; description?: string;
  logo?: MockImage; seo?: { title?: string; description?: string };
}
interface MockHero {
  id: string; eyebrow?: string; heading: string; subheading?: string;
  image: MockImage; badge?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}
interface MockBanner {
  id: string; variant: string; tone?: string; eyebrow?: string; heading: string;
  description?: string; image?: MockImage; cta?: { label: string; href: string };
  mediaSide?: string; active?: boolean;
}
interface MockEditorial {
  id: string; eyebrow?: string; heading: string; description?: string;
  image: MockImage; cta?: { label: string; href: string };
}

const connectionString =
  process.env.DATABASE_URL || 'postgresql://shelina@127.0.0.1:5432/shelina_dev?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('[seed] loading Stage 3 catalogue from the frontend mock modules…');

  const products = loadMock<MockProduct[]>('products.ts', 'mockProducts');
  const categories = loadMock<MockCategory[]>('categories.ts', 'mockCategories');
  const brands = loadMock<MockBrand[]>('brands.ts', 'mockBrands');
  const heroSlides = loadMock<MockHero[]>('hero.ts', 'mockHeroSlides');
  const banners = loadMock<MockBanner[]>('banners.ts', 'mockBanners');
  // `mockEditorial` is a single object, not an array.
  const editorial = loadMock<MockEditorial>('editorial.ts', 'mockEditorial');

  console.log(
    `[seed] found ${products.length} products, ${categories.length} categories, ${brands.length} brands`,
  );

  /* ── Admin user ── */
  const adminEmail = (process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? 'shelinaoffical@gmail.com')
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? '';

  if (adminPassword && adminPassword.length >= 8) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const adminName = process.env.ADMIN_NAME ?? process.env.SEED_ADMIN_NAME ?? 'Shelina Admin';

    // Enforce single admin account guarantee
    const existingAdmins = await prisma.adminUser.findMany();
    if (existingAdmins.length > 0) {
      const primary = existingAdmins.find((a: { email: string }) => a.email.toLowerCase() === adminEmail) ?? existingAdmins[0];
      await prisma.adminUser.update({
        where: { id: primary.id },
        data: { email: adminEmail, name: adminName, passwordHash, role: 'admin' },
      });
      if (existingAdmins.length > 1) {
        const extraIds = existingAdmins.filter((a: { id: string }) => a.id !== primary.id).map((a: { id: string }) => a.id);
        await prisma.adminUser.deleteMany({ where: { id: { in: extraIds } } });
      }
    } else {
      await prisma.adminUser.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: 'admin',
        },
      });
    }
    console.log(`[seed] admin ready: ${adminEmail} (bcrypt hash stored, never plaintext)`);
  } else {
    console.log('[seed] ADMIN_PASSWORD not set or < 8 chars — skipping admin seed (use ADMIN_PASSWORD env var or admin bootstrap)');
  }

  /* ── Categories ── */
  const categoryIdBySlug = new Map<string, string>();
  const categoryIdByMockId = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description ?? null,
        image: category.image?.src ?? null,
        imageAlt: category.image?.alt ?? null,
        group: category.group ?? null,
        featured: category.featured ?? false,
        seoTitle: category.seo?.title ?? null,
        seoDescription: category.seo?.description ?? null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        image: category.image?.src ?? null,
        imageAlt: category.image?.alt ?? null,
        group: category.group ?? null,
        featured: category.featured ?? false,
        seoTitle: category.seo?.title ?? null,
        seoDescription: category.seo?.description ?? null,
      },
    });
    categoryIdBySlug.set(category.slug, row.id);
    categoryIdByMockId.set(category.id, row.id);
  }
  console.log(`[seed] categories: ${categoryIdBySlug.size}`);

  /* ── Brands ── */
  const brandIdByName = new Map<string, string>();
  for (const brand of brands) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        description: brand.description ?? null,
        logo: brand.logo?.src ?? null,
        logoAlt: brand.logo?.alt ?? null,
        seoTitle: brand.seo?.title ?? null,
        seoDescription: brand.seo?.description ?? null,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        description: brand.description ?? null,
        logo: brand.logo?.src ?? null,
        logoAlt: brand.logo?.alt ?? null,
        seoTitle: brand.seo?.title ?? null,
        seoDescription: brand.seo?.description ?? null,
      },
    });
    brandIdByName.set(brand.name, row.id);
  }
  console.log(`[seed] brands: ${brandIdByName.size}`);

  /* ── Products ── */
  for (const product of products) {
    const categoryId = categoryIdByMockId.get(product.categoryId);
    if (!categoryId) {
      throw new Error(`Product ${product.slug} references unknown category ${product.categoryId}`);
    }
    const brandId = product.brand ? (brandIdByName.get(product.brand) ?? null) : null;

    const salePrice =
      typeof product.salePrice === 'number' && product.salePrice > 0 ? product.salePrice : null;

    const data = {
      name: product.name,
      sku: product.sku ?? null,
      shortDescription: product.shortDescription ?? null,
      description: product.description ?? null,
      price: product.price,
      salePrice,
      stock: product.stockCount ?? 0,
      stockStatus: product.stockStatus,
      status: product.status ?? 'active',
      featured: product.featured ?? false,
      newArrival: product.isNew ?? false,
      onSale: salePrice !== null,
      // Stored verbatim — free-form strings, no dictionary, no normalisation.
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      tags: product.tags ?? [],
      seoTitle: product.seo?.title ?? null,
      seoDescription: product.seo?.description ?? null,
      categoryId,
      brandId,
    };

    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { ...data, slug: product.slug },
    });

    // Media is reference-only: URLs, alt text and ordering. No binary data.
    await prisma.productMedia.deleteMany({ where: { productId: row.id } });
    interface MediaRow {
      productId: string;
      type: string;
      url: string;
      alt: string;
      width: number | null;
      height: number | null;
      poster: string | null;
      sortOrder: number;
    }

    const media: MediaRow[] = product.images.map((image, index) => ({
      productId: row.id,
      type: 'image',
      url: image.src,
      alt: image.alt,
      width: image.width ?? null,
      height: image.height ?? null,
      poster: null,
      sortOrder: index,
    }));
    if (product.video?.src) {
      media.push({
        productId: row.id,
        type: 'video',
        url: product.video.src,
        alt: product.video.title,
        width: null,
        height: null,
        poster: product.video.poster ?? null,
        sortOrder: media.length,
      });
    }
    if (media.length) await prisma.productMedia.createMany({ data: media });
  }
  console.log(`[seed] products: ${products.length} (with media references)`);

  /* ── Homepage (hero + editorial) ── */
  const hero = heroSlides[0];
  const story = editorial;
  const homepageData = {
    eyebrow: hero?.eyebrow ?? null,
    heading: hero?.heading ?? 'Step into your style',
    subheading: hero?.subheading ?? null,
    badge: hero?.badge ?? null,
    image: hero?.image?.src ?? null,
    imageAlt: hero?.image?.alt ?? null,
    ctaText: hero?.primaryCta?.label ?? null,
    ctaLink: hero?.primaryCta?.href ?? null,
    secondaryCtaText: hero?.secondaryCta?.label ?? null,
    secondaryCtaLink: hero?.secondaryCta?.href ?? null,
    editorialEyebrow: story?.eyebrow ?? null,
    editorialHeading: story?.heading ?? null,
    editorialDescription: story?.description ?? null,
    editorialImage: story?.image?.src ?? null,
    editorialImageAlt: story?.image?.alt ?? null,
    editorialCtaText: story?.cta?.label ?? null,
    editorialCtaLink: story?.cta?.href ?? null,
  };
  await prisma.homepage.upsert({
    where: { id: 'homepage' },
    update: homepageData,
    create: { id: 'homepage', ...homepageData },
  });
  console.log('[seed] homepage hero + editorial');

  /* ── Banners ── */
  await prisma.banner.deleteMany({});
  for (const [index, banner] of banners.entries()) {
    await prisma.banner.create({
      data: {
        title: banner.heading,
        description: banner.description ?? null,
        eyebrow: banner.eyebrow ?? null,
        image: banner.image?.src ?? null,
        imageAlt: banner.image?.alt ?? null,
        ctaText: banner.cta?.label ?? null,
        ctaLink: banner.cta?.href ?? null,
        variant: banner.variant ?? 'split',
        tone: banner.tone ?? null,
        mediaSide: banner.mediaSide ?? null,
        active: banner.active ?? true,
        sortOrder: index,
        homepageId: 'homepage',
      },
    });
  }
  console.log(`[seed] banners: ${banners.length}`);

  /* ── SEO settings ── */
  const seoData = {
    siteTitle: 'Shelina',
    siteDescription:
      'Handcrafted leather chappals, shoes and sneakers for women and men, made in Pakistan.',
    defaultImage: '/images/hero/hero-main.jpg',
    keywords: ['leather chappals', 'ladies shoes', 'gents shoes', 'sneakers', 'Pakistan'],
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
  };
  await prisma.seoSettings.upsert({
    where: { id: 'seo' },
    update: seoData,
    create: { id: 'seo', ...seoData },
  });
  console.log('[seed] SEO settings');

  /* ── Store Settings ── */
  const settingsData = {
    shippingFee: 250,
    freeShippingThreshold: 0,
    contactPhone: '+92 300 1234567',
    contactEmail: 'shelinaoffical@gmail.com',
    whatsappNumber: '+923001234567',
  };
  await prisma.storeSettings.upsert({
    where: { id: 'settings' },
    update: {},
    create: { id: 'settings', ...settingsData },
  });
  console.log('[seed] Store settings');

  console.log('[seed] done.');
}

export async function seedDatabase(): Promise<void> {
  await main();
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isDirectRun) {
  main()
    .catch((error) => {
      console.error('[seed] failed:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
