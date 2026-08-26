import type { Banner, EditorialFeature, HeroSlide } from '@/types';
import { api } from './apiClient';
import { repository } from '@/data/repository';

/**
 * Homepage content, backed by the Stage 5 API.
 *
 * The admin edits CONTENT only — headings, copy, imagery, links, active flags.
 * Layout choices (variant, tone, media side) stay under the designer's control
 * so an editor cannot break the composition from a form. There is no
 * drag-and-drop page builder.
 */
export interface HomepageContent {
  hero: HeroSlide[];
  banners: Banner[];
  editorial: EditorialFeature;
}

export interface HeroInput {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  image: { src: string; alt: string };
  mobileImage?: { src: string; alt?: string };
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  badge?: string;
}

export interface BannerInput {
  heading: string;
  eyebrow?: string;
  description?: string;
  image?: { src: string; alt: string };
  cta?: { label: string; href: string };
  active: boolean;
}

export interface EditorialInput {
  eyebrow?: string;
  heading: string;
  description?: string;
  image: { src: string; alt: string };
  cta?: { label: string; href: string };
}

interface ApiHomepage {
  hero: HeroSlide & { secondaryImage?: string };
  editorial: EditorialFeature | null;
  banners: Banner[];
}

/** Empty CTA fields mean "no button", not a button with no label. */
function cleanCta(cta?: { label: string; href: string }) {
  const label = cta?.label?.trim();
  const href = cta?.href?.trim();
  return label && href ? { label, href } : undefined;
}

/** The homepage row carries both hero and editorial, so updates merge. */
async function currentRow(): Promise<ApiHomepage> {
  return api.get<ApiHomepage>('/homepage');
}

function heroToPayload(hero: ApiHomepage['hero']) {
  return {
    eyebrow: hero.eyebrow ?? null,
    heading: hero.heading,
    subheading: hero.subheading ?? null,
    badge: hero.badge ?? null,
    image: hero.image?.src ?? null,
    imageAlt: hero.image?.alt ?? null,
    ctaText: hero.primaryCta?.label ?? null,
    ctaLink: hero.primaryCta?.href ?? null,
    secondaryCtaText: hero.secondaryCta?.label ?? null,
    secondaryCtaLink: hero.secondaryCta?.href ?? null,
  };
}

function editorialToPayload(editorial: EditorialFeature | null) {
  return {
    editorialEyebrow: editorial?.eyebrow ?? null,
    editorialHeading: editorial?.heading ?? null,
    editorialDescription: editorial?.description ?? null,
    editorialImage: editorial?.image?.src ?? null,
    editorialImageAlt: editorial?.image?.alt ?? null,
    editorialCtaText: editorial?.cta?.label ?? null,
    editorialCtaLink: editorial?.cta?.href ?? null,
  };
}

function bannerToPayload(input: BannerInput) {
  return {
    title: input.heading.trim(),
    eyebrow: input.eyebrow?.trim() || null,
    description: input.description?.trim() || null,
    image: input.image?.src?.trim() || null,
    imageAlt: input.image?.alt?.trim() || null,
    ctaText: cleanCta(input.cta)?.label ?? null,
    ctaLink: cleanCta(input.cta)?.href ?? null,
    active: input.active,
  };
}

export const homepageService = {
  async get(): Promise<HomepageContent> {
    const data = await currentRow();
    return {
      hero: [data.hero],
      banners: data.banners,
      editorial: data.editorial as EditorialFeature,
    };
  },

  async updateHero(_id: string, input: HeroInput): Promise<HeroSlide> {
    const current = await currentRow();
    const updated = await api.put<ApiHomepage>('/homepage', {
      ...editorialToPayload(current.editorial),
      eyebrow: input.eyebrow?.trim() || null,
      heading: input.heading.trim(),
      subheading: input.subheading?.trim() || null,
      badge: input.badge?.trim() || null,
      image: input.image.src.trim() || null,
      imageAlt: input.image.alt.trim() || null,
      secondaryImage: input.mobileImage?.src?.trim() || null,
      ctaText: cleanCta(input.primaryCta)?.label ?? null,
      ctaLink: cleanCta(input.primaryCta)?.href ?? null,
      secondaryCtaText: cleanCta(input.secondaryCta)?.label ?? null,
      secondaryCtaLink: cleanCta(input.secondaryCta)?.href ?? null,
    });
    repository.invalidate();
    return updated.hero;
  },

  async updateEditorial(input: EditorialInput): Promise<EditorialFeature> {
    const current = await currentRow();
    const updated = await api.put<ApiHomepage>('/homepage', {
      ...heroToPayload(current.hero),
      editorialEyebrow: input.eyebrow?.trim() || null,
      editorialHeading: input.heading.trim(),
      editorialDescription: input.description?.trim() || null,
      editorialImage: input.image.src.trim() || null,
      editorialImageAlt: input.image.alt.trim() || null,
      editorialCtaText: cleanCta(input.cta)?.label ?? null,
      editorialCtaLink: cleanCta(input.cta)?.href ?? null,
    });
    repository.invalidate();
    return updated.editorial as EditorialFeature;
  },

  async createBanner(input: BannerInput): Promise<Banner> {
    const banner = await api.post<Banner>('/banners', bannerToPayload(input));
    repository.invalidate();
    return banner;
  },

  async updateBanner(id: string, input: BannerInput): Promise<Banner> {
    const banner = await api.put<Banner>(`/banners/${encodeURIComponent(id)}`, bannerToPayload(input));
    repository.invalidate();
    return banner;
  },

  async removeBanner(id: string): Promise<void> {
    await api.delete<null>(`/banners/${encodeURIComponent(id)}`);
    repository.invalidate();
  },
};
