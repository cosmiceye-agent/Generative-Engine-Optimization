import type { Metadata } from "next";
import Link from "next/link";
import type { SoftwareApplication, WithContext } from "schema-dts";
import { UrlForm } from "@/components/UrlForm";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { CHECKS } from "@/lib/geo/registry";
import { CATEGORIES, CATEGORY_BLURBS, CATEGORY_LABELS } from "@/lib/geo/scoring";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: "/" },
};

const softwareApplication: WithContext<SoftwareApplication> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  url: site.url,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (web-based)",
  description: site.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Checks robots.txt rules for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and Google-Extended",
    "Detects whether content is present without JavaScript",
    "Validates JSON-LD structured data against required schema.org fields",
    "Scores heading structure, direct answers and quotable sentences",
    "Exports the full audit as Markdown",
  ],
  publisher: { "@id": `${site.url}/#organization` },
};

const DIFFERENCES = [
  {
    seo: "Optimises for a ranked list of ten blue links.",
    geo: "Optimises to be the passage an assistant quotes inside one synthesised answer.",
    topic: "What you are competing for",
  },
  {
    seo: "Googlebot renders JavaScript before indexing.",
    geo: "Most AI crawlers read the raw HTML only. Client-rendered content is invisible.",
    topic: "How the crawler reads you",
  },
  {
    seo: "Keywords and backlinks drive position.",
    geo: "Extractable structure, concrete figures and clear attribution drive citation.",
    topic: "What moves the needle",
  },
  {
    seo: "Success is a click.",
    geo: "Success is being named as the source, whether or not anyone clicks.",
    topic: "What success looks like",
  },
];

export default function HomePage() {
  const checkCount = CHECKS.length;

  return (
    <>
      <JsonLd data={softwareApplication} />

      <section className="mx-auto max-w-3xl px-4 pb-14 pt-16 text-center sm:pt-24">
        <p className="mb-4 inline-flex items-center rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs font-medium text-muted">
          {checkCount} checks · no signup · free
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          See your page the way AI answer engines do
        </h1>

        {/*
          The direct-answer opening this tool grades other pages on. First
          sentence defines the subject; the paragraph stands alone if extracted.
        */}
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
          Generative Engine Optimization (GEO) is the practice of structuring a web page so that AI
          answer engines can crawl it, understand it, and cite it as a source. GEO Lens fetches any
          public URL and scores it across {checkCount} checks in four categories, then tells you
          exactly what to change.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <UrlForm autoFocus />
          <p className="mt-3 text-xs text-muted">
            Public URLs only. Nothing is stored — each audit is a live fetch.
          </p>
        </div>
      </section>

      <section className="border-y border-border-subtle bg-surface px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">How does the score work?</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            Every check returns a score from 0 to 100 and carries a weight reflecting how much it
            affects your chance of being cited. The overall score is the weighted average, and fixes
            are sorted by recoverable points — weight multiplied by the gap — so the list is in the
            order worth working through.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <article
                key={category}
                className="rounded-lg border border-border-subtle bg-surface-raised p-5"
              >
                <h3 className="font-semibold">{CATEGORY_LABELS[category]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {CATEGORY_BLURBS[category]}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            How is GEO different from SEO?
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            GEO and SEO overlap but optimise for different outcomes. SEO earns a position in a
            ranked list of links; GEO earns a sentence inside a generated answer. The table below
            covers where the two diverge in practice.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">
                Practical differences between search engine optimisation and generative engine
                optimisation
              </caption>
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  <th scope="col" className="w-48 py-3 pr-4 font-semibold">Dimension</th>
                  <th scope="col" className="py-3 pr-4 font-semibold">Classic SEO</th>
                  <th scope="col" className="py-3 font-semibold">GEO</th>
                </tr>
              </thead>
              <tbody>
                {DIFFERENCES.map((row) => (
                  <tr key={row.topic} className="border-b border-border-subtle align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-medium">{row.topic}</th>
                    <td className="py-3 pr-4 leading-relaxed text-muted">{row.seo}</td>
                    <td className="py-3 leading-relaxed">{row.geo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-sm">
            <Link href="/learn/geo-vs-seo" className="font-medium text-accent hover:underline">
              Read the full GEO vs SEO guide →
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-border-subtle bg-surface px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">Where should I start?</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Audit a page", body: "Paste a URL above. The audit runs a live fetch and takes a few seconds.", href: "/analyze" },
              { title: "Fix the top three", body: "Findings are ordered by recoverable points, so the first three are the ones that matter.", href: "/learn/structure-content-for-ai-citations" },
              { title: "Re-run and compare", body: "Re-audit after deploying. Crawlability fixes show up immediately; content fixes take a re-crawl.", href: "/faq" },
            ].map((step, index) => (
              <li key={step.title} className="rounded-lg border border-border-subtle bg-surface-raised p-5">
                <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-contrast">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                <Link href={step.href} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
                  Go →
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
