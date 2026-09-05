import { createHmac } from 'node:crypto';
import type {
  AreaResult,
  CreateShipmentInput,
  CreateShipmentResult,
  RateOption,
  RateQuoteInput,
  ShippingProvider,
  TrackingUpdate,
} from './provider';

const BASE = 'https://api.biteship.com';

function apiKey(): string {
  const key = process.env.BITESHIP_API_KEY;
  if (!key) throw new Error('BITESHIP_API_KEY is not set');
  return key;
}

async function biteshipFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey(),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as T & { success?: boolean; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(`Biteship ${path} failed (${res.status}): ${json.error ?? 'unknown'}`);
  }
  return json;
}

export class BiteshipProvider implements ShippingProvider {
  readonly name = 'biteship';

  async searchAreas(query: string): Promise<AreaResult[]> {
    const json = await biteshipFetch<{ areas: Array<Record<string, string>> }>(
      `/v1/maps/areas?countries=ID&type=single&input=${encodeURIComponent(query)}`,
    );
    return (json.areas ?? []).map((a) => ({
      id: a.id ?? '',
      name: a.name ?? '',
      province: a.administrative_division_level_1_name ?? '',
      city: a.administrative_division_level_2_name ?? '',
      district: a.administrative_division_level_3_name ?? '',
      postalCode: a.postal_code ?? '',
    }));
  }

  async getRates(input: RateQuoteInput): Promise<RateOption[]> {
    const body: Record<string, unknown> = {
      couriers: (input.couriers ?? DEFAULT_COURIERS).join(','),
      items: input.items.map((i) => ({
        name: i.name,
        value: i.valueIdr,
        weight: i.weightGrams,
        quantity: i.quantity,
        length: i.lengthCm,
        width: i.widthCm,
        height: i.heightCm,
      })),
    };
    if (input.originAreaId) body.origin_area_id = input.originAreaId;
    if (input.originPostalCode) body.origin_postal_code = input.originPostalCode;
    if (input.destinationAreaId) body.destination_area_id = input.destinationAreaId;
    if (input.destinationPostalCode) body.destination_postal_code = input.destinationPostalCode;

    const json = await biteshipFetch<{ pricing: Array<Record<string, unknown>> }>(
      '/v1/rates/couriers',
      { method: 'POST', body: JSON.stringify(body) },
    );

    return (json.pricing ?? []).map((p) => ({
      courierCompany: String(p.courier_name ?? ''),
      courierCode: String(p.courier_code ?? ''),
      courierType: String(p.courier_service_code ?? ''),
      serviceName: String(p.courier_service_name ?? ''),
      description: String(p.description ?? ''),
      priceIdr: Number(p.price ?? 0),
      etd: (p.shipment_duration_range as string | undefined) ?? (p.duration as string) ?? null,
    }));
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const body = {
      reference_id: input.orderReference,
      courier_company: input.courierCode,
      courier_type: input.courierType,
      delivery_type: 'now',
      origin_contact_name: input.origin.contactName,
      origin_contact_phone: input.origin.contactPhone,
      origin_address: input.origin.address,
      origin_area_id: input.origin.areaId,
      origin_postal_code: input.origin.postalCode,
      origin_note: input.origin.note,
      destination_contact_name: input.destination.contactName,
      destination_contact_phone: input.destination.contactPhone,
      destination_address: input.destination.address,
      destination_area_id: input.destination.areaId,
      destination_postal_code: input.destination.postalCode,
      destination_note: input.destination.note,
      items: input.items.map((i) => ({
        name: i.name,
        value: i.valueIdr,
        weight: i.weightGrams,
        quantity: i.quantity,
      })),
      note: input.note,
    };

    const json = await biteshipFetch<Record<string, unknown>>('/v1/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const courier = (json.courier ?? {}) as Record<string, unknown>;
    return {
      providerOrderId: String(json.id ?? ''),
      trackingNumber: (courier.waybill_id as string | null) ?? null,
      trackingUrl: (json.tracking_url as string | null) ?? null,
      status: String(json.status ?? 'requested'),
      raw: json,
    };
  }

  async getTracking(providerOrderId: string): Promise<TrackingUpdate> {
    const json = await biteshipFetch<Record<string, unknown>>(
      `/v1/orders/${encodeURIComponent(providerOrderId)}`,
    );
    const courier = (json.courier ?? {}) as Record<string, unknown>;
    const history = (json.history ?? []) as Array<Record<string, unknown>>;
    const last = history.at(-1);
    return {
      status: String(json.status ?? ''),
      note: (last?.note as string | undefined) ?? null,
      eventTime: (last?.updated_at as string | undefined) ?? null,
      trackingNumber: (courier.waybill_id as string | null) ?? null,
      raw: json,
    };
  }

  verifyWebhook(rawBody: unknown, headers: Record<string, string>) {
    const secret = process.env.BITESHIP_WEBHOOK_SECRET;
    const b = (rawBody ?? {}) as Record<string, unknown>;
    let valid = false;
    if (secret) {
      const signature = headers['x-biteship-signature'] ?? headers['biteship-signature'] ?? '';
      const expected = createHmac('sha256', secret)
        .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
        .digest('hex');
      valid = signature.length > 0 && signature === expected;
    }
    const providerOrderId = (b.order_id as string) ?? (b.id as string) ?? null;
    const update: TrackingUpdate | null = providerOrderId
      ? {
          status: String(b.status ?? ''),
          note: (b.note as string | undefined) ?? null,
          eventTime: (b.updated_at as string | undefined) ?? null,
          trackingNumber: (b.waybill_id as string | undefined) ?? null,
          raw: rawBody,
        }
      : null;
    return { valid, providerOrderId, update };
  }
}

// Couriers that reliably serve Lombok (Mataram/Senggigi). Confirm pickup vs
// drop-off with Biteship before launch — see TODOS.md.
const DEFAULT_COURIERS = ['jne', 'sicepat', 'jnt', 'anteraja', 'pos', 'ninja'];
