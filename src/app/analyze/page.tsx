import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { analyzeUrl } from "@/lib/geo/analyze";
import { reportToMarkdown } from "@/lib/geo/report";
import { FetchFailure } from "@/lib/geo/fetcher";
import { SsrfError } from "@/lib/geo/ssrf";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/geo/rate-limit";
import { normaliseUrlInput } from "@/lib/geo/normalise-url";
import { sortByImpact } from "@/lib/geo/scoring";
import type { AnalysisReport } from "@/lib/geo/types";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CategoryScores } from "@/components/CategoryScores";
import { CheckCard } from "@/components/CheckCard";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";
import { UrlForm } from "@/components/UrlForm";

// The analyzer uses node:dns and cheerio, and every audit is a live fetch, so
// this route is dynamic and Node-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GEO audit results",
  description:
    "Run a Generative Engine Optimization audit on any public URL and see which AI answer engines can crawl, understand and cite it.",
  alternates: { canonical: "/analyze" },
  // Individual result pages are per-URL and ephemeral — there is nothing here
  // worth indexing, and indexing them would fill search results with noise.
  robots: { index: false, follow: true },
};

function Shell({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <UrlForm initialUrl={url} size="compact" />
      </div>
      {children}
    </div>
  );
}

function ErrorState({ title, detail, hint }: { title: string; detail: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted">{detail}</p>
      {hint && <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{hint}</p>}
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast"
      >
        Back to the start
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">Fetching and analysing the page…</p>
      <div className="h-36 rounded-lg border border-border-subtle bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 rounded-lg border border-border-subtle bg-surface" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="h-16 rounded-lg border border-border-subtle bg-surface" />
        ))}
      </div>
    </div>
  );
}

function Results({ report }: { report: AnalysisReport }) {
  const markdown = reportToMarkdown(report);
  const ranked = sortByImpact(report.checks);
  const priority = ranked.filter((check) => check.status !== "pass" && check.weight > 0);

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-border-subtle bg-surface-raised p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-sm font-medium text-muted">GEO audit</h1>
            <p className="mt-1 break-all font-mono text-sm">{report.finalUrl}</p>
            <p className="mt-2 text-xs text-muted">
              HTTP {report.httpStatus} · fetched{" "}
              <time dateTime={report.fetchedAt}>
                {new Date(report.fetchedAt).toUTCString()}
              </time>
            </p>
            {report.requestedUrl !== report.finalUrl && (
              <p className="mt-1 text-xs text-muted">
                Redirected from {report.requestedUrl}
              </p>
            )}
          </div>
          <ScoreGauge score={report.overallScore} grade={report.grade} />
        </div>

        <div className="mt-6 border-t border-border-subtle pt-5">
          <CopyMarkdownButton markdown={markdown} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Category scores</h2>
        <CategoryScores categories={report.categories} />
      </section>

      {priority.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">Fix these first</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Ordered by recoverable score — each check&rsquo;s weight multiplied by how far it fell
            short.
          </p>
          <ol className="space-y-2">
            {priority.slice(0, 3).map((check, index) => (
              <li
                key={check.id}
                className="flex gap-3 rounded-lg border border-border-subtle bg-surface-raised p-4"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-contrast">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{check.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{check.fix}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight">All {ranked.length} checks</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Highest impact first. Select one to expand it.</p>
        <div className="space-y-2">
          {ranked.map((check, index) => (
            <CheckCard key={check.id} check={check} defaultOpen={index < 2} />
          ))}
        </div>
      </section>

      {report.llmReview && report.llmReview.suggestions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">AI rewrite suggestions</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Generated by {report.llmReview.model}. Review before publishing.
          </p>
          <div className="space-y-3">
            {report.llmReview.suggestions.map((suggestion) => (
              <article
                key={suggestion.title}
                className="rounded-lg border border-border-subtle bg-surface-raised p-4"
              >
                <h3 className="font-medium">{suggestion.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{suggestion.rationale}</p>
                <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm leading-relaxed">
                  {suggestion.rewrite}
                </blockquote>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Runs the audit on the server and streams the result in.
 *
 * Doing the work here rather than in a client-side fetch means the findings are
 * in the server HTML — which is the very thing this tool grades other pages on.
 * Suspense gives the loading state for free while the fetch is in flight.
 */
type Failure = { title: string; detail: string; hint?: string };

/** Map a thrown analyzer error onto the copy shown to the user. */
function describeFailure(error: unknown): Failure {
  if (error instanceof SsrfError) {
    return {
      title: "That URL cannot be analysed",
      detail: error.message,
      hint: "GEO Lens only fetches public http and https addresses.",
    };
  }
  if (error instanceof FetchFailure) {
    return {
      title: "Could not reach that page",
      detail: error.message,
      hint: "The site may be blocking automated requests, be behind a login, or be temporarily down.",
    };
  }
  console.error("[analyze] unexpected error:", error);
  return {
    title: "Something went wrong",
    detail:
      "The analysis failed unexpectedly. This is likely a bug on our side rather than a problem with the page.",
  };
}

async function Analysis({ url }: { url: string }) {
  const requestHeaders = await headers();
  const rate = checkRateLimit(clientKeyFromHeaders(requestHeaders));

  if (!rate.allowed) {
    return (
      <ErrorState
        title="Slow down a moment"
        detail={`You have hit the rate limit. Try again in about ${rate.retryAfterSeconds} seconds.`}
      />
    );
  }

  // The try/catch wraps only the await, never the JSX: an error thrown while
  // React renders a child would not be caught here anyway, so constructing the
  // element outside the block keeps the error handling honest.
  let report: AnalysisReport;
  try {
    report = await analyzeUrl(url);
  } catch (error) {
    const failure = describeFailure(error);
    return <ErrorState title={failure.title} detail={failure.detail} hint={failure.hint} />;
  }

  return <Results report={report} />;
}

export default async function AnalyzePage({ searchParams }: PageProps<"/analyze">) {
  // searchParams is a Promise in Next.js 16.
  const params = await searchParams;
  const raw = params.url;
  const url = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  if (url === "") {
    return (
      <Shell url="">
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-8 text-center">
          <h1 className="text-xl font-semibold">Enter a URL to audit</h1>
          <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted">
            Paste any public page above. GEO Lens fetches it along with its robots.txt, llms.txt and
            sitemap, then scores how readily an AI answer engine could cite it.
          </p>
        </div>
      </Shell>
    );
  }

  const normalised = normaliseUrlInput(url);

  return (
    <Shell url={url}>
      {/* `key` restarts the Suspense boundary when the URL changes, so switching
          targets shows the loading state again rather than the stale report. */}
      <Suspense key={normalised} fallback={<LoadingState />}>
        <Analysis url={normalised} />
      </Suspense>
    </Shell>
  );
}
