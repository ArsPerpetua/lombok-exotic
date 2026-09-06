'use server';

import { db, schema } from '@lombok-exotic/core/db';
import { groupPreorderReference } from '@lombok-exotic/core';
import { queueNotification } from '@lombok-exotic/core/notifications';
import { groupPreorderInput, toWaDigits } from '@/lib/validators';

export type GroupPreorderState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> }
  | { status: 'success'; reference: string };

export async function submitGroupPreorder(
  _prev: GroupPreorderState,
  formData: FormData,
): Promise<GroupPreorderState> {
  const parsed = groupPreorderInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Periksa kembali isian formulir.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const input = parsed.data;
  const reference = groupPreorderReference();

  try {
    await db.insert(schema.groupPreorders).values({
      reference,
      status: 'new',
      agentName: input.agentName,
      agentPhone: toWaDigits(input.agentPhone),
      agentEmail: input.agentEmail || null,
      companyName: input.companyName || null,
      arrivalDate: input.arrivalDate,
      arrivalTime: input.arrivalTime || null,
      headcount: input.headcount,
      busInfo: input.busInfo || null,
      packageNotes: input.packageNotes || null,
    });

    // Best-effort: outbox row for staff. Never block the customer on it.
    try {
      await queueNotification(db, {
        templateKey: 'group_preorder.new_internal',
        recipient: 'admin',
        payload: { reference },
        entityType: 'group_preorder',
      });
    } catch (err) {
      console.warn('[group-preorder] queue notification failed:', err);
    }

    return { status: 'success', reference };
  } catch (err) {
    console.error('[group-preorder] insert failed:', err);
    return {
      status: 'error',
      message:
        'Gagal menyimpan permintaan. Coba lagi atau hubungi kami lewat WhatsApp. (Pastikan database sudah dimigrasi.)',
    };
  }
}
