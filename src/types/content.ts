import type { ID, ImageAsset } from './catalog';

export interface CallToAction {
  label: string;
  href: string;
}

/** Hero slide content. Later populated from the admin/CMS without UI changes. */
export interface HeroSlide {
  id: ID;
  eyebrow?: string;
  heading: string;
  subheading?: string;
  image: ImageAsset;
  mobileImage?: ImageAsset;
  primaryCta?: CallToAction;
  secondaryCta?: CallToAction;
  badge?: string;
  /** Overlay strength, 0–1. Lets editors keep text legible over busy imagery. */
  overlayOpacity?: number;
  align?: 'left' | 'center';
  /** Short proof points rendered beneath the CTAs. */
  highlights?: string[];
}

export type BannerVariant = 'image' | 'split' | 'plain';
export type BannerTone = 'cream' | 'primary' | 'secondary' | 'surface';

export interface Banner {
  id: ID;
  variant: BannerVariant;
  tone?: BannerTone;
  eyebrow?: string;
  heading: string;
  description?: string;
  image?: ImageAsset;
  mobileImage?: ImageAsset;
  cta?: CallToAction;
  badge?: string;
  /** Places the media on the left or right in split layouts. */
  mediaSide?: 'left' | 'right';
  /**
   * Admin visibility toggle. Undefined counts as active so banners authored
   * before this flag existed keep rendering.
   */
  active?: boolean;
}

/** Full-bleed editorial story block. Visual-first, minimal copy. */
export interface EditorialFeature {
  id: ID;
  eyebrow?: string;
  heading: string;
  description?: string;
  image: ImageAsset;
  cta?: CallToAction;
  /** Which side the copy card sits on at desktop widths. */
  align?: 'left' | 'right';
}

/** Value proposition shown in the trust section. */
export interface TrustValue {
  id: ID;
  /** Must match an IconName in components/ui/Icon. */
  icon: string;
  title: string;
  description: string;
}

/** Generic navigation node used by header, footer and drawer. */
export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
  description?: string;
  /** Marks promotional links (e.g. Sale) for accent styling. */
  accent?: boolean;
}
