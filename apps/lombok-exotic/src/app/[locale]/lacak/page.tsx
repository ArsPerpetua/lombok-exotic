import { setRequestLocale } from 'next-intl/server';
import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Lacak Pesanan' };

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ComingSoon
      title="Lacak Pesanan"
      note="Cek status pakai nomor order + WhatsApp — MVP week 3/4."
    />
  );
}
