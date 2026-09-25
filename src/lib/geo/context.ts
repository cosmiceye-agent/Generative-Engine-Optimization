import * as cheerio from "cheerio";
import type { FetchedResource, PageContext } from "./types";
import { parseRobotsTxt } from "./robots-txt";

/** Elements whose text is never part of the readable content. */
const NON_CONTENT_SELECTOR = "script, style, noscript, template, svg, iframe, nav, header, footer";

/** Selectors tried in order when looking for the primary content container. */
const MAIN_SELECTORS = ["main", "article", '[role="main"]', "#content", ".content", "#main"];

/**
 * Elements that end a block of text. Cheerio's `.text()` concatenates
 * descendants with no separator, so without this a heading would run straight
 * into the paragraph beneath it ("How to compostHome composting is…") and every
 * downstream sentence split would be wrong.
 */
const BLOCK_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, li, dt, dd, td, th, tr, blockquote, pre, figcaption, summary, details, section, article, div, br, hr";

export function normaliseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/**
 * Collapse runs of spaces within each line while keeping the newlines that mark
 * block boundaries, and drop lines that are now empty.
 */
function normaliseBlockText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Extract the readable body text, one block per line.
 *
 * Preference order is `<main>` → `<article>` → role=main → common id/class names →
 * `<body>`. Falling back to `<body>` matters: a page with no semantic landmark is
 * exactly the kind of page this tool should still be able to grade (and will
 * penalise elsewhere).
 */
export function extractMainText($: cheerio.CheerioAPI): string {
  const working = cheerio.load($.html());
  working(NON_CONTENT_SELECTOR).remove();
  // Insert an explicit boundary after every block element before reading text.
  working(BLOCK_SELECTOR).after("\n");

  for (const selector of MAIN_SELECTORS) {
    const node = working(selector).first();
    if (node.length > 0) {
      const text = normaliseBlockText(node.text());
      if (text.length > 200) return text;
    }
  }

  return normaliseBlockText(working("body").text());
}

export type BuildContextInput = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  html: string;
  htmlBytes: number;
  robotsTxt: FetchedResource | null;
  llmsTxt: FetchedResource | null;
  sitemap: FetchedResource | null;
  fetchedAt?: string;
};

/** Assemble the immutable snapshot that every check function reads from. */
export function buildPageContext(input: BuildContextInput): PageContext {
  const $ = cheerio.load(input.html);

  return {
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl,
    status: input.status,
    headers: input.headers,
    html: input.html,
    $,
    text: extractMainText($),
    htmlBytes: input.htmlBytes,
    robotsTxt: input.robotsTxt,
    parsedRobots:
      input.robotsTxt && input.robotsTxt.ok ? parseRobotsTxt(input.robotsTxt.body) : null,
    llmsTxt: input.llmsTxt,
    sitemap: input.sitemap,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
  };
}

/**
 * Test helper: build a context from a bare HTML string, with everything else
 * defaulted. Keeps the check unit tests free of fetch plumbing.
 */
export function contextFromHtml(
  html: string,
  overrides: Partial<BuildContextInput> = {},
): PageContext {
  return buildPageContext({
    requestedUrl: "https://example.com/page",
    finalUrl: "https://example.com/page",
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    html,
    htmlBytes: Buffer.byteLength(html),
    robotsTxt: null,
    llmsTxt: null,
    sitemap: null,
    fetchedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}
