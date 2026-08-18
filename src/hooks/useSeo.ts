import { useEffect, useSyncExternalStore } from 'react';
import { seoService } from '@/services';
import type { SeoMeta } from '@/types';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Applies page metadata (title, description, Open Graph, canonical).
 * Deliberately dependency-free — no react-helmet — and easy to swap for a
 * framework-native head API after migration.
 */
export function useSeo(meta: Partial<SeoMeta> & { title: string; path?: string }): void {
  // Site-wide SEO settings arrive from the API after the first paint, and an
  // admin can change them at runtime. Subscribing to the service revision
  // re-renders this hook so the title/meta reflect the loaded settings instead
  // of being frozen to the fallback captured on first render.
  useSyncExternalStore(seoService.subscribe, seoService.getRevision, seoService.getRevision);

  const resolved = seoService.resolve(meta);

  useEffect(() => {
    document.title = resolved.title;
    setMeta('meta[name="description"]', 'name', 'description', resolved.description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', resolved.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', resolved.description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', resolved.type ?? 'website');
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    if (resolved.image) setMeta('meta[property="og:image"]', 'property', 'og:image', resolved.image);
    if (resolved.canonical) {
      setMeta('meta[property="og:url"]', 'property', 'og:url', resolved.canonical);
      setLink('canonical', resolved.canonical);
    }
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      resolved.noIndex ? 'noindex, nofollow' : 'index, follow',
    );
  }, [resolved.title, resolved.description, resolved.canonical, resolved.image, resolved.type, resolved.noIndex]);
}
