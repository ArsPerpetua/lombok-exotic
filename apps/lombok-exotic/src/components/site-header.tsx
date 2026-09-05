import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { clientConfig } from '../../client.config';
import { LocaleSwitcher } from './locale-switcher';

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations('nav');
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg text-brand">
          {clientConfig.name}
        </Link>
        <nav className="hidden gap-6 text-sm sm:flex">
          <Link href="/katalog">{t('catalog')}</Link>
          {clientConfig.features.groupPreorder && (
            <Link href="/pesanan-rombongan">{t('groupOrder')}</Link>
          )}
          {clientConfig.features.blog && <Link href="/artikel">{t('blog')}</Link>}
          <Link href="/tentang">{t('about')}</Link>
          <Link href="/lacak">{t('trackOrder')}</Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <LocaleSwitcher current={locale} />
          <Link href="/keranjang" className="font-medium">
            {t('cart')}
          </Link>
        </div>
      </div>
    </header>
  );
}
