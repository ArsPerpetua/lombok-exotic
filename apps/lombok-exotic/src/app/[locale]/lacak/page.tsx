import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TrackForm } from '@/components/track-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'track' });
  return { title: t('title'), robots: { index: false } };
}

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('track');
  const o = await getTranslations('order');

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl">{t('title')}</h1>
      <p className="mt-2 text-[var(--color-muted)]">{t('lead')}</p>

      <TrackForm
        labels={{
          orderNumber: t('orderNumber'),
          orderNumberHint: t('orderNumberHint'),
          phone: t('phone'),
          phoneHint: t('phoneHint'),
          submit: t('submit'),
          submitting: t('submitting'),
          errorInvalid: t('errorInvalid'),
          errorRateLimited: t('errorRateLimited'),
          errorNotFound: t('errorNotFound'),
          timeline: t('timeline'),
          payment: t('payment'),
          courier: t('courier'),
          tracking: t('tracking'),
          openTracking: t('openTracking'),
          total: t('total'),
          placed: t('placed'),
          again: t('again'),
          statusLabels: {
            pending_payment: o('status.pending_payment'),
            paid: o('status.paid'),
            processing: o('status.processing'),
            shipped: o('status.shipped'),
            completed: o('status.completed'),
            cancelled: o('status.cancelled'),
            refunded: o('status.refunded'),
          },
        }}
      />
    </div>
  );
}
