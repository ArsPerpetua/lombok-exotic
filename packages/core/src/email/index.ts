import { Resend } from 'resend';

/**
 * Transactional email via Resend. This is the reliable notification channel
 * for MVP; WhatsApp Cloud API is added as a second channel in Phase 2 behind
 * the same notification outbox (see db/schema/notifications.ts).
 */

let client: Resend | null = null;

function resend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    client = new Resend(key);
  }
  return client;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  id: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('EMAIL_FROM is not set');

  const { data, error } = await resend().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  if (error || !data) {
    throw new Error(`Resend send failed: ${error?.message ?? 'no data returned'}`);
  }
  return { id: data.id };
}

/**
 * wa.me deep link — the MVP WhatsApp fallback. Renders a tap-to-send link the
 * customer or an admin uses; no API, no Meta onboarding.
 */
export function waMeLink(phoneE164Digits: string, message: string): string {
  const num = phoneE164Digits.replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
