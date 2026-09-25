/** Matches any URI scheme prefix, e.g. "https:", "file:", "javascript:". */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Normalise what a user typed into something `new URL()` can parse.
 *
 * People paste bare domains ("example.com"), so a missing scheme is filled in
 * with https. A scheme that is already present is left alone — prepending to
 * "file:///etc/passwd" would produce a nonsense host and make the SSRF guard
 * report "could not resolve" instead of the real problem, which is the scheme.
 */
export function normaliseUrlInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") return trimmed;
  return HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
}
