/**
 * Minimal class-name joiner.
 * Intentionally dependency-free (no clsx / tailwind-merge) to keep the bundle small.
 */
export type ClassValue = string | number | bigint | boolean | null | undefined | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];

  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }

  return out.join(' ');
}
