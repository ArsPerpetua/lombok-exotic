import { setRequestLocale } from 'next-intl/server';
import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Keranjang' };

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComingSoon title="Keranjang" note="Cart + guest checkout — MVP week 3." />;
}
