import type {
  AreaResult,
  CreateShipmentInput,
  CreateShipmentResult,
  RateOption,
  RateQuoteInput,
  ShippingProvider,
  TrackingUpdate,
} from './provider';

/**
 * Stand-in shipping provider for local dev / phase 3.2a, before
 * `STORE_ORIGIN_AREA_ID` is confirmed with Biteship. Same `ShippingProvider`
 * contract. Rates are a plausible function of total weight so the checkout UI
 * and `createCheckout`'s server-side re-quote are exercised for real.
 *
 * Enable with `SHIPPING_PROVIDER=fake`. Never resolves in production.
 */
export class FakeShippingProvider implements ShippingProvider {
  readonly name = 'fake';

  async searchAreas(query: string): Promise<AreaResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    return FAKE_AREAS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.district.toLowerCase().includes(q),
    ).slice(0, 8);
  }

  async getRates(input: RateQuoteInput): Promise<RateOption[]> {
    const grams = input.items.reduce((n, i) => n + i.weightGrams * i.quantity, 0);
    const kg = Math.max(1, Math.ceil(grams / 1000));
    const mk = (
      company: string,
      code: string,
      type: string,
      service: string,
      perKg: number,
      etd: string,
    ): RateOption => ({
      courierCompany: company,
      courierCode: code,
      courierType: type,
      serviceName: service,
      description: `${service} (simulasi)`,
      priceIdr: perKg * kg,
      etd,
    });
    return [
      mk('JNE', 'jne', 'REG', 'Reguler', 11000, '2-3 hari'),
      mk('J&T', 'jnt', 'EZ', 'Ekonomi', 10000, '3-4 hari'),
      mk('SiCepat', 'sicepat', 'BEST', 'Besok Sampai', 19000, '1-2 hari'),
    ];
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    return {
      providerOrderId: `fake-shp-${input.orderReference}`,
      trackingNumber: null,
      trackingUrl: null,
      status: 'requested',
      raw: { fake: true },
    };
  }

  async getTracking(providerOrderId: string): Promise<TrackingUpdate> {
    return {
      status: 'requested',
      note: null,
      eventTime: null,
      trackingNumber: null,
      raw: { fake: true, providerOrderId },
    };
  }

  verifyWebhook() {
    return { valid: false, providerOrderId: null, update: null };
  }
}

const FAKE_AREAS: AreaResult[] = [
  {
    id: 'fake-area-mataram',
    name: 'Mataram, Cakranegara, Nusa Tenggara Barat',
    province: 'Nusa Tenggara Barat',
    city: 'Mataram',
    district: 'Cakranegara',
    postalCode: '83239',
  },
  {
    id: 'fake-area-senggigi',
    name: 'Batu Layar, Senggigi, Nusa Tenggara Barat',
    province: 'Nusa Tenggara Barat',
    city: 'Lombok Barat',
    district: 'Batu Layar',
    postalCode: '83355',
  },
  {
    id: 'fake-area-denpasar',
    name: 'Denpasar Selatan, Bali',
    province: 'Bali',
    city: 'Denpasar',
    district: 'Denpasar Selatan',
    postalCode: '80221',
  },
  {
    id: 'fake-area-jakarta',
    name: 'Kebayoran Baru, Jakarta Selatan',
    province: 'DKI Jakarta',
    city: 'Jakarta Selatan',
    district: 'Kebayoran Baru',
    postalCode: '12110',
  },
  {
    id: 'fake-area-surabaya',
    name: 'Gubeng, Surabaya, Jawa Timur',
    province: 'Jawa Timur',
    city: 'Surabaya',
    district: 'Gubeng',
    postalCode: '60281',
  },
  {
    id: 'fake-area-bandung',
    name: 'Coblong, Bandung, Jawa Barat',
    province: 'Jawa Barat',
    city: 'Bandung',
    district: 'Coblong',
    postalCode: '40132',
  },
];
