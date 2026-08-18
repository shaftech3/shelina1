import { SITE_URL } from '@/lib/constants';
import type { SeoMeta, SeoSettings } from '@/types';
import { api } from './apiClient';
import { repository } from '@/data/repository';

/**
 * SEO resolution, backed by the Stage 5 API.
 *
 * `resolve()` and `social()` must stay SYNCHRONOUS — every page calls them
 * during render through `useSeo`. Making them async would have forced a
 * rewrite of all seven pages, which Stage 5 explicitly must not do.
 *
 * So the admin-managed settings are held in a small module-level snapshot that
 * is refreshed whenever `get()` or `update()` runs, and once at boot by
 * `primeSeoSettings()`. Until the first load resolves, the fallback below is
 * used: it is a neutral default, never a stale value from another site.
 */
const FALLBACK: SeoSettings = {
  siteTitle: 'Shelina',
  siteDescription: '',
  defaultImage: '',
  keywords: [],
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
};

let snapshot: SeoSettings = FALLBACK;

/** Notifies subscribers (the app shell) when settings change. */
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Bumped on every snapshot change so `useSyncExternalStore` consumers can use
 * it as a stable, comparable store value.
 */
let revision = 0;

function setSnapshot(next: SeoSettings) {
  snapshot = next;
  revision += 1;
  listeners.forEach((listener) => listener());
}

export const seoService = {
  /** Loads settings once at startup so the first paint has real metadata. */
  async prime(): Promise<SeoSettings> {
    const settings = await api.get<SeoSettings>('/seo');
    setSnapshot(settings);
    return settings;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Snapshot identity for `useSyncExternalStore`. */
  getRevision(): number {
    return revision;
  },

  resolve(meta: Partial<SeoMeta> & { title: string; path?: string }): SeoMeta {
    return {
      title: `${meta.title} — ${snapshot.siteTitle}`,
      description: meta.description ?? snapshot.siteDescription,
      canonical: meta.canonical ?? `${SITE_URL}${meta.path ?? ''}`,
      image: meta.image ?? snapshot.defaultImage,
      type: meta.type ?? 'website',
      noIndex: meta.noIndex ?? false,
    };
  },

  /**
   * Social metadata, with the documented fallback chain:
   *   Twitter → Open Graph → site default.
   * An empty admin field means "inherit", never "publish an empty tag".
   */
  social(): {
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
  } {
    const ogTitle = snapshot.ogTitle.trim() || snapshot.siteTitle;
    const ogDescription = snapshot.ogDescription.trim() || snapshot.siteDescription;
    const ogImage = snapshot.ogImage.trim() || snapshot.defaultImage;
    return {
      ogTitle,
      ogDescription,
      ogImage,
      twitterTitle: snapshot.twitterTitle.trim() || ogTitle,
      twitterDescription: snapshot.twitterDescription.trim() || ogDescription,
      twitterImage: snapshot.twitterImage.trim() || ogImage,
    };
  },

  async get(): Promise<SeoSettings> {
    const settings = await api.get<SeoSettings>('/seo');
    setSnapshot(settings);
    return settings;
  },

  async update(input: SeoSettings): Promise<SeoSettings> {
    const settings = await api.put<SeoSettings>('/seo', {
      siteTitle: input.siteTitle.trim(),
      siteDescription: input.siteDescription.trim(),
      defaultImage: input.defaultImage?.trim() || null,
      keywords: input.keywords.map((word) => word.trim()).filter(Boolean),
      ogTitle: input.ogTitle?.trim() || null,
      ogDescription: input.ogDescription?.trim() || null,
      ogImage: input.ogImage?.trim() || null,
      twitterTitle: input.twitterTitle?.trim() || null,
      twitterDescription: input.twitterDescription?.trim() || null,
      twitterImage: input.twitterImage?.trim() || null,
    });
    setSnapshot(settings);
    repository.invalidate();
    return settings;
  },
};
