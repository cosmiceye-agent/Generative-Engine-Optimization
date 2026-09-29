import type { Metadata } from "next";
import Link from "next/link";
import type { CollectionPage, WithContext } from "schema-dts";
import { getAllGuides } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/format-date";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Learn GEO",
  description:
    "Practical guides to Generative Engine Optimization: what GEO is, how it differs from SEO, and how to structure content so AI answer engines cite it.",
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: `${site.url}/learn`,
    title: "Learn GEO — guides to Generative Engine Optimization",
    description:
      "Practical guides to Generative Engine Optimization: what GEO is, how it differs from SEO, and how to structure content so AI answer engines cite it.",
  },
};

export default async function LearnIndexPage() {
  const guides = await getAllGuides();

  const collection: WithContext<CollectionPage> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Learn GEO",
    url: `${site.url}/learn`,
    description: "Guides to Generative Engine Optimization.",
    isPartOf: { "@id": `${site.url}/#website` },
    hasPart: guides.map((guide) => ({
      "@type": "Article",
      headline: guide.title,
      url: `${site.url}/learn/${guide.slug}`,
      description: guide.description,
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
      author: { "@type": "Person", name: guide.author },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={collection} />

      <PageHeader eyebrow="Guides" title="Learn GEO">
        Generative Engine Optimization is the practice of structuring web content so AI answer
        engines can crawl, understand and cite it. These guides cover what that means, how it
        differs from SEO, and exactly what to change on a page.
      </PageHeader>

      <ul className="mt-10 space-y-4">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <article className="rounded-xl border border-border-subtle bg-surface-raised p-6 transition-colors hover:border-accent">
              <h2 className="font-display text-xl font-semibold">
                <Link href={`/learn/${guide.slug}`} className="hover:text-accent">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-2 leading-relaxed text-muted">{guide.summary}</p>
              <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-wider text-muted">
                <span>{guide.readingMinutes} min read</span>
                <span aria-hidden="true">·</span>
                <span>
                  Updated{" "}
                  <time dateTime={guide.dateModified}>
                    {formatDate(guide.dateModified)}
                  </time>
                </span>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
