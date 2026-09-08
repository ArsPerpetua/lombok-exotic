/**
 * Sasak tenun ikat lattice — the brand signature (see DESIGN.md).
 * A thin decorative divider; use at the hero base, section breaks, footer.
 * Purely presentational, hidden from assistive tech.
 */
export function IkatBand({ tall = false, className = '' }: { tall?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={`ikat-band ${className}`}
      style={tall ? { height: 40 } : undefined}
    />
  );
}
