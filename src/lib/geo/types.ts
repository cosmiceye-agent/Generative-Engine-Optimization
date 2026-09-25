import type { CheerioAPI } from "cheerio";

/** The four buckets a check can belong to. Each bucket is scored independently. */
export type CheckCategory = "crawlability" | "structure" | "authority" | "content";

/** pass >= 80, warn >= 50, fail below. Derived centrally by {@link statusFromScore}. */
export type CheckStatus = "pass" | "warn" | "fail";

export type CheckResult = {
  id: string;
  label: string;
  category: CheckCategory;
  /** 0–100. 100 means the page fully satisfies this check. */
  score: number;
  /** Relative importance inside the overall weighted average. */
  weight: number;
  status: CheckStatus;
  /** Human-readable observations about *this* page. */
  findings: string[];
  /** One concrete, actionable recommendation. */
  fix: string;
};

/** A sibling resource fetched alongside the page (robots.txt, llms.txt, sitemap.xml). */
export type FetchedResource = {
  url: string;
  ok: boolean;
  status: number;
  /** Body text, empty when the fetch failed or the response was not text. */
  body: string;
  contentType: string;
  error?: string;
};

/** One parsed `User-agent` group from a robots.txt file. */
export type RobotsGroup = {
  userAgents: string[];
  allow: string[];
  disallow: string[];
};

export type ParsedRobots = {
  groups: RobotsGroup[];
  sitemaps: string[];
};

/**
 * Everything a check function is allowed to look at. Checks are pure functions of
 * this object — they never perform I/O, which is what makes them unit-testable
 * against static HTML fixtures.
 */
export type PageContext = {
  /** URL the user asked for. */
  requestedUrl: string;
  /** URL after redirects — what the crawler actually indexes. */
  finalUrl: string;
  status: number;
  /** Response headers, lower-cased keys. */
  headers: Record<string, string>;
  html: string;
  $: CheerioAPI;
  /** Visible text of the main content area, whitespace-normalised. */
  text: string;
  /** Byte length of the raw HTML response. */
  htmlBytes: number;
  robotsTxt: FetchedResource | null;
  parsedRobots: ParsedRobots | null;
  llmsTxt: FetchedResource | null;
  sitemap: FetchedResource | null;
  /** ISO timestamp of the analysis. */
  fetchedAt: string;
};

export type CategoryScore = {
  category: CheckCategory;
  score: number;
  weight: number;
};

export type AnalysisReport = {
  requestedUrl: string;
  finalUrl: string;
  fetchedAt: string;
  httpStatus: number;
  /** 0–100 weighted average across every check. */
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: CategoryScore[];
  checks: CheckResult[];
  /** Populated only when ENABLE_LLM_REVIEW=true and the call succeeded. */
  llmReview?: LlmReview;
};

export type LlmSuggestion = {
  title: string;
  rationale: string;
  rewrite: string;
};

export type LlmReview = {
  model: string;
  suggestions: LlmSuggestion[];
};

/** Signature every check module's default export must satisfy. */
export type CheckFn = (ctx: PageContext) => CheckResult;
