import type { ParsedRobots, RobotsGroup } from "./types";

/**
 * The AI crawlers we grade a site against, grouped by who operates them and what
 * the bot is actually for — training, live retrieval for an answer, or a user-
 * triggered fetch. Blocking a *retrieval* bot is what removes you from citations;
 * blocking a *training* bot is a legitimate editorial choice, so the two are
 * weighted differently by the ai-bot-access check.
 */
export type AiBot = {
  token: string;
  operator: string;
  purpose: "training" | "retrieval" | "user-action" | "search";
  /** How much this bot matters for being cited, 0–1. */
  citationImpact: number;
};

export const AI_BOTS: AiBot[] = [
  { token: "GPTBot", operator: "OpenAI", purpose: "training", citationImpact: 0.4 },
  { token: "OAI-SearchBot", operator: "OpenAI", purpose: "search", citationImpact: 1 },
  { token: "ChatGPT-User", operator: "OpenAI", purpose: "user-action", citationImpact: 0.9 },
  { token: "ClaudeBot", operator: "Anthropic", purpose: "training", citationImpact: 0.5 },
  { token: "Claude-User", operator: "Anthropic", purpose: "user-action", citationImpact: 0.9 },
  { token: "PerplexityBot", operator: "Perplexity", purpose: "search", citationImpact: 1 },
  { token: "Google-Extended", operator: "Google", purpose: "training", citationImpact: 0.6 },
  { token: "Bingbot", operator: "Microsoft", purpose: "search", citationImpact: 0.9 },
  { token: "CCBot", operator: "Common Crawl", purpose: "training", citationImpact: 0.3 },
];

/**
 * Parse robots.txt into user-agent groups.
 *
 * Per the RFC 9309 grammar, consecutive `User-agent` lines share the rules that
 * follow them, and a blank line or a rule line ends the run of agents. Comments
 * start at `#` anywhere on the line.
 */
export function parseRobotsTxt(body: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];

  let current: RobotsGroup | null = null;
  // True while we are still collecting the `User-agent:` lines that open a group.
  let collectingAgents = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (line === "") {
      collectingAgents = false;
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!collectingAgents || current === null) {
        current = { userAgents: [], allow: [], disallow: [] };
        groups.push(current);
        collectingAgents = true;
      }
      current.userAgents.push(value.toLowerCase());
      continue;
    }

    if (field === "sitemap") {
      // Sitemap is a group-independent directive.
      if (value) sitemaps.push(value);
      continue;
    }

    if (field === "allow" || field === "disallow") {
      collectingAgents = false;
      if (current === null) continue; // rule before any user-agent — ignore
      if (field === "allow") current.allow.push(value);
      else current.disallow.push(value);
    }
  }

  return { groups, sitemaps };
}

/** Convert a robots.txt path pattern (supporting `*` and `$`) into a regex. */
function patternToRegex(pattern: string): RegExp {
  let source = "";
  for (const char of pattern) {
    if (char === "*") source += ".*";
    else if (char === "$") source += "$";
    else source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}`);
}

type Rule = { pattern: string; allow: boolean };

/**
 * Decide whether `path` is crawlable by `token`.
 *
 * Follows RFC 9309 matching: the most specific group wins (an exact user-agent
 * match beats `*`), and within a group the longest matching pattern wins, with
 * Allow beating Disallow on an equal-length tie.
 */
export function isPathAllowed(robots: ParsedRobots, token: string, path: string): boolean {
  const needle = token.toLowerCase();

  const specific = robots.groups.filter((group) =>
    group.userAgents.some((agent) => agent === needle),
  );
  const wildcard = robots.groups.filter((group) => group.userAgents.includes("*"));

  const applicable = specific.length > 0 ? specific : wildcard;
  if (applicable.length === 0) return true; // no rules address this bot

  const rules: Rule[] = [];
  for (const group of applicable) {
    for (const pattern of group.allow) rules.push({ pattern, allow: true });
    for (const pattern of group.disallow) rules.push({ pattern, allow: false });
  }

  let best: { length: number; allow: boolean } | null = null;
  for (const rule of rules) {
    // An empty `Disallow:` means "allow everything" and matches nothing.
    if (rule.pattern === "") {
      if (!rule.allow && (best === null || best.length === 0)) {
        best = { length: 0, allow: true };
      }
      continue;
    }
    if (!patternToRegex(rule.pattern).test(path)) continue;

    const length = rule.pattern.length;
    if (best === null || length > best.length || (length === best.length && rule.allow)) {
      best = { length, allow: rule.allow };
    }
  }

  return best === null ? true : best.allow;
}

/** True when the robots.txt has an explicit group naming this bot by token. */
export function hasExplicitGroup(robots: ParsedRobots, token: string): boolean {
  const needle = token.toLowerCase();
  return robots.groups.some((group) => group.userAgents.includes(needle));
}
