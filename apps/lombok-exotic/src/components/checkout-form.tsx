'use client';

import { useCallback, useRef, useState } from 'react';
import { formatIdr } from '@lombok-exotic/core/money';
import { useRouter } from '@/i18n/navigation';

interface Area {
  id: string;
  name: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
}
interface Rate {
  courierCompany: string;
  courierType: string;
  serviceName: string;
  description: string;
  etd: string | null;
  priceIdr: number;
}

export interface CheckoutLabels {
  contact: string;
  name: string;
  phone: string;
  email: string;
  emailOptional: string;
  shippingAddress: string;
  recipient: string;
  searchArea: string;
  searchAreaHint: string;
  searching: string;
  noAreas: string;
  useManual: string;
  useSearch: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  addressLine: string;
  addressLinePlaceholder: string;
  notes: string;
  calcShipping: string;
  calculating: string;
  ratesFailed: string;
  chooseCourier: string;
  order: string;
  subtotal: string;
  shipping: string;
  total: string;
  payNow: string;
  preparing: string;
  errorGeneric: string;
  errorStock: string;
  errorShippingChanged: string;
  errorCartEmpty: string;
  required: string;
}

interface Props {
  subtotalIdr: number;
  locale: 'id' | 'en';
  labels: CheckoutLabels;
}

const DEBOUNCE_MS = 300;

