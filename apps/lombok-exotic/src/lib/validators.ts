import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^(\+?62|0)\d{8,13}$/, 'Nomor WhatsApp tidak valid (contoh: 08123456789)');

export const groupPreorderInput = z.object({
  agentName: z.string().trim().min(2, 'Nama wajib diisi').max(120),
  agentPhone: phone,
  agentEmail: z.string().trim().email('Email tidak valid').optional().or(z.literal('')),
  companyName: z.string().trim().max(160).optional().or(z.literal('')),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal kedatangan wajib diisi'),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format jam salah')
    .optional()
    .or(z.literal('')),
  headcount: z.coerce.number().int().min(1, 'Minimal 1 orang').max(500),
  busInfo: z.string().trim().max(300).optional().or(z.literal('')),
  packageNotes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type GroupPreorderInput = z.infer<typeof groupPreorderInput>;

/** Normalise 08xx / +62xx to 62xx digits for storage + wa.me. */
export function toWaDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}
