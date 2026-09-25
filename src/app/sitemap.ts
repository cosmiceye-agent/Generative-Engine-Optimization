import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getAllGuides } from "@/lib/guides";

/** Static routes worth indexing. /analyze is excluded — see robots.ts. */
const STATIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/learn", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await getAllGuides();

  // lastModified on the static pages tracks the most recently edited guide, so
  // the whole site's freshness signal moves when content actually changes.
  const newest = guides.reduce<string | null>(
    (latest, guide) => (latest === null || guide.dateModified > latest ? guide.dateModified : latest),
    null,
  );
  const fallback = newest ? new Date(newest) : new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${site.url}${route.path}`,
      lastModified: fallback,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...guides.map((guide) => ({
      url: `${site.url}/learn/${guide.slug}`,
      lastModified: new Date(guide.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
