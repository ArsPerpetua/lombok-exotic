import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { getCartView } from '@/lib/cart';
import { CheckoutForm } from '@/components/checkout-form';
import { isValidLocale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title'), robots: { index: false } };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  const cart = await getCartView();

  if (cart.lines.length === 0) redirect({ href: '/keranjang', locale });

  const loc = isValidLocale(locale) ? locale : 'id';

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl">{t('title')}</h1>

      <ul className="mt-6 divide-y rounded border text-sm">
        {cart.lines.map((l) => (
          <li key={l.itemId} className="flex justify-between gap-3 px-4 py-3">
            <span>
              {l.productName}
              <span className="text-[var(--color-muted)]">
                {' '}
                — {l.variantName} × {l.quantity}
              </span>
            </span>
            <span>{formatIdr(l.lineTotalIdr)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <CheckoutForm
          subtotalIdr={cart.subtotalIdr}
          locale={loc}
          labels={{
            contact: t('contact'),
            name: t('name'),
            phone: t('phone'),
            email: t('email'),
            emailOptional: t('emailOptional'),
            shippingAddress: t('shippingAddress'),
            recipient: t('recipient'),
            searchArea: t('searchArea'),
            searchAreaHint: t('searchAreaHint'),
            searching: t('searching'),
            noAreas: t('noAreas'),
            useManual: t('useManual'),
            useSearch: t('useSearch'),
            province: t('province'),
            city: t('city'),
            district: t('district'),
            postalCode: t('postalCode'),
            addressLine: t('addressLine'),
            addressLinePlaceholder: t('addressLinePlaceholder'),
            notes: t('notes'),
            calcShipping: t('calcShipping'),
            calculating: t('calculating'),
            ratesFailed: t('ratesFailed'),
            chooseCourier: t('chooseCourier'),
            order: t('order'),
            subtotal: t('subtotal'),
            shipping: t('shipping'),
            total: t('total'),
            payNow: t('payNow'),
            preparing: t('preparing'),
            errorGeneric: t('errorGeneric'),
            errorStock: t('errorStock'),
            errorShippingChanged: t('errorShippingChanged'),
            errorCartEmpty: t('errorCartEmpty'),
            required: t('required'),
          }}
        />
      </div>
    </div>
  );
}
