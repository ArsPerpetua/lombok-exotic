import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { discountAmount } from '../money';

const { tourLeaders, commissions, orders, groupPreorders } = schema;

/**
 * Order statuses that count as "money in" for attribution / commission
 * projection. `pending_payment` and `cancelled`/`refunded` are excluded.
 */
export const ATTRIBUTED_ORDER_STATUSES = ['paid', 'processing', 'shipped', 'completed'] as const;

export interface TourLeaderSummary {
  id: string;
  name: string;
  phone: string;
  agencyName: string | null;
  referralCode: string;
  commissionType: 'percent' | 'fixed';
  commissionValue: number;
  isActive: boolean;
  orderCount: number;
  attributedRevenueIdr: number;
  /** Projected commission on attributed revenue at the current rate. */
  projectedCommissionIdr: number;
}

function projectCommission(
  base: number,
  type: 'percent' | 'fixed',
  value: number,
): number {
  if (base <= 0) return 0;
  return discountAmount(base, type, value);
}

// ── Listing ────────────────────────────────────────────────────────────────

export async function listTourLeaders(): Promise<TourLeaderSummary[]> {
  const leaders = await db
    .select()
    .from(tourLeaders)
    .orderBy(desc(tourLeaders.isActive), desc(tourLeaders.createdAt));
  if (leaders.length === 0) return [];

  const agg = await db
    .select({
      tourLeaderId: orders.tourLeaderId,
      orderCount: sql<number>`count(*)`.mapWith(Number),
      revenueIdr: sql<number>`coalesce(sum(${orders.grandTotalIdr}), 0)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.tourLeaderId),
        inArray(orders.status, [...ATTRIBUTED_ORDER_STATUSES]),
      ),
    )
    .groupBy(orders.tourLeaderId);
  const aggById = new Map(agg.map((a) => [a.tourLeaderId, a]));

  return leaders.map((l) => {
    const a = aggById.get(l.id);
    const revenue = a?.revenueIdr ?? 0;
    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      agencyName: l.agencyName,
      referralCode: l.referralCode,
      commissionType: l.commissionType,
      commissionValue: l.commissionValue,
      isActive: l.isActive,
      orderCount: a?.orderCount ?? 0,
      attributedRevenueIdr: revenue,
      projectedCommissionIdr: projectCommission(revenue, l.commissionType, l.commissionValue),
    };
  });
}

// ── Detail ─────────────────────────────────────────────────────────────────

export interface TourLeaderDetail extends TourLeaderSummary {
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  notes: string | null;
  createdAt: Date;
  attributedOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    channel: string;
    grandTotalIdr: number;
    placedAt: Date | null;
  }>;
  groupPreorders: Array<{
    id: string;
    reference: string;
    status: string;
    arrivalDate: string;
    headcount: number;
    estimatedValueIdr: number | null;
  }>;
  commissionByPeriod: Array<{
    period: string;
    accruedIdr: number;
    paidIdr: number;
    rows: number;
  }>;
}

export async function getTourLeader(id: string): Promise<TourLeaderDetail | null> {
  const l = await db.query.tourLeaders.findFirst({ where: eq(tourLeaders.id, id) });
  if (!l) return null;

  const attributedOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      channel: orders.channel,
      grandTotalIdr: orders.grandTotalIdr,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(eq(orders.tourLeaderId, id))
    .orderBy(desc(orders.placedAt));

  const groups = await db
    .select({
      id: groupPreorders.id,
      reference: groupPreorders.reference,
      status: groupPreorders.status,
      arrivalDate: groupPreorders.arrivalDate,
      headcount: groupPreorders.headcount,
      estimatedValueIdr: groupPreorders.estimatedValueIdr,
    })
    .from(groupPreorders)
    .where(eq(groupPreorders.tourLeaderId, id))
    .orderBy(desc(groupPreorders.arrivalDate));

  const periodRows = await db
    .select({
      period: commissions.period,
      accruedIdr: sql<number>`coalesce(sum(${commissions.commissionAmountIdr}) filter (where ${commissions.status} in ('accrued', 'approved')), 0)`.mapWith(
        Number,
      ),
      paidIdr: sql<number>`coalesce(sum(${commissions.commissionAmountIdr}) filter (where ${commissions.status} = 'paid'), 0)`.mapWith(
        Number,
      ),
      rows: sql<number>`count(*)`.mapWith(Number),
    })
    .from(commissions)
    .where(eq(commissions.tourLeaderId, id))
    .groupBy(commissions.period)
    .orderBy(desc(commissions.period));

  const revenue = attributedOrders
    .filter((o) => (ATTRIBUTED_ORDER_STATUSES as readonly string[]).includes(o.status))
    .reduce((n, o) => n + o.grandTotalIdr, 0);

  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    agencyName: l.agencyName,
    referralCode: l.referralCode,
    commissionType: l.commissionType,
    commissionValue: l.commissionValue,
    isActive: l.isActive,
    bankName: l.bankName,
    bankAccount: l.bankAccount,
    bankHolder: l.bankHolder,
    notes: l.notes,
    createdAt: l.createdAt,
    orderCount: attributedOrders.filter((o) =>
      (ATTRIBUTED_ORDER_STATUSES as readonly string[]).includes(o.status),
    ).length,
    attributedRevenueIdr: revenue,
    projectedCommissionIdr: projectCommission(revenue, l.commissionType, l.commissionValue),
    attributedOrders,
    groupPreorders: groups,
    commissionByPeriod: periodRows,
  };
}

/** The link a referral QR encodes. `?ref=` capture activates in Phase 2. */
export function referralUrl(baseUrl: string, code: string, locale = 'id'): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${locale}?ref=${encodeURIComponent(code)}`;
}
