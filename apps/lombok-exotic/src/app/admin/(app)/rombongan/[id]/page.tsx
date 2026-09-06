import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { waMeLink } from '@lombok-exotic/core/email';
import { getGroupPreorder } from '@lombok-exotic/core/groups';
import { requireCapability } from '@/lib/auth-server';
import { GroupControls } from '@/components/admin/group-controls';

export const dynamic = 'force-dynamic';

const STATUS_ID: Record<string, string> = {
  new: 'Baru',
  quoted: 'Ditawar',
  confirmed: 'Dikonfirmasi',
  paid: 'Dibayar',
  fulfilled: 'Selesai',
  cancelled: 'Batal',
};

export default async function AdminGroupPreorderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability('group_preorder:read');
  const { id } = await params;
  const g = await getGroupPreorder(id);
  if (!g) notFound();

  const h = await headers();
  const appUrl = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;
  const wa = waMeLink(
    g.agentPhone,
    `Halo ${g.agentName}, terkait pesanan rombongan ${g.reference}: `,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/rombongan" className="text-sm text-brand hover:underline">
          ← Semua rombongan
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-mono text-xl font-semibold">{g.reference}</h1>
          <span className="rounded border bg-white px-3 py-1 text-sm">
            {STATUS_ID[g.status] ?? g.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 rounded border bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Agen</p>
          <p>{g.agentName}</p>
          <p className="text-[var(--color-muted)]">{g.agentPhone}</p>
          {g.agentEmail && <p className="text-[var(--color-muted)]">{g.agentEmail}</p>}
          {g.companyName && <p className="text-[var(--color-muted)]">{g.companyName}</p>}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand hover:underline">
            Chat WhatsApp →
          </a>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Kedatangan</p>
          <p>
            {new Date(g.arrivalDate).toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {g.arrivalTime ? ` · ${g.arrivalTime}` : ''}
          </p>
          <p className="text-[var(--color-muted)]">{g.headcount} pax</p>
          {g.busInfo && <p className="text-[var(--color-muted)]">Bus: {g.busInfo}</p>}
        </div>
        {g.packageNotes && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Rencana dari agen</p>
            <p className="whitespace-pre-line">{g.packageNotes}</p>
          </div>
        )}
        {g.tourLeader && (
          <div className="sm:col-span-2 text-xs text-[var(--color-muted)]">
            Tour leader: {g.tourLeader.name} ({g.tourLeader.referralCode})
          </div>
        )}
        {g.quoteOrder && (
          <div className="sm:col-span-2">
            <Link
              href={`/admin/pesanan/${g.quoteOrder.orderNumber}`}
              className="text-xs text-brand hover:underline"
            >
              Pesanan terkait: {g.quoteOrder.orderNumber} — {formatIdr(g.quoteOrder.grandTotalIdr)} (
              {g.quoteOrder.status})
            </Link>
          </div>
        )}
      </div>

      <GroupControls
        groupId={g.id}
        allowedTransitions={g.allowedTransitions}
        items={g.items.map((i) => ({
          id: i.id,
          variantId: i.variantId,
          description: i.description,
          quantity: i.quantity,
          unitPriceIdr: i.unitPriceIdr,
          notes: i.notes,
          productName: i.variant?.product?.name ?? null,
        }))}
        itemsTotalIdr={g.itemsTotalIdr}
        hasQuote={Boolean(g.quoteOrderId)}
        quoteOrderNumber={g.quoteOrder?.orderNumber ?? null}
        staff={g.staff}
        assignedTo={g.assignedTo}
        internalNotes={g.internalNotes}
        appUrl={appUrl}
      />
    </div>
  );
}
