import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { clientConfig } from '../../client.config';
import { LocaleSwitcher } from './locale-switcher';
import { CartBadge } from './cart-badge';
import { MobileNav } from './mobile-nav';

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations('nav');

  const links = [
    { href: '/katalog', label: t('catalog') },
    ...(clientConfig.features.groupPreorder
      ? [{ href: '/pesanan-rombongan', label: t('groupOrder') }]
      : []),
    ...(clientConfig.features.blog ? [{ href: '/artikel', label: t('blog') }] : []),
    { href: '/tentang', label: t('about') },
    { href: '/lacak', label: t('trackOrder') },
  ];

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label={clientConfig.name} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-light.svg"
            alt={clientConfig.name}
            width={168}
            height={74}
            className="h-10 w-auto"
          />
        </Link>
        <nav className="hidden gap-6 text-sm sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <LocaleSwitcher current={locale} />
          <CartBadge label={t('cart')} />
          <MobileNav links={links} openLabel={t('menu')} />
        </div>
      </div>
    </header>
  );
}
