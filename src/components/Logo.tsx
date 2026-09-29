/**
 * The Envoyix mark: an origin point with two signal arcs radiating from it —
 * a page being dispatched to the engines that will quote it.
 *
 * `currentColor` for the glyph and a transparent ground, so the same component
 * works on the header, on a solid accent tile, and inside the footer without a
 * second asset. Decorative in every usage — the wordmark next to it carries the
 * accessible name, so this is always aria-hidden.
 */
export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10.5" cy="16" r="2.6" fill="currentColor" />
      <path
        d="M16 10.5a8 8 0 0 1 0 11"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M21 7a13 13 0 0 1 0 18"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
