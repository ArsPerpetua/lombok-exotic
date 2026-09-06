'use client';

export function PrintButton({ label = 'Cetak / Simpan PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-brand px-4 py-2 text-sm font-medium text-brand-foreground print:hidden"
    >
      {label}
    </button>
  );
}
