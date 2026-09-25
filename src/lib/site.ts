/** Single source of truth for site-wide metadata, used by pages, JSON-LD and OG images. */
export const site = {
  name: "GEO Lens",
  tagline: "See your site the way AI answer engines do",
  description:
    "GEO Lens audits any public URL for Generative Engine Optimization: whether ChatGPT, Perplexity, Claude, Gemini and Google AI Overviews can crawl it, understand it, and cite it.",
  // NEXT_PUBLIC_SITE_URL lets preview deployments emit correct canonical URLs.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://geo-lens.vercel.app",
  author: {
    name: "The GEO Lens team",
    url: "https://geo-lens.vercel.app/about",
  },
  locale: "en_US",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}
