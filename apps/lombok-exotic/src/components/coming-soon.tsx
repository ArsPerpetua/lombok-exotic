import { Link } from '@/i18n/navigation';

export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 text-[var(--color-muted)]">
        {note ?? 'Halaman ini sedang dibangun untuk demo pitching. / Under construction.'}
      </p>
      <Link href="/" className="mt-8 inline-block rounded bg-brand px-5 py-2 text-brand-foreground">
        &larr; Home
      </Link>
    </div>
  );
}
