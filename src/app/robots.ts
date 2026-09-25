import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { AI_BOTS } from "@/lib/geo/robots-txt";

/**
 * robots.txt, generated rather than static so it stays in sync with the bot list
 * the analyzer itself grades against.
 *
 * Every AI crawler gets its own named group. A wildcard group would work today,
 * but naming them means a future `User-agent: *` tightening cannot silently lock
 * out the retrieval bots — which is exactly the failure this tool looks for on
 * other people's sites.
 *
 * /api/ and /analyze are disallowed on purpose: the API is not content, and
 * result pages are per-URL, ephemeral, and would fill indexes with noise.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/analyze"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_BOTS.map((bot) => ({
        userAgent: bot.token,
        allow: "/",
        disallow,
      })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
