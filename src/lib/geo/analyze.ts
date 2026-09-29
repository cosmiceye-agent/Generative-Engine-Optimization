import type { AnalysisReport, FetchedResource, LlmReview } from "./types";
import { buildPageContext } from "./context";
import { fetchResource, safeFetch } from "./fetcher";
import { buildReport } from "./registry";
import { maybeReviewWithLlm } from "./llm-review";
import { TtlCache } from "./cache";

/** How long a finished audit is reused. Short enough that a re-run after a deploy
 *  reflects the deploy; long enough to absorb refreshes and double renders. */
const CACHE_TTL_MS = 60_000;

export type Analysis = {
  report: AnalysisReport;
  /**
   * The optional AI review, kept as a promise so the deterministic report can be
   * rendered and streamed while the model is still thinking. Never rejects —
   * {@link maybeReviewWithLlm} folds every failure into `null`.
   */
  review: Promise<LlmReview | null>;
};

const analyses = new TtlCache<Analysis>(CACHE_TTL_MS);

/** Test seam — drops every memoised audit. */
export function clearAnalysisCache(): void {
  analyses.clear();
}

/**
 * Orchestrates one full analysis, memoised for {@link CACHE_TTL_MS}.
 *
 * Returns the deterministic report immediately and the optional AI review as a
 * pending promise, so a caller that can stream (a Suspense boundary) paints the
 * 22 checks without waiting on the model.
 */
export function analyzePage(rawUrl: string): Promise<Analysis> {
  return analyses.getOrCreate(rawUrl, () => runAnalysis(rawUrl));
}

/**
 * Whole-report convenience wrapper: awaits the AI review and folds it in. Used by
 * the JSON API, where the response is a single object and there is nothing to
 * stream into.
 */
export async function analyzeUrl(rawUrl: string): Promise<AnalysisReport> {
  const { report, review } = await analyzePage(rawUrl);
  const llmReview = await review;
  return llmReview ? { ...report, llmReview } : report;
}

async function runAnalysis(rawUrl: string): Promise<Analysis> {
  // The sibling resources live at fixed paths, so we can start fetching them
  // against the requested origin *without* waiting for the page. In the common
  // case (no redirect, or a redirect that stays on the same origin) that removes
  // a whole round trip from every audit.
  //
  // The gamble is a cross-origin redirect, where the speculative results belong
  // to the wrong site and are thrown away. That costs three wasted GETs of public
  // text files on a host the user explicitly asked us to look at, which is a fair
  // price for making the common path a round trip faster.
  const requestedOrigin = originOf(rawUrl);
  const speculative = requestedOrigin === null ? null : fetchSiblings(requestedOrigin);

  const page = await safeFetch(rawUrl);
  const finalOrigin = new URL(page.finalUrl).origin;

  const siblings =
    speculative !== null && finalOrigin === requestedOrigin
      ? await speculative
      : await fetchSiblings(finalOrigin);

  // Don't leave a discarded speculative fetch dangling as an unhandled rejection.
  // fetchSiblings never rejects today; this keeps that from becoming a trap if it
  // ever does.
  if (speculative !== null && finalOrigin !== requestedOrigin) void speculative.catch(() => {});

  const ctx = buildPageContext({
    requestedUrl: rawUrl,
    finalUrl: page.finalUrl,
    status: page.status,
    headers: page.headers,
    html: page.body,
    htmlBytes: page.bytes,
    robotsTxt: siblings.robotsTxt,
    llmsTxt: siblings.llmsTxt,
    sitemap: siblings.sitemapXml,
  });

  return {
    report: buildReport(ctx),
    // Started here, awaited by whoever wants it. Optional and non-blocking on
    // failure — see llm-review.ts.
    review: maybeReviewWithLlm(ctx),
  };
}

/** `null` when the input is not a parseable absolute URL — the page fetch will
 *  produce the proper error message, so there is nothing to report here. */
function originOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

type Siblings = {
  robotsTxt: FetchedResource;
  llmsTxt: FetchedResource;
  sitemapXml: FetchedResource;
};

/**
 * robots.txt, llms.txt and the sitemap for one origin, fetched concurrently.
 *
 * Every field resolves to a {@link FetchedResource} whether the fetch succeeded
 * or not, so a missing llms.txt is a finding rather than an error that aborts the
 * run — and so this function never rejects.
 */
async function fetchSiblings(origin: string): Promise<Siblings> {
  const [robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    fetchResource(`${origin}/robots.txt`, "text/plain,*/*;q=0.8"),
    fetchResource(`${origin}/llms.txt`, "text/plain,text/markdown,*/*;q=0.8"),
    fetchSitemap(origin),
  ]);

  return { robotsTxt, llmsTxt, sitemapXml };
}

const SITEMAP_ACCEPT = "application/xml,text/xml,*/*;q=0.8";
/** Conventional location first, then the WordPress/Yoast spellings. */
const SITEMAP_FALLBACKS = ["/sitemap_index.xml", "/sitemap-index.xml"];

function looksLikeSitemap(resource: FetchedResource): boolean {
  return resource.ok && resource.body.includes("<");
}

/**
 * Sitemaps are conventionally at /sitemap.xml but frequently at
 * /sitemap_index.xml (WordPress/Yoast) or /sitemap-index.xml.
 *
 * The conventional path is tried alone first, because it is what the large
 * majority of sites use and firing all three every time would triple the
 * requests we make to a stranger's server for no gain. Only when it misses do
 * the fallbacks go out — together, so a miss costs two round trips rather than
 * three.
 */
async function fetchSitemap(origin: string): Promise<FetchedResource> {
  const conventional = await fetchResource(`${origin}/sitemap.xml`, SITEMAP_ACCEPT);
  if (looksLikeSitemap(conventional)) return conventional;

  const fallbacks = await Promise.all(
    SITEMAP_FALLBACKS.map((path) => fetchResource(`${origin}${path}`, SITEMAP_ACCEPT)),
  );

  // Report the conventional path's failure when nothing else answered either:
  // "no /sitemap.xml" is the finding a reader expects, not "no /sitemap-index.xml".
  return fallbacks.find(looksLikeSitemap) ?? conventional;
}
