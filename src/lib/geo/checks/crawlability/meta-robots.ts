import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * Page-level indexing directives, from both `<meta name="robots">` and the
 * `X-Robots-Tag` header. These are easy to leave switched on by accident after a
 * staging deploy, and a single `noindex` silently removes the page from every
 * answer engine.
 */
const DIRECTIVE_NAMES = ["robots", "googlebot", "google", "bingbot"];

function parseDirectives(value: string): string[] {
  return value
    .toLowerCase()
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

const checkMetaRobots: CheckFn = (ctx) => {
  const findings: string[] = [];
  const { $ } = ctx;
  const directives = new Set<string>();

  for (const name of DIRECTIVE_NAMES) {
    $(`meta[name="${name}" i]`).each((_, node) => {
      const content = $(node).attr("content") ?? "";
      if (!content) return;
      findings.push(`<meta name="${name}" content="${content}">`);
      for (const directive of parseDirectives(content)) directives.add(directive);
    });
  }

  const header = ctx.headers["x-robots-tag"];
  if (header) {
    findings.push(`X-Robots-Tag: ${header}`);
    // The header may carry a `bot: directives` prefix; the directives are what matter.
    for (const directive of parseDirectives(header.replace(/^[^:,]+:\s*/, ""))) {
      directives.add(directive);
    }
  }

  let score = 100;

  if (directives.has("noindex") || directives.has("none")) {
    score = 0;
    findings.push("`noindex` is set — this page is excluded from search and AI indexes entirely.");
  }
  if (directives.has("nofollow")) {
    score = Math.min(score, 60);
    findings.push("`nofollow` is set — crawlers will not follow links out of this page.");
  }
  if (directives.has("nosnippet")) {
    score = Math.min(score, 25);
    findings.push(
      "`nosnippet` is set — engines may index the page but must not quote it, which blocks citation outright.",
    );
  }
  if (directives.has("noarchive")) {
    score = Math.min(score, 75);
    findings.push("`noarchive` is set — no cached copy will be kept.");
  }
  if (directives.has("max-snippet")) {
    const raw = [...directives].find((entry) => entry.startsWith("max-snippet"));
    findings.push(`Snippet length is capped (${raw}), which limits how much can be quoted.`);
    score = Math.min(score, 85);
  }

  if (directives.size === 0) {
    findings.push("No robots meta tag or X-Robots-Tag header — the page is indexable by default.");
  }

  return result({
    id: "meta-robots",
    label: "Indexing directives",
    category: "crawlability",
    score,
    weight: 7,
    findings,
    fix:
      score === 100
        ? "Nothing to change. If you want to be explicit, `<meta name=\"robots\" content=\"index, follow, max-snippet:-1\">` states the intent."
        : "Remove the restrictive directives from the robots meta tag and the X-Robots-Tag header. `max-snippet:-1` lets engines quote as much as they need.",
  });
};

export default checkMetaRobots;
