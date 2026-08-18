/** Page-level metadata contract consumed by the useSeo hook. */
export interface SeoMeta {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
}
