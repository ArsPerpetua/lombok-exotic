import { setRequestLocale, getTranslations } from 'next-intl/server';
import { GroupPreorderForm } from '@/components/group-preorder-form';

export const metadata = { title: 'Pesanan Rombongan' };

/**
 * The pitch differentiator. Week 5 wires the form to a server action that
 * creates a `group_preorders` row + admin queue entry + quote email.
 */
export default async function GroupPreorderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('group');

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl">{t('title')}</h1>
      <p className="mt-3 text-[var(--color-muted)]">{t('lead')}</p>
      <div className="mt-8">
        <GroupPreorderForm />
      </div>
    </div>
  );
}
