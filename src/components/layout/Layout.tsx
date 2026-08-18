import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  /** Pages opening with a full-bleed hero get a transparent initial header. */
  overHero?: boolean;
}

/** App shell: skip link, header, main landmark, footer. */
export function Layout({ children, overHero = false }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-primary-deep focus:px-5 focus:py-3 focus:text-button focus:text-white"
      >
        Skip to content
      </a>

      <Header overHero={overHero} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
