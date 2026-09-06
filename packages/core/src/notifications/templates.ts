import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { formatIdr } from '../money';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

type Payload = Record<string, unknown>;

/**
 * Render a transactional email for a notification row. Returns null when the
 * template key is unknown or the referenced entity is gone (the worker then
 * marks the row `skipped`).
 */
export async function renderEmail(
  templateKey: string,
  payload: Payload,
): Promise<RenderedEmail | null> {
  const orderNumber = String(payload.orderNumber ?? '');

  switch (templateKey) {
    case 'order.paid': {
      const o = await loadOrder(orderNumber);
      if (!o) return null;
      const lines = o.items
        .map((i) => `- ${i.productName} (${i.variantName}) ×${i.quantity} — ${formatIdr(i.lineTotalIdr)}`)
        .join('\n');
      return wrap({
        subject: `Pembayaran diterima — ${o.orderNumber}`,
        heading: 'Pembayaran diterima 🎉',
        body: `Terima kasih! Pembayaran untuk pesanan <strong>${o.orderNumber}</strong> sudah kami terima. Pesanan kamu segera kami siapkan.`,
        details: [
          ['Total', formatIdr(o.grandTotalIdr)],
          ['Kurir', o.shippingSelection?.courierCompany ?? '—'],
        ],
        pre: lines,
        orderNumber: o.orderNumber,
      });
    }

    case 'order.shipped': {
      const o = await loadOrder(orderNumber);
      if (!o) return null;
      const resi = String(payload.trackingNumber ?? o.shipmentTracking ?? '');
      return wrap({
        subject: `Pesanan dikirim — ${o.orderNumber}`,
        heading: 'Pesanan kamu sudah dikirim 🚚',
        body: `Pesanan <strong>${o.orderNumber}</strong> sudah diserahkan ke kurir.`,
        details: [
          ['Kurir', o.shipmentCourier ?? o.shippingSelection?.courierCompany ?? '—'],
          ['No. Resi', resi || '—'],
        ],
        orderNumber: o.orderNumber,
      });
    }

    case 'order.received': {
      const o = await loadOrder(orderNumber);
      if (!o) return null;
      return wrap({
        subject: `Pesanan diterima — ${o.orderNumber}`,
        heading: 'Pesanan kamu sudah kami terima',
        body: `Pesanan <strong>${o.orderNumber}</strong> menunggu pembayaran. Selesaikan pembayaran agar kami bisa memprosesnya.`,
        details: [['Total', formatIdr(o.grandTotalIdr)]],
        orderNumber: o.orderNumber,
      });
    }

    // Admin-facing alerts.
    case 'order.payment_amount_mismatch':
      return adminAlert(
        `⚠️ Nominal bayar tidak cocok — ${orderNumber}`,
        `Pesanan ${orderNumber}: nominal pembayaran dari provider tidak sama dengan tagihan. Pesanan DITAHAN, cek manual di dashboard.`,
      );
    case 'order.oversold_needs_restock':
      return adminAlert(
        `⚠️ Stok kurang — ${orderNumber}`,
        `Pesanan ${orderNumber} dibayar tapi stok tidak mencukupi. Restock atau hubungi pembeli.`,
      );
    case 'group_preorder.new_internal':
      return adminAlert(
        `Permintaan rombongan baru — ${payload.reference ?? ''}`,
        `Ada permintaan pesanan rombongan baru (${payload.reference ?? ''}). Buka /admin untuk menindaklanjuti.`,
      );

    case 'group_preorder.quote': {
      const o = await loadOrder(String(payload.orderNumber ?? ''));
      const pay = payload.redirectUrl ? `<p><a href="${payload.redirectUrl}">Bayar sekarang →</a></p>` : '';
      return {
        subject: `Penawaran pesanan rombongan — ${payload.reference ?? ''}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#c81e1e">Penawaran pesanan rombongan</h2>
  <p>Terima kasih. Berikut penawaran untuk permintaan <strong>${payload.reference ?? ''}</strong>.</p>
  ${o ? `<p>Nomor pesanan: <strong>${o.orderNumber}</strong><br>Total: <strong>${formatIdr(o.grandTotalIdr)}</strong></p>` : ''}
  ${pay}
  <p style="color:#6b7280;font-size:13px">Paket akan disiapkan sesuai jadwal kedatangan. Lombok Exotic.</p>
</div>`,
        text: `Penawaran pesanan rombongan ${payload.reference ?? ''}. ${o ? `Nomor pesanan ${o.orderNumber}, total ${formatIdr(o.grandTotalIdr)}.` : ''} ${payload.redirectUrl ?? ''}`,
      };
    }

    default:
      return null;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

async function loadOrder(orderNumber: string) {
  if (!orderNumber) return null;
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber),
    with: {
      items: true,
      shipments: { orderBy: [schema.shipments.createdAt], limit: 1 },
    },
  });
  if (!o) return null;
  return {
    orderNumber: o.orderNumber,
    grandTotalIdr: o.grandTotalIdr,
    shippingSelection: o.shippingSelection,
    items: o.items,
    shipmentCourier: o.shipments[0]?.courierCompany ?? null,
    shipmentTracking: o.shipments[0]?.trackingNumber ?? null,
  };
}

function wrap(o: {
  subject: string;
  heading: string;
  body: string;
  details?: Array<[string, string]>;
  pre?: string;
  orderNumber: string;
}): RenderedEmail {
  const rows = (o.details ?? [])
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${k}</td><td style="padding:4px 0"><strong>${v}</strong></td></tr>`)
    .join('');
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#c81e1e">${o.heading}</h2>
  <p>${o.body}</p>
  ${rows ? `<table style="margin:12px 0">${rows}</table>` : ''}
  ${o.pre ? `<pre style="background:#f4f4f5;padding:12px;border-radius:6px;white-space:pre-wrap">${o.pre}</pre>` : ''}
  <p style="color:#6b7280;font-size:13px">Lacak pesanan kapan saja dengan nomor pesanan + nomor WhatsApp kamu.</p>
  <p style="color:#6b7280;font-size:13px">Lombok Exotic — Oleh-Oleh, Cafe Resto &amp; Bajang Bus</p>
</div>`;
  const text = `${o.heading}\n\n${o.body.replace(/<[^>]+>/g, '')}\n${(o.details ?? [])
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}${o.pre ? `\n\n${o.pre}` : ''}`;
  return { subject: o.subject, html, text };
}

function adminAlert(subject: string, body: string): RenderedEmail {
  return {
    subject,
    html: `<div style="font-family:system-ui,sans-serif"><p>${body}</p></div>`,
    text: body,
  };
}
