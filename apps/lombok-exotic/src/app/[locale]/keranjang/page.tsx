import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCartView } from '@/lib/cart';
import { CartPageClient } from '@/components/cart-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cart' });
  return { title: t('title'), robots: { index: false } };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('cart');
  const cart = await getCartView();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 pt-12">
        <h1 className="font-display text-3xl">{t('title')}</h1>
      </div>
      <CartPageClient
        initial={cart}
        labels={{
          empty: t('empty'),
          browse: t('browse'),
          adjusted: t('adjusted'),
          unit: t('unit'),
          remove: t('remove'),
          subtotal: t('subtotal'),
          totalWeight: t('totalWeight'),
          shippingNote: t('shippingNote'),
          checkout: t('checkout'),
          // Raw template — the client fills {n} via .replace(); t() would throw
          // FORMATTING_ERROR here because no `n` is provided at this call site.
          stockLeft: t.raw('stockLeft') as string,
          genericError: t('genericError'),
        }}
      />
    </div>
  );
}
