import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVoucher } from '@lombok-exotic/core/marketing';
import { requireCapability } from '@/lib/auth-server';
import { VoucherForm } from '@/components/admin/voucher-form';

export const dynamic = 'force-dynamic';

export default async function AdminVoucherEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability('marketing:write');
  const { id } = await params;
  const isNew = id === 'baru';
  const voucher = isNew ? null : await getVoucher(id);
  if (!isNew && !voucher) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/voucher" className="text-sm text-brand hover:underline">
        ← Semua voucher
      </Link>
      <h1 className="text-xl font-semibold">{isNew ? 'Voucher Baru' : voucher!.code}</h1>
      <VoucherForm
        voucher={
          voucher
            ? {
                id: voucher.id,
                code: voucher.code,
                description: voucher.description,
                discountType: voucher.discountType,
                discountValue: voucher.discountValue,
                minOrderValueIdr: voucher.minOrderValueIdr,
                maxDiscountIdr: voucher.maxDiscountIdr,
                usageLimit: voucher.usageLimit,
                perCustomerLimit: voucher.perCustomerLimit,
                startsAt: voucher.startsAt,
                endsAt: voucher.endsAt,
                isActive: voucher.isActive,
              }
            : null
        }
      />
    </div>
  );
}