export function CheckoutForm({ subtotalIdr, locale, labels: t }: Props) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  const [manual, setManual] = useState(false);
  const [areaQuery, setAreaQuery] = useState('');
  const [areaResults, setAreaResults] = useState<Area[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [area, setArea] = useState<Area | null>(null);

  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');

  const [rates, setRates] = useState<Rate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rate, setRate] = useState<Rate | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetShipping = useCallback(() => {
    setRates([]);
    setRate(null);
  }, []);

  function searchAreas(q: string) {
    setAreaQuery(q);
    setArea(null);
    resetShipping();
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 3) {
      setAreaResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setAreaLoading(true);
      try {
        const res = await fetch(`/api/shipping/areas?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { areas?: Area[] };
        setAreaResults(json.areas ?? []);
      } catch {
        setAreaResults([]);
      } finally {
        setAreaLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function pickArea(a: Area) {
    setArea(a);
    setAreaResults([]);
    setAreaQuery(a.name);
    setProvince(a.province);
    setCity(a.city);
    setDistrict(a.district);
    if (a.postalCode) setPostalCode(a.postalCode);
    resetShipping();
  }

  const destinationReady = manual
    ? /^\d{5}$/.test(postalCode) && province.trim() && city.trim()
    : Boolean(area);

  async function calcShipping() {
    if (!destinationReady) return;
    setError(null);
    setRatesLoading(true);
    setRates([]);
    setRate(null);
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          manual ? { destinationPostalCode: postalCode } : { destinationAreaId: area?.id },
        ),
      });
      const json = (await res.json()) as { rates?: Rate[]; error?: string };
      if (!res.ok || !json.rates?.length) {
        setError(t.ratesFailed);
        return;
      }
      setRates(json.rates);
    } catch {
      setError(t.ratesFailed);
    } finally {
      setRatesLoading(false);
    }
  }

  const canSubmit =
    !submitting &&
    name.trim().length >= 2 &&
    phone.trim().length >= 8 &&
    recipientName.trim().length >= 2 &&
    addressLine.trim().length >= 6 &&
    province.trim() &&
    city.trim() &&
    rate != null;

  async function submit() {
    if (!canSubmit || !rate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contact: { name, phone, email },
          address: {
            recipientName,
            phone,
            province,
            city,
            district,
            postalCode,
            addressLine,
            areaId: manual ? '' : (area?.id ?? ''),
            notes,
          },
          shipping: {
            courierCompany: rate.courierCompany,
            courierType: rate.courierType,
            serviceName: rate.serviceName,
            etd: rate.etd,
            priceIdr: rate.priceIdr,
          },
          customerNote: notes,
          locale,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        redirectUrl?: string;
        newShipping?: Rate;
      };
      if (json.ok && json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }
      if (json.error === 'shipping_price_changed' && json.newShipping) {
        setRate(json.newShipping);
        setRates((rs) =>
          rs.map((r) =>
            r.courierCompany === json.newShipping!.courierCompany &&
            r.courierType === json.newShipping!.courierType
              ? json.newShipping!
              : r,
          ),
        );
        setError(t.errorShippingChanged);
      } else if (json.error === 'stock_unavailable') {
        setError(t.errorStock);
      } else if (json.error === 'cart_empty' || json.error === 'cart_converted') {
        setError(t.errorCartEmpty);
        router.push('/keranjang');
      } else {
        setError(t.errorGeneric);
      }
      setSubmitting(false);
    } catch {
      setError(t.errorGeneric);
      setSubmitting(false);
    }
  }

  const shippingIdr = rate?.priceIdr ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        {error && (
          <p className="rounded border border-brand bg-red-50 p-3 text-sm text-brand">{error}</p>
        )}

        <section>
          <h2 className="text-lg font-semibold">{t.contact}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={t.name} value={name} onChange={setName} required requiredLabel={t.required} />
            <Field
              label={t.phone}
              value={phone}
              onChange={setPhone}
              required
              requiredLabel={t.required}
              type="tel"
              inputMode="tel"
              placeholder="08123456789"
            />
            <Field
              label={`${t.email} ${t.emailOptional}`}
              value={email}
              onChange={setEmail}
              type="email"
              inputMode="email"
              className="sm:col-span-2"
            />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.shippingAddress}</h2>
            <button
              type="button"
              onClick={() => {
                setManual((m) => !m);
                setArea(null);
                setAreaResults([]);
                resetShipping();
              }}
              className="text-xs text-[var(--color-muted)] underline hover:text-brand"
            >
              {manual ? t.useSearch : t.useManual}
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label={t.recipient}
              value={recipientName}
              onChange={setRecipientName}
              required
              requiredLabel={t.required}
              className="sm:col-span-2"
            />

            {!manual ? (
              <div className="relative sm:col-span-2">
                <Field
                  label={t.searchArea}
                  value={areaQuery}
                  onChange={searchAreas}
                  placeholder={t.searchAreaHint}
                />
                {areaLoading && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{t.searching}</p>
                )}
                {!areaLoading && areaQuery.trim().length >= 3 && areaResults.length === 0 && !area && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {t.noAreas}{' '}
                    <button
                      type="button"
                      onClick={() => setManual(true)}
                      className="underline hover:text-brand"
                    >
                      {t.useManual}
                    </button>
                  </p>
                )}
                {areaResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded border bg-[var(--color-bg,#fff)] shadow">
                    {areaResults.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => pickArea(a)}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
                        >
                          {a.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                <Field label={t.province} value={province} onChange={(v) => { setProvince(v); resetShipping(); }} required requiredLabel={t.required} />
                <Field label={t.city} value={city} onChange={(v) => { setCity(v); resetShipping(); }} required requiredLabel={t.required} />
                <Field label={t.district} value={district} onChange={(v) => { setDistrict(v); resetShipping(); }} />
                <Field
                  label={t.postalCode}
                  value={postalCode}
                  onChange={(v) => { setPostalCode(v.replace(/\D/g, '').slice(0, 5)); resetShipping(); }}
                  inputMode="numeric"
                  required
                  requiredLabel={t.required}
                />
              </>
            )}

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">
                {t.addressLine}
                <span className="text-brand"> *</span>
              </span>
              <textarea
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                rows={2}
                placeholder={t.addressLinePlaceholder}
                className="mt-1 w-full rounded border px-3 py-2 text-base"
              />
            </label>
            <Field label={t.notes} value={notes} onChange={setNotes} className="sm:col-span-2" />
          </div>

          <button
            type="button"
            onClick={calcShipping}
            disabled={!destinationReady || ratesLoading}
            className="mt-4 rounded border border-brand px-4 py-2 text-sm font-medium text-brand disabled:opacity-40"
          >
            {ratesLoading ? t.calculating : t.calcShipping}
          </button>

          {rates.length > 0 && (
            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-medium">{t.chooseCourier}</legend>
              {rates.map((r) => {
                const id = `${r.courierCompany}-${r.courierType}`;
                const checked = rate?.courierCompany === r.courierCompany && rate?.courierType === r.courierType;
                return (
                  <label
                    key={id}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded border p-3 text-sm ${
                      checked ? 'border-brand bg-brand/5' : ''
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="rate"
                        checked={checked}
                        onChange={() => setRate(r)}
                      />
                      <span>
                        <span className="font-medium">
                          {r.courierCompany} — {r.serviceName}
                        </span>
                        {r.etd && (
                          <span className="block text-xs text-[var(--color-muted)]">{r.etd}</span>
                        )}
                      </span>
                    </span>
                    <span className="font-medium">{formatIdr(r.priceIdr)}</span>
                  </label>
                );
              })}
            </fieldset>
          )}
        </section>
      </div>

      <aside className="h-max rounded border p-5">
        <dl className="space-y-2 text-sm">
          <Row label={t.subtotal} value={formatIdr(subtotalIdr)} />
          <Row label={t.shipping} value={rate ? formatIdr(shippingIdr) : '—'} />
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>{t.total}</dt>
            <dd>{formatIdr(subtotalIdr + shippingIdr)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded bg-brand px-5 py-3 font-medium text-brand-foreground disabled:opacity-50"
        >
          {t.payNow}
        </button>
      </aside>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white">
          <p className="text-sm">{t.preparing}</p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  placeholder,
  required,
  requiredLabel,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  placeholder?: string;
  required?: boolean;
  requiredLabel?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-brand" title={requiredLabel}> *</span>}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border px-3 py-2 text-base"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
