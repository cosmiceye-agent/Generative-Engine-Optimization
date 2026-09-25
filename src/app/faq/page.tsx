import type { Metadata } from "next";
import Link from "next/link";
import type { FAQPage, WithContext } from "schema-dts";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { FAQ } from "@/lib/faq";

const description =
  "Answers to common questions about Generative Engine Optimization and GEO Lens: how the score is calculated, why checks are weighted, whether to block AI crawlers, and what llms.txt is for.";

export const metadata: Metadata = {
  title: "GEO FAQ",
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    url: `${site.url}/faq`,
    title: "GEO frequently asked questions",
    description,
  },
};

/** Built from the same array the page renders, so the two cannot disagree. */
const faqPage: WithContext<FAQPage> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  name: "GEO frequently asked questions",
  url: `${site.url}/faq`,
  description,
  isPartOf: { "@id": `${site.url}/#website` },
  mainEntity: FAQ.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <JsonLd data={faqPage} />

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Frequently asked questions
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Common questions about Generative Engine Optimization and how GEO Lens scores a page. Each
        answer is self-contained, so it makes sense quoted on its own.
      </p>

      {/*
        <details>/<summary> rather than a JS accordion: the answers stay in the
        raw HTML whether or not they are expanded, which is what makes them
        retrievable. A JavaScript accordion that injects the answer on click
        would hide every one of these from an AI crawler.
      */}
      <div className="mt-10 space-y-3">
        {FAQ.map((entry) => (
          <details
            key={entry.question}
            className="rounded-lg border border-border-subtle bg-surface-raised p-5 open:bg-surface"
          >
            <summary className="cursor-pointer list-none font-medium">
              <h2 className="inline text-base font-medium">{entry.question}</h2>
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{entry.answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Still stuck? The <Link href="/learn" className="text-accent hover:underline">guides</Link>{" "}
        go deeper, and <Link href="/about" className="text-accent hover:underline">About</Link>{" "}
        covers how the tool works and what its limits are.
      </p>
    </div>
  );
}
