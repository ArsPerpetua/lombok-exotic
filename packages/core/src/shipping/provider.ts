import type { Idr } from '../money';

/**
 * Shipping abstraction. App code imports only this; Biteship lives behind it
 * so a different aggregator (or a second client's choice) is one file.
 */

export interface RateQuoteItem {
  name: string;
  quantity: number;
  weightGrams: number;
  valueIdr: Idr;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface RateQuoteInput {
  originAreaId?: string;
  originPostalCode?: string;
  destinationAreaId?: string;
  destinationPostalCode?: string;
  items: RateQuoteItem[];
  /** Restrict to these courier codes (e.g. ['jne','sicepat','jnt']). */
  couriers?: string[];
}

export interface RateOption {
  courierCompany: string;
  courierCode: string;
  courierType: string;
  serviceName: string;
  description: string;
  priceIdr: Idr;
  etd: string | null;
}

export interface AreaResult {
  id: string;
  name: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
}

export interface CreateShipmentInput {
  orderReference: string;
  courierCode: string;
  courierType: string;
  origin: ShipmentParty;
  destination: ShipmentParty;
  items: RateQuoteItem[];
  note?: string;
}

export interface ShipmentParty {
  contactName: string;
  contactPhone: string;
  address: string;
  areaId?: string;
  postalCode?: string;
  note?: string;
}

export interface CreateShipmentResult {
  providerOrderId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  raw: unknown;
}

export interface TrackingUpdate {
  status: string;
  note: string | null;
  eventTime: string | null;
  trackingNumber: string | null;
  raw: unknown;
}

export interface ShippingProvider {
  readonly name: string;
  searchAreas(query: string): Promise<AreaResult[]>;
  getRates(input: RateQuoteInput): Promise<RateOption[]>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  getTracking(providerOrderId: string): Promise<TrackingUpdate>;
  /** Verify + normalize a raw webhook body. Never throws on bad signature. */
  verifyWebhook(rawBody: unknown, headers: Record<string, string>): {
    valid: boolean;
    providerOrderId: string | null;
    update: TrackingUpdate | null;
  };
}
