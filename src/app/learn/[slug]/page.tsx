import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Article, BreadcrumbList, FAQPage, WithContext } from "schema-dts";
import { getAllGuides, getGuide, getGuideSlugs } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

/** Guides are files on disk, so every slug can be built ahead of time. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return { title: "Guide not found" };

  const url = `${site.url}/learn/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    authors: [{ name: guide.author }],
    alternates: { canonical: `/learn/${guide.slug}` },
    openGraph: {
      type: "article",
      url,
      title: guide.title,
      description: guide.description,
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
      authors: [guide.author],
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const url = `${site.url}/learn/${guide.slug}`;
  const others = (await getAllGuides()).filter((entry) => entry.slug !== guide.slug);

  const article: WithContext<Article> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    author: { "@type": "Person", name: guide.author, url: site.author.url },
    publisher: { "@id": `${site.url}/#organization` },
    inLanguage: "en",
    keywords: guide.keywords.join(", "),
    isPartOf: { "@id": `${site.url}/#website` },
  };

  const breadcrumbs: WithContext<BreadcrumbList> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      { "@type": "ListItem", position: 2, name: "Learn", item: `${site.url}/learn` },
      { "@type": "ListItem", position: 3, name: guide.title, item: url },
    ],
  };

  const faqPage: WithContext<FAQPage> | null =
    guide.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faq.map((entry) => ({
            "@type": "Question",
            name: entry.question,
            acceptedAnswer: { "@type": "Answer", text: entry.answer },
          })),
        }
      : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd data={article} />
      <JsonLd data={breadcrumbs} />
      {faqPage && <JsonLd data={faqPage} />}

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-accent">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/learn" className="hover:text-accent">Learn</Link></li>
        </ol>
      </nav>

      <header className="mb-10 border-b border-border-subtle pb-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {guide.title}
        </h1>

        {/* Direct-answer opening: the summary is the quotable definition, placed
            above the body so it sits inside the first 100 words of the page. */}
        <p className="mt-5 text-lg leading-relaxed text-muted">{guide.summary}</p>

        {/* `byline` is the class the authority check (and most parsers) look for. */}
        <p className="byline mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span rel="author">
            By <span className="font-medium text-foreground">{guide.author}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Updated <time dateTime={guide.dateModified}>
              {new Date(guide.dateModified).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </time>
          </span>
          <span aria-hidden="true">·</span>
          <span>{guide.readingMinutes} min read</span>
        </p>
      </header>

      <div className="prose-geo">
        <MDXRemote source={guide.content} />
      </div>

      {guide.faq.length > 0 && (
        <section className="mt-14 border-t border-border-subtle pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {guide.faq.map((entry) => (
              <details
                key={entry.question}
                className="rounded-lg border border-border-subtle bg-surface-raised p-4"
              >
                <summary className="cursor-pointer font-medium">{entry.question}</summary>
                <p className="mt-3 leading-relaxed text-muted">{entry.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {guide.sources.length > 0 && (
        <section className="mt-12 border-t border-border-subtle pt-10">
          <h2 className="text-xl font-semibold tracking-tight">Sources and further reading</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  className="text-accent hover:underline"
                  rel="noopener"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <nav aria-label="More guides" className="mt-12 border-t border-border-subtle pt-10">
          <h2 className="text-xl font-semibold tracking-tight">More guides</h2>
          <ul className="mt-4 space-y-2">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/learn/${entry.slug}`} className="text-accent hover:underline">
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
