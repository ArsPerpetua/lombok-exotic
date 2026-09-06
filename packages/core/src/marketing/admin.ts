import { desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { writeAudit } from '../audit';

const { vouchers, banners } = schema;

export interface AdminActor {
  userId: string;
  label: string;
  ip?: string | null;
  userAgent?: string | null;
}

// ── Vouchers ───────────────────────────────────────────────────────────────

export async function listVouchers() {
  return db.select().from(vouchers).orderBy(desc(vouchers.createdAt));
}

export async function getVoucher(id: string) {
  return db.query.vouchers.findFirst({ where: eq(vouchers.id, id) });
}

export interface VoucherInput {
  code: string;
  description?: string | null;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValueIdr?: number | null;
  maxDiscountIdr?: number | null;
  usageLimit?: number | null;
  perCustomerLimit: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
}

export type SaveVoucherResult = { ok: true; id: string } | { ok: false; error: 'code_taken' };

export async function saveVoucher(
  id: string | null,
  input: VoucherInput,
  actor: AdminActor,
): Promise<SaveVoucherResult> {
  const code = input.code.trim().toUpperCase();
  const clash = await db.query.vouchers.findFirst({
    where: id
      ? sql`${vouchers.code} = ${code} and ${vouchers.id} <> ${id}`
      : eq(vouchers.code, code),
    columns: { id: true },
  });
  if (clash) return { ok: false, error: 'code_taken' };

  const values = {
    code,
    description: input.description?.trim() || null,
    discountType: input.discountType,
    discountValue: Math.round(input.discountValue),
    minOrderValueIdr: input.minOrderValueIdr ? Math.round(input.minOrderValueIdr) : null,
    maxDiscountIdr: input.maxDiscountIdr ? Math.round(input.maxDiscountIdr) : null,
    usageLimit: input.usageLimit ? Math.round(input.usageLimit) : null,
    perCustomerLimit: Math.max(1, Math.round(input.perCustomerLimit)),
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
  };

  let vid: string;
  if (id) {
    await db.update(vouchers).set(values).where(eq(vouchers.id, id));
    vid = id;
  } else {
    const [row] = await db.insert(vouchers).values(values).returning({ id: vouchers.id });
    vid = row!.id;
  }
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: id ? 'voucher.update' : 'voucher.create',
    entityType: 'voucher',
    entityId: vid,
    after: { code, discountType: values.discountType, discountValue: values.discountValue },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true, id: vid };
}

export async function toggleVoucher(id: string, isActive: boolean, actor: AdminActor) {
  await db.update(vouchers).set({ isActive }).where(eq(vouchers.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'voucher.toggle',
    entityType: 'voucher',
    entityId: id,
    after: { isActive },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
}

// ── Banners ────────────────────────────────────────────────────────────────

export async function listBanners() {
  return db.select().from(banners).orderBy(banners.position, banners.sortOrder);
}

export async function getBanner(id: string) {
  return db.query.banners.findFirst({ where: eq(banners.id, id) });
}

export interface BannerInput {
  title?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position: 'hero' | 'secondary' | 'promo_bar';
  locale: 'id' | 'en';
  sortOrder: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
}

export async function saveBanner(
  id: string | null,
  input: BannerInput,
  actor: AdminActor,
): Promise<{ ok: true; id: string }> {
  const values = {
    title: input.title?.trim() || null,
    imageUrl: input.imageUrl.trim(),
    linkUrl: input.linkUrl?.trim() || null,
    position: input.position,
    locale: input.locale,
    sortOrder: Math.round(input.sortOrder),
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
  };
  let bid: string;
  if (id) {
    await db.update(banners).set(values).where(eq(banners.id, id));
    bid = id;
  } else {
    const [row] = await db.insert(banners).values(values).returning({ id: banners.id });
    bid = row!.id;
  }
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: id ? 'banner.update' : 'banner.create',
    entityType: 'banner',
    entityId: bid,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true, id: bid };
}

export async function deleteBanner(id: string, actor: AdminActor) {
  await db.delete(banners).where(eq(banners.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'banner.delete',
    entityType: 'banner',
    entityId: id,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
}
