import 'server-only';
import QRCode from 'qrcode';

/**
 * Render `text` as an inline SVG QR code (string of `<svg>…</svg>` markup).
 * Server-only — call from RSCs and drop the result into `dangerouslySetInnerHTML`.
 */
export function qrSvg(text: string, size = 200): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    width: size,
    errorCorrectionLevel: 'M',
  });
}
