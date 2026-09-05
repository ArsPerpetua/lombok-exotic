'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useTransition } from 'react';

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-1">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          disabled={isPending || locale === current}
          onClick={() => startTransition(() => router.replace(pathname, { locale }))}
          className={`rounded px-2 py-1 text-xs uppercase ${
            locale === current ? 'bg-black text-white' : 'text-[var(--color-muted)]'
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
