import type { AnalysisReport, FetchedResource } from "./types";
import { buildPageContext } from "./context";
import { fetchResource, safeFetch } from "./fetcher";
import { buildReport } from "./registry";
import { maybeReviewWithLlm } from "./llm-review";

/**
 * Orchestrates one full analysis.
 *
 * The page and its three sibling resources are fetched concurrently: robots.txt,
 * llms.txt and sitemap.xml live at fixed paths, so there is no reason to wait for
 * the page before asking for them. Each sibling resolves to a FetchedResource
 * whether it succeeded or not, so a missing llms.txt is a finding rather than an
 * error that aborts the run.
 */
export async function analyzeUrl(rawUrl: string): Promise<AnalysisReport> {
  // Fetch the page first so we know the final host after redirects — the sibling
  // resources belong to wherever we actually landed, not where we started.
  const page = await safeFetch(rawUrl);
  const origin = new URL(page.finalUrl).origin;

  const [robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    fetchResource(`${origin}/robots.txt`, "text/plain,*/*;q=0.8"),
    fetchResource(`${origin}/llms.txt`, "text/plain,text/markdown,*/*;q=0.8"),
    fetchSitemap(origin),
  ]);

  const ctx = buildPageContext({
    requestedUrl: rawUrl,
    finalUrl: page.finalUrl,
    status: page.status,
    headers: page.headers,
    html: page.body,
    htmlBytes: page.bytes,
    robotsTxt,
    llmsTxt,
    sitemap: sitemapXml,
  });

  const report = buildReport(ctx);

  // Optional and fully non-blocking on failure — see llm-review.ts.
  const llmReview = await maybeReviewWithLlm(ctx);
  return llmReview ? { ...report, llmReview } : report;
}

/**
 * Sitemaps are conventionally at /sitemap.xml but frequently at /sitemap_index.xml
 * (WordPress/Yoast) or /sitemap-index.xml. Try the common locations and return
 * the first that answers.
 */
async function fetchSitemap(origin: string): Promise<FetchedResource> {
  const candidates = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];
  let last: FetchedResource | null = null;

  for (const path of candidates) {
    const resource = await fetchResource(`${origin}${path}`, "application/xml,text/xml,*/*;q=0.8");
    if (resource.ok && resource.body.includes("<")) return resource;
    last ??= resource;
  }

  return last ?? { url: `${origin}/sitemap.xml`, ok: false, status: 0, body: "", contentType: "" };
}
