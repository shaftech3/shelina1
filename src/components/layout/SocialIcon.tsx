import { cn } from '@/lib/cn';
import type { SocialPlatform } from '@/data/mock/navigation';
import { Icon, type IconName } from '@/components/ui';

interface SocialIconProps {
  platform: SocialPlatform;
  label: string;
  href: string;
  invert?: boolean;
  className?: string;
}

const ICONS: Record<SocialPlatform, IconName> = {
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
};

export function SocialIcon({ platform, label, href, invert = false, className }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full',
        'transition-[background-color,color,transform] duration-fast ease-elegant',
        'motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:shadow-focus',
        invert ? 'text-ink-muted hover:bg-primary-soft hover:text-primary-deep' : 'text-ink-muted hover:bg-cream hover:text-primary-deep',
        className,
      )}
    >
      <Icon name={ICONS[platform]} size={20} />
    </a>
  );
}
