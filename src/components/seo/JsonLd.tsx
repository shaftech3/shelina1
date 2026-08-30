import { useEffect } from 'react';

interface JsonLdProps {
  id?: string;
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Injects a valid, validated JSON-LD schema script element in the document head.
 * Updates dynamically on navigation and removes itself on unmount.
 */
export function JsonLd({ id = 'structured-data-jsonld', data }: JsonLdProps) {
  useEffect(() => {
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
      }
    };
  }, [id, data]);

  return null;
}
