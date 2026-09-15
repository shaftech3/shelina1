import { Link } from 'react-router-dom';
import { STORE_CONFIG } from '@/lib/constants';
import { footerNav, legalNav, socialLinks } from '@/data/mock/navigation';
import { Container, SmartLink } from '@/components/ui';
import { Logo } from './Logo';
import { SocialIcon } from './SocialIcon';

export function Footer() {
  return (
    <footer className="mt-auto bg-cream">
      <Container>
        <div className="grid gap-10 py-14 lg:grid-cols-12 lg:gap-8 lg:py-20">
          {/* Brand */}
          <div className="flex flex-col gap-6 lg:col-span-4 lg:pr-8">
            <Link
              to="/"
              aria-label={`${STORE_CONFIG.name} — home`}
              className="w-fit rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Logo slot="footer" showWordmark />
            </Link>

            <p className="max-w-sm text-body-sm text-ink-muted">
              Shelina crafts leather chappals, shoes and sneakers with a quiet kind of luxury — made in
              Pakistan, made to be worn every day.
            </p>

            <div className="flex items-center gap-1">
              {socialLinks.map((social) => (
                <SocialIcon key={social.platform} {...social} invert />
              ))}
            </div>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {footerNav.map((column) => (
              <div key={column.title} className="flex flex-col gap-3.5">
                <h2 className="font-sans text-caption font-semibold uppercase tracking-[0.16em] text-ink">
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <SmartLink
                        href={link.href}
                        className="group inline-flex items-center rounded-xs text-body-sm text-ink-muted transition-colors duration-fast hover:text-primary-deep focus-visible:outline-none focus-visible:text-primary-deep"
                      >
                        <span
                          aria-hidden
                          className="mr-0 h-px w-0 bg-primary transition-[width,margin] duration-base ease-elegant motion-safe:group-hover:mr-1.5 motion-safe:group-hover:w-3"
                        />
                        {link.label}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Contact and Trust */}
        <div className="flex flex-col gap-6 border-t border-border py-8 md:flex-row md:items-center md:justify-between">
          <address className="flex flex-col gap-1.5 not-italic text-body-sm text-ink-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
            <a
              href={`mailto:${STORE_CONFIG.supportEmail}`}
              className="rounded-xs transition-colors hover:text-primary-deep"
            >
              {STORE_CONFIG.supportEmail}
            </a>
            <a
              href={STORE_CONFIG.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xs transition-colors hover:text-primary-deep"
            >
              {STORE_CONFIG.supportPhone}
            </a>
            <span>{STORE_CONFIG.address}</span>
          </address>

          {/* Trust Signals: Secure Checkout Icons */}
          <div className="flex items-center gap-3">
            <span className="text-caption text-ink-muted font-medium mr-1 tracking-wide">SECURE CHECKOUT</span>
            <div className="flex items-center gap-2 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
              <svg viewBox="0 0 38 24" className="w-8 h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-visa"><title id="pi-visa">Visa</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"/><path d="M28.3 10.1H28c-.4 1-.7 1.5-1 3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 5.9h-1.7c-.1 0-.1 0-.2-.1l-.2-.9-.1-.2h-2.4c-.1 0-.2 0-.2.2l-.3.9c0 .1-.1.1-.1.1h-2.1l.2-.5L27 8.7c0-.5.3-.7.8-.7h1.5c.1 0 .2 0 .2.2l1.4 6.5c.1.4.2.7.2 1.1.1.1.1.1.1.2zm-13.4-.3l.4-1.8c.1 0 .2.1.2.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.4.9-.8 1.7-.8 1.2 0 2.5 0 3.1.2h.1c-.1.6-.2 1.1-.4 1.7-.5-.2-1-.4-1.5-.4-.3 0-.6 0-.9.1-.2 0-.3.1-.4.2-.2.2-.2.5 0 .7l.5.4c.4.2.8.4 1.1.6.5.3 1 .8 1.1 1.4.2.9-.1 1.7-.9 2.3-.5.4-1.1.6-2.1.6-1.1 0-2.5-.2-3.1-.5zm1.5-5.9c-.3 0-.5.2-.6.5l-1.6 7.5c0 .1-.1.1-.2.1h-2c-.1 0-.2 0-.2-.1l-1.3-4.6c-.1-.3-.2-.5-.3-.7-.5-.9-1.2-1.3-2-1.4-.2 0-.4 0-.5 0h-1.6l-.1.1c.1 0 .2.1.4.1.6.2 1.1.6 1.3 1.1l1.5 5.5c0 .1.1.2.2.2h2c.2 0 .2-.1.2-.2l2.3-7.5c0-.1.1-.2.2-.2h2.2c.1 0 .2 0 .2.2z" fill="#1434CB"/></svg>
              <svg viewBox="0 0 38 24" className="w-8 h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-master"><title id="pi-master">Mastercard</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"/><path d="M22 16.6c-2.2 0-4.2-1.2-5.1-3.1-1 1.9-3 3.1-5.1 3.1-3.3 0-6.1-2.7-6.1-6.1 0-3.3 2.7-6.1 6.1-6.1 2.2 0 4.2 1.2 5.1 3.1 1-1.9 3-3.1 5.1-3.1 3.3 0 6.1 2.7 6.1 6.1 0 3.4-2.8 6.1-6.1 6.1zM11.8 5.7c-2.7 0-4.8 2.2-4.8 4.8 0 2.7 2.2 4.8 4.8 4.8 1.8 0 3.3-.9 4.1-2.4-1.3-1.3-1.3-3.4 0-4.7-.8-1.5-2.3-2.5-4.1-2.5zm10.2 0c-1.8 0-3.3 1-4.1 2.5 1.3 1.3 1.3 3.4 0 4.7.8 1.5 2.3 2.4 4.1 2.4 2.7 0 4.8-2.2 4.8-4.8 0-2.6-2.2-4.8-4.8-4.8z" fill="#EB001B"/><path d="M15.9 13.5c1.3-1.3 1.3-3.4 0-4.7-.8-1.5-2.3-2.5-4.1-2.5-1.8 0-3.3.9-4.1 2.4 1.3 1.3 1.3 3.4 0 4.7.8 1.5 2.3 2.5 4.1 2.5 1.8.1 3.4-.8 4.1-2.4z" fill="#F79E1B"/></svg>
            </div>
          </div>
        </div>

        {/* Legal & Attribution */}
        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <p className="text-caption text-ink-subtle">
              © {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.
            </p>
            <span className="hidden text-caption text-ink-subtle/40 sm:inline" aria-hidden>•</span>
            <p className="text-caption text-ink-subtle">
              Website by <span className="font-medium text-ink-muted">ST-Solutions</span>
            </p>
          </div>
          {/* Omitted entirely while there are no legal pages to link to. */}
          {legalNav.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalNav.map((link) => (
              <li key={link.label}>
                <SmartLink
                  href={link.href}
                  className="rounded-xs text-caption text-ink-subtle transition-colors hover:text-primary-deep focus-visible:outline-none focus-visible:text-primary-deep"
                >
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
          )}
        </div>
      </Container>
    </footer>
  );
}
