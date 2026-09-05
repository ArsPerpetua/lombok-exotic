'use client';

import { useActionState } from 'react';
import {
  submitGroupPreorder,
  type GroupPreorderState,
} from '@/app/[locale]/pesanan-rombongan/actions';

const initial: GroupPreorderState = { status: 'idle' };

function Field({
  label,
  name,
  type = 'text',
  required,
  errors,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  errors?: string[];
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded border px-3 py-2 text-sm"
        {...rest}
      />
      {errors?.map((e) => (
        <span key={e} className="mt-1 block text-xs text-brand">
          {e}
        </span>
      ))}
    </label>
  );
}

export function GroupPreorderForm() {
  const [state, formAction, pending] = useActionState(submitGroupPreorder, initial);

  if (state.status === 'success') {
    return (
      <div className="rounded border border-green-600 bg-green-50 p-6">
        <p className="font-medium text-green-800">Permintaan terkirim.</p>
        <p className="mt-1 text-sm text-green-700">
          Nomor referensi: <strong>{state.reference}</strong>. Tim kami akan menghubungi lewat
          WhatsApp untuk konfirmasi paket & harga.
        </p>
      </div>
    );
  }

  const fe = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {state.status === 'error' && (
        <p className="rounded border border-brand bg-red-50 p-3 text-sm text-brand">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Tour Leader / Agen" name="agentName" required errors={fe?.agentName} />
        <Field
          label="Nomor WhatsApp"
          name="agentPhone"
          required
          placeholder="08123456789"
          errors={fe?.agentPhone}
        />
        <Field label="Email (opsional)" name="agentEmail" type="email" errors={fe?.agentEmail} />
        <Field label="Nama Perusahaan (opsional)" name="companyName" errors={fe?.companyName} />
        <Field
          label="Tanggal Kedatangan"
          name="arrivalDate"
          type="date"
          required
          errors={fe?.arrivalDate}
        />
        <Field label="Perkiraan Jam" name="arrivalTime" type="time" errors={fe?.arrivalTime} />
        <Field
          label="Jumlah Orang"
          name="headcount"
          type="number"
          min={1}
          required
          errors={fe?.headcount}
        />
        <Field label="Info Bus / Plat (opsional)" name="busInfo" errors={fe?.busInfo} />
      </div>
      <label className="block">
        <span className="text-sm font-medium">Rencana Paket / Catatan</span>
        <textarea
          name="packageNotes"
          rows={4}
          placeholder="Contoh: 30 paket @ Rp150.000 isi kopi + kaos + gantungan kunci"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand px-6 py-3 font-medium text-brand-foreground disabled:opacity-60"
      >
        {pending ? 'Mengirim…' : 'Kirim Permintaan'}
      </button>
    </form>
  );
}
