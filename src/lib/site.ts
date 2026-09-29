/** Single source of truth for site-wide metadata, used by pages, JSON-LD and OG images. */
export const site = {
  name: "Envoyix",
  tagline: "See your site the way AI answer engines do",
  // 151 characters: inside the 120–160 band the meta-description check looks for,
  // and phrased as a claim about what the tool does rather than a tagline.
  description:
    "Envoyix audits any public URL for Generative Engine Optimization: how readily ChatGPT, Perplexity, Claude and Gemini can crawl, understand and cite it.",
  // NEXT_PUBLIC_SITE_URL lets preview deployments emit correct canonical URLs.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://envoyix.vercel.app",
  author: {
    name: "The Envoyix team",
    url: "https://envoyix.vercel.app/about",
  },
  locale: "en_US",
  /**
   * Freshness dates for the home page's JSON-LD and its visible <time> element.
   *
   * `published` is the date the project went up. `modified` is maintained by hand
   * rather than set to the build date on purpose: an engine reading a dateModified
   * that bumps on every deploy learns nothing, so this moves only when the
   * substance of the page changes.
   */
  datePublished: "2026-09-25",
  dateModified: "2026-09-28",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}
