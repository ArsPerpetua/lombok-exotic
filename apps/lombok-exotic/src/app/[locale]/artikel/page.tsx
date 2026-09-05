import { setRequestLocale } from 'next-intl/server';
import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Artikel' };

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComingSoon title="Artikel & Tips Oleh-Oleh Lombok" note="Blog SEO — Phase 2." />;
}
