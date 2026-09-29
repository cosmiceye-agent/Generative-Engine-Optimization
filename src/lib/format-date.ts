/**
 * Format an ISO date for display, in UTC.
 *
 * The `timeZone` is not optional detail. `new Date("2026-09-28")` is parsed as
 * midnight *UTC*, so formatting it in a timezone behind UTC renders the previous
 * day — which puts the visible text one day off the `datetime` attribute sitting
 * right next to it. Pinning the format to UTC keeps the two in agreement, and
 * keeps server and client rendering identical regardless of where either runs.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
