import type { Metadata } from "next";
import Link from "next/link";
import type { FAQPage, SoftwareApplication, WebPage, WithContext } from "schema-dts";
import { UrlForm } from "@/components/UrlForm";
import { JsonLd } from "@/components/JsonLd";
import { ScoreGauge } from "@/components/ScoreGauge";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/format-date";
import { FAQ } from "@/lib/faq";
import { CHECKS } from "@/lib/geo/registry";
import { CATEGORIES, CATEGORY_BLURBS, CATEGORY_LABELS } from "@/lib/geo/scoring";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: "/" },
};

/**
 * This page is the tool's own worked example, so it is built to score well on the
 * checks it runs: a dated and attributed WebPage node, an FAQ backed by FAQPage
 * JSON-LD, question-shaped subheadings, and outbound citations to the primary
 * sources behind its claims.
 */
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

/** Carries the freshness and attribution signals for this page specifically. */
const webPage: WithContext<WebPage> = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${site.url}/#webpage`,
  url: site.url,
  name: `${site.name} — ${site.tagline}`,
  description: site.description,
  datePublished: site.datePublished,
  dateModified: site.dateModified,
  inLanguage: "en",
  isPartOf: { "@id": `${site.url}/#website` },
  author: {
    "@type": "Person",
    name: site.author.name,
    url: site.author.url,
  },
  publisher: { "@id": `${site.url}/#organization` },
};

/** The three questions surfaced on this page, drawn from the shared FAQ so the
 *  visible copy and the structured data cannot drift apart. */
const HOME_FAQ = FAQ.filter((entry) =>
  [
    "What is Generative Engine Optimization (GEO)?",
    "How is the GEO score calculated?",
    "Does Envoyix execute JavaScript when it analyses a page?",
  ].includes(entry.question),
);

const faqPage: WithContext<FAQPage> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
};

/**
 * The score this site gets from its own analyzer, by category.
 *
 * Hard-coded rather than computed, because computing it would mean this page
 * fetching itself at build time. Verified by running the audit against the
 * deployment — re-check it after changing this page's copy or structure, because
 * both move these numbers.
 */
const OWN_SCORE = 97;
const OWN_CATEGORY_SCORES: Record<(typeof CATEGORIES)[number], number> = {
  crawlability: 100,
  structure: 97,
  authority: 97,
  content: 93,
};

/**
 * Longer-form explanation per category. The heading above each one is the question
 * from CATEGORY_BLURBS, so these paragraphs answer it directly.
 *
 * Deliberately no per-category check count: a category's size is only knowable by
 * running the checks (the registry is an array of functions, not metadata), so a
 * number here would be a hand-maintained figure that silently goes stale the next
 * time someone adds a check.
 */
const CATEGORY_DETAIL: Record<(typeof CATEGORIES)[number], string> = {
  crawlability:
    "These checks read your robots.txt the way each AI crawler does, confirm the page returns a usable status code, and verify the content is present in the raw HTML rather than assembled by JavaScript after load.",
  structure:
    "These checks look at whether the answer can be lifted out cleanly: heading hierarchy, question-shaped subheadings, paragraphs sized to chunk well, lists and tables, and an explicit FAQ block.",
  authority:
    "These checks cover the signals an engine weighs before trusting a page — valid JSON-LD, a named author and publisher, publish and update dates, a canonical URL, and citations pointing at primary sources.",
  content:
    "These checks grade the prose itself: whether the opening sentence answers the question, how readable the text is, whether it carries concrete figures, and whether individual sentences survive being quoted alone.",
};

const DIFFERENCES = [
  {
    topic: "What you compete for",
    seo: "A position in a ranked list of ten blue links.",
    geo: "The passage an assistant quotes inside one synthesised answer.",
  },
  {
    topic: "How the crawler reads you",
    seo: "Googlebot renders JavaScript before indexing.",
    geo: "Most AI crawlers read raw HTML only. Client-rendered content is invisible.",
  },
  {
    topic: "What moves the needle",
    seo: "Keywords and backlinks drive position.",
    geo: "Extractable structure, concrete figures and clear attribution drive citation.",
  },
  {
    topic: "What success looks like",
    seo: "A click.",
    geo: "Being named as the source, whether or not anyone clicks.",
  },
];

const STEPS = [
  {
    title: "Audit a page",
    body: "Paste any public URL. Envoyix fetches it the way a crawler does, scores it across every check, and returns the full report in a few seconds.",
    href: "/analyze",
    cta: "Run an audit",
  },
  {
    title: "Fix the top three",
    body: "Findings arrive ranked by recoverable points, so the first three entries are the ones that will move your score the furthest for the least work.",
    href: "/learn/structure-content-for-ai-citations",
    cta: "How to fix them",
  },
  {
    title: "Re-run and compare",
    body: "Crawlability fixes show up the moment you deploy. Content and structure changes only land once the answer engines come back and re-crawl the page.",
    href: "/faq",
    cta: "Read the FAQ",
  },
];

