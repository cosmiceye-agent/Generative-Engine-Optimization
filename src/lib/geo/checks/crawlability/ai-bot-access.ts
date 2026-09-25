import type { CheckFn } from "../../types";
import { AI_BOTS, hasExplicitGroup, isPathAllowed } from "../../robots-txt";
import { result } from "../helpers";

/**
 * The single most consequential GEO check: if robots.txt disallows the retrieval
 * bots, nothing else on the page can earn a citation.
 *
 * Scoring is weighted by each bot's `citationImpact` rather than counting bots,
 * because blocking CCBot (training corpus) is a defensible editorial choice while
 * blocking OAI-SearchBot (live retrieval for ChatGPT answers) removes you from
 * answers outright. A site that blocks only training bots still scores well.
 */
const checkAiBotAccess: CheckFn = (ctx) => {
  const findings: string[] = [];
  const path = new URL(ctx.finalUrl).pathname;

  if (!ctx.robotsTxt || ctx.robotsTxt.status === 0) {
    findings.push("Could not fetch /robots.txt — the request failed or timed out.");
    return result({
      id: "ai-bot-access",
      label: "AI crawler access in robots.txt",
      category: "crawlability",
      // No robots.txt reachable is not the same as being blocked: crawlers treat
      // an unreachable robots.txt conservatively, so this is a warn, not a fail.
      score: 55,
      weight: 10,
      findings,
      fix: "Make /robots.txt reachable and return it as text/plain with a 200 status.",
    });
  }

  if (!ctx.robotsTxt.ok || !ctx.parsedRobots) {
    findings.push(
      `/robots.txt returned HTTP ${ctx.robotsTxt.status}. Crawlers treat a missing robots.txt as "everything allowed".`,
    );
    return result({
      id: "ai-bot-access",
      label: "AI crawler access in robots.txt",
      category: "crawlability",
      // Implicitly allowed, but with no explicit signal and no Sitemap line.
      score: 70,
      weight: 10,
      findings,
      fix: "Add a /robots.txt that explicitly allows OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot and Claude-User, and includes a Sitemap: line.",
    });
  }

  const robots = ctx.parsedRobots;
  const blocked: string[] = [];
  const allowed: string[] = [];
  let earned = 0;
  let possible = 0;

  for (const bot of AI_BOTS) {
    possible += bot.citationImpact;
    if (isPathAllowed(robots, bot.token, path)) {
      earned += bot.citationImpact;
      allowed.push(bot.token);
    } else {
      blocked.push(`${bot.token} (${bot.operator}, ${bot.purpose})`);
    }
  }

  const score = possible === 0 ? 100 : (earned / possible) * 100;

  if (blocked.length === 0) {
    findings.push(`All ${AI_BOTS.length} tracked AI crawlers may fetch ${path}.`);
  } else {
    findings.push(`Blocked from ${path}: ${blocked.join(", ")}.`);
    findings.push(`Allowed: ${allowed.join(", ") || "none"}.`);
  }

  const explicit = AI_BOTS.filter((bot) => hasExplicitGroup(robots, bot.token));
  findings.push(
    explicit.length > 0
      ? `Named explicitly in robots.txt: ${explicit.map((bot) => bot.token).join(", ")}.`
      : "No AI crawler is named explicitly; all of them fall through to the User-agent: * group.",
  );

  return result({
    id: "ai-bot-access",
    label: "AI crawler access in robots.txt",
    category: "crawlability",
    score,
    weight: 10,
    findings,
    fix:
      blocked.length > 0
        ? `Remove the Disallow rules covering ${path} for ${blocked.map((entry) => entry.split(" ")[0]).join(", ")}, or narrow them to the paths you really want withheld.`
        : "Keep these rules, and name the retrieval bots (OAI-SearchBot, PerplexityBot, ChatGPT-User, Claude-User) in their own groups so a future wildcard change cannot block them by accident.",
  });
};

export default checkAiBotAccess;
