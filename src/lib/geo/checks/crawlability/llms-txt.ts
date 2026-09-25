import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * /llms.txt is an emerging convention (llmstxt.org): a Markdown index at the site
 * root that points language models at the canonical, clean version of your key
 * pages. Support is not universal, so it is scored as a real but modest bonus —
 * a site is not broken without one.
 */
const checkLlmsTxt: CheckFn = (ctx) => {
  const findings: string[] = [];

  if (!ctx.llmsTxt || !ctx.llmsTxt.ok) {
    findings.push(
      ctx.llmsTxt?.status
        ? `/llms.txt returned HTTP ${ctx.llmsTxt.status}.`
        : "/llms.txt could not be fetched.",
    );
    return result({
      id: "llms-txt",
      label: "/llms.txt present",
      category: "crawlability",
      score: 0,
      weight: 3,
      findings,
      fix: "Publish /llms.txt: an H1 with the site name, a blockquote summary, then Markdown link lists of your most citable pages. See llmstxt.org.",
    });
  }

  const body = ctx.llmsTxt.body.trim();
  const lines = body.split(/\r?\n/);
  const hasH1 = lines.some((line) => /^#\s+\S/.test(line.trim()));
  const hasSummary = lines.some((line) => /^>\s*\S/.test(line.trim()));
  const linkCount = (body.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;

  // An llms.txt that exists but is empty or link-free gives a model nothing to
  // follow, so presence alone only earns part of the score.
  let score = 50;
  if (hasH1) score += 15;
  if (hasSummary) score += 10;
  if (linkCount >= 3) score += 25;
  else if (linkCount > 0) score += 10;

  findings.push(`/llms.txt found (${body.length} bytes).`);
  findings.push(hasH1 ? "Has an H1 title." : "Missing an H1 title line.");
  findings.push(hasSummary ? "Has a blockquote summary." : "Missing the `>` blockquote summary.");
  findings.push(`Contains ${linkCount} Markdown link${linkCount === 1 ? "" : "s"}.`);

  if (!ctx.llmsTxt.contentType.includes("text/")) {
    findings.push(`Served as "${ctx.llmsTxt.contentType || "unknown"}" — text/plain or text/markdown is expected.`);
    score -= 10;
  }

  return result({
    id: "llms-txt",
    label: "/llms.txt present",
    category: "crawlability",
    score,
    weight: 3,
    findings,
    fix:
      linkCount >= 3 && hasH1 && hasSummary
        ? "Keep /llms.txt in sync with your sitemap, and consider adding /llms-full.txt with the full Markdown text of each page."
        : "Give /llms.txt an `# H1` site name, a `>` one-line summary, and Markdown link lists grouped by section.",
  });
};

export default checkLlmsTxt;
