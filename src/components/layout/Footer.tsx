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

        {/* Contact */}
        <div className="flex flex-col gap-4 border-t border-border py-8 md:flex-row md:items-center md:justify-between">
          <address className="flex flex-col gap-1.5 not-italic text-body-sm text-ink-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
            <a
              href={`mailto:${STORE_CONFIG.supportEmail}`}
              className="rounded-xs transition-colors hover:text-primary-deep"
            >
              {STORE_CONFIG.supportEmail}
            </a>
            <a
              href={`tel:${STORE_CONFIG.supportPhone.replace(/\s/g, '')}`}
              className="rounded-xs transition-colors hover:text-primary-deep"
            >
              {STORE_CONFIG.supportPhone}
            </a>
            <span>{STORE_CONFIG.address}</span>
          </address>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-ink-subtle">
            © {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.
          </p>
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
