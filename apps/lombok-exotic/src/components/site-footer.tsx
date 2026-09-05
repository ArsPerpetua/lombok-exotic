import { getTranslations } from 'next-intl/server';
import { clientConfig } from '../../client.config';
import { tr } from '@lombok-exotic/core/config';

export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-black text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm">
        <p className="font-display text-lg text-brand">{clientConfig.name}</p>
        <p className="mt-1">{tr(clientConfig.tagline, locale)}</p>
        {clientConfig.contact.addressLine && (
          <p className="mt-3">{clientConfig.contact.addressLine}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {clientConfig.businessUnits.map((u) => (
            <span key={u.key} className="rounded border border-white/20 px-2 py-1 text-xs">
              {tr(u.label, locale)}
            </span>
          ))}
        </div>
        <p className="mt-6 text-xs">
          &copy; {year} {clientConfig.legalName ?? clientConfig.name}. {t('rights')}
        </p>
        <p className="mt-1 text-xs">{t('hkiNote')}</p>
      </div>
    </footer>
  );
}