/** Primary sources for the claims on this page. */
const SOURCES = [
  {
    label: "RFC 9309: Robots Exclusion Protocol",
    href: "https://www.rfc-editor.org/rfc/rfc9309.html",
    note: "The standard that defines how robots.txt is parsed and applied.",
  },
  {
    label: "schema.org structured data vocabulary",
    href: "https://schema.org/docs/gs.html",
    note: "The vocabulary behind the JSON-LD this tool validates.",
  },
  {
    label: "MDN: the robots meta tag",
    href: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name#robots",
    note: "Reference for the indexing directives checked under crawlability.",
  },
  {
    label: "The llms.txt proposal",
    href: "https://llmstxt.org/",
    note: "The emerging convention scored as a bonus under crawlability.",
  },
  {
    label: "OpenAI: GPTBot and OAI-SearchBot",
    href: "https://platform.openai.com/docs/bots",
    note: "OpenAI's own documentation of the crawlers named in the audit.",
  },
];

export default function HomePage() {
  const checkCount = CHECKS.length;

  return (
    <>
      <JsonLd data={softwareApplication} />
      <JsonLd data={webPage} />
      <JsonLd data={faqPage} />

      {/* Hero. Left-aligned and two-column: the copy has to carry a definition
          for the answer engines, and the sample dial shows what you get back. */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div aria-hidden="true" className="grid-backdrop absolute inset-0" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-wider text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              {checkCount} checks · no signup · free
            </p>

            <h1 className="text-balance font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-[3.35rem]">
              See your page the way AI answer engines do
            </h1>

            {/*
              The direct-answer opening this tool grades other pages on. First
              sentence defines the subject; the paragraph stands alone if extracted.
            */}
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              Generative Engine Optimization (GEO) is the practice of structuring a web page so that
              AI answer engines can crawl it, understand it, and cite it as a source. Envoyix fetches
              any public URL, scores it across {checkCount} checks in four categories, and tells you
              which fixes are worth the most points.
            </p>

            <div className="mt-9 max-w-xl">
              <UrlForm autoFocus />
              <p className="mt-3 text-xs text-muted">
                Public URLs only. A finished report is held in memory for sixty seconds so a refresh
                is instant, and is never written to disk.
              </p>
            </div>
          </div>

          {/* Sample of the real output, with this site's own score in it. */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="eyebrow">This site&rsquo;s own audit</p>
                  <p className="mt-2 truncate font-mono text-sm">envoyix.vercel.app</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Envoyix is built as a worked example of its own advice, so it takes its own
                    medicine: server-rendered on every route, structured throughout, and{" "}
                    {OWN_SCORE}/100 against its own analyzer with every check passing.
                  </p>
                </div>
                <ScoreGauge score={OWN_SCORE} grade="A" />
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border-subtle pt-5">
                {CATEGORIES.map((category) => (
                  <div key={category}>
                    <dt className="eyebrow">
                      {CATEGORY_LABELS[category]}{" "}
                      <span className="text-foreground">{OWN_CATEGORY_SCORES[category]}</span>
                    </dt>
                    <dd className="mt-1.5 h-1 overflow-hidden rounded-full bg-border-subtle">
                      <div
                        className="h-full rounded-full bg-pass"
                        style={{ width: `${OWN_CATEGORY_SCORES[category]}%` }}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-surface px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Scoring</p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            How does the score work?
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Every check returns a score from 0 to 100 and carries a weight reflecting how much it
            affects your chance of being cited. The overall score is the weighted average of all{" "}
            {checkCount}. Fixes are then sorted by recoverable points — each check&rsquo;s weight
            multiplied by its gap to 100 — so the list arrives in the order actually worth working
            through, rather than in the order the checks happen to run.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((category, index) => (
              <article
                key={category}
                className="rounded-xl border border-border-subtle bg-surface-raised p-6"
              >
                <p className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-muted">0{index + 1}</span>
                  <span className="eyebrow">{CATEGORY_LABELS[category]}</span>
                </p>
                {/* The heading is the question; the paragraph answers it. */}
                <h3 className="mt-3 font-display text-lg font-semibold">
                  {CATEGORY_BLURBS[category]}
                </h3>
                <p className="mt-2.5 leading-relaxed text-muted">{CATEGORY_DETAIL[category]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border-subtle px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Context</p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            How is GEO different from SEO?
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            SEO earns a position in a ranked list of links; GEO earns a sentence inside a generated
            answer. The two share crawlability and structure as a foundation and then diverge, mostly
            because an answer engine reads a page once and quotes from it, rather than ranking it
            against nine alternatives.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <caption className="sr-only">
                Practical differences between search engine optimisation and generative engine
                optimisation
              </caption>
              <thead>
                <tr className="border-b border-border-strong text-left">
                  <th scope="col" className="w-52 py-3 pr-4">
                    <span className="eyebrow">Dimension</span>
                  </th>
                  <th scope="col" className="py-3 pr-4">
                    <span className="eyebrow">Classic SEO</span>
                  </th>
                  <th scope="col" className="py-3">
                    <span className="eyebrow">GEO</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIFFERENCES.map((row) => (
                  <tr key={row.topic} className="border-b border-border-subtle align-top">
                    <th scope="row" className="py-4 pr-4 text-left font-medium">
                      {row.topic}
                    </th>
                    <td className="py-4 pr-4 leading-relaxed text-muted">{row.seo}</td>
                    <td className="py-4 leading-relaxed">{row.geo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 leading-relaxed text-muted">
            Which crawler reads you matters as much as how. The rules live in{" "}
            <a
              href="https://www.rfc-editor.org/rfc/rfc9309.html"
              className="text-accent hover:underline"
              rel="noopener"
            >
              RFC 9309
            </a>
            , the standard behind robots.txt, and each vendor documents its own agents — OpenAI, for
            instance, publishes the behaviour of{" "}
            <a
              href="https://platform.openai.com/docs/bots"
              className="text-accent hover:underline"
              rel="noopener"
            >
              GPTBot and OAI-SearchBot
            </a>{" "}
            separately, because one builds a training corpus and the other answers live questions.
          </p>

          <p className="mt-5">
            <Link
              href="/learn/geo-vs-seo"
              className="text-sm font-medium text-accent hover:underline"
            >
              Read the full GEO vs SEO guide →
            </Link>
          </p>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-surface px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Getting started</p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            Where should I start?
          </h2>

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col rounded-xl border border-border-subtle bg-surface-raised p-5"
              >
                <span className="grid size-7 place-items-center rounded-lg bg-accent font-mono text-xs font-bold text-accent-contrast">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display font-semibold">{step.title}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-muted">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-4 text-sm font-medium text-accent hover:underline"
                >
                  {step.cta} →
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*
        An explicit FAQ block, backed by the FAQPage JSON-LD above. Built on
        <details>/<summary> so every answer is present in the raw HTML whether or
        not it is expanded — a JavaScript accordion would hide all of this from the
        crawlers that matter.
      */}
      <section className="border-b border-border-subtle px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Questions</p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            Frequently asked questions
          </h2>

          <div className="mt-8 space-y-3">
            {HOME_FAQ.map((entry) => (
              <details
                key={entry.question}
                className="group rounded-xl border border-border-subtle bg-surface-raised p-5 transition-colors hover:border-border-strong open:border-border-strong open:bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="mt-1.5 size-3 shrink-0 text-muted transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 2l4 4-4 4" />
                  </svg>
                  <h3 className="font-display text-base font-semibold">{entry.question}</h3>
                </summary>
                <p className="mt-3 pl-6 leading-relaxed text-muted">{entry.answer}</p>
              </details>
            ))}
          </div>

          <p className="mt-6 text-sm">
            <Link href="/faq" className="font-medium text-accent hover:underline">
              All {FAQ.length} questions →
            </Link>
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">References</p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            What are these checks based on?
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            No answer engine publishes its source-selection formula, so the weights here encode what
            is publicly documented plus reasonable inference, and every one is visible in the source
            of the check that uses it. These are the primary sources behind the parts that are
            documented.
          </p>

          <ul className="mt-8 space-y-4">
            {SOURCES.map((source) => (
              <li key={source.href} className="border-l-2 border-border-subtle pl-4">
                <a href={source.href} className="font-medium text-accent hover:underline" rel="noopener">
                  {source.label}
                </a>
                <p className="mt-1 text-sm leading-relaxed text-muted">{source.note}</p>
              </li>
            ))}
          </ul>

          {/* `byline` is the class the authority check — and most parsers — look
              for, and the <time> element is the machine-readable date. */}
          <p className="byline mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle pt-6 font-mono text-[0.6875rem] uppercase tracking-wider text-muted">
            <span rel="author">
              Maintained by{" "}
              <Link href="/about" className="font-medium text-foreground hover:text-accent">
                {site.author.name}
              </Link>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Last updated{" "}
              <time dateTime={site.dateModified}>
                {formatDate(site.dateModified)}
              </time>
            </span>
          </p>
        </div>
      </section>
    </>
  );
}
