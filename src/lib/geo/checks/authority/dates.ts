import type { CheckFn } from "../../types";
import { extractJsonLd } from "../../schema";
import { result } from "../helpers";

/**
 * Freshness signals. Answer engines prefer recent sources for anything that could
 * have changed, and an undated page is treated as unknown-age — which loses to a
 * dated competitor. `dateModified` matters more than `datePublished` because it
 * is what tells an engine the page is still maintained.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const checkDates: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];
  const now = new Date(ctx.fetchedAt);
  let score = 0;

  const { nodes } = extractJsonLd($);
  const published = nodes.map((node) => parseDate(node["datePublished"])).find(Boolean) ?? null;
  const modified = nodes.map((node) => parseDate(node["dateModified"])).find(Boolean) ?? null;

  if (published) {
    score += 25;
    findings.push(`datePublished: ${published.toISOString().slice(0, 10)}.`);
  } else {
    findings.push("No `datePublished` in structured data.");
  }

  if (modified) {
    score += 30;
    findings.push(`dateModified: ${modified.toISOString().slice(0, 10)}.`);
  } else {
    findings.push("No `dateModified` — engines cannot tell whether the page is maintained.");
  }

  // A <time datetime> element is the machine-readable visible counterpart.
  const timeElements = $("time[datetime]").toArray();
  if (timeElements.length > 0) {
    score += 15;
    findings.push(`${timeElements.length} <time datetime> element(s) expose the date to readers and parsers alike.`);
  } else {
    findings.push("No <time datetime> element — the date is not machine-readable in the visible copy.");
  }

  // 30 points for actual recency, on a curve: fresh today, worthless past 2 years.
  const reference = modified ?? published;
  if (reference) {
    const ageDays = Math.max(0, (now.getTime() - reference.getTime()) / DAY_MS);
    findings.push(`Most recent date is ${Math.round(ageDays)} days old.`);

    if (ageDays <= 180) score += 30;
    else if (ageDays <= 365) score += 20;
    else if (ageDays <= 730) score += 10;
    else findings.push("Over two years old — engines will prefer a fresher source for anything time-sensitive.");

    if (reference.getTime() > now.getTime() + DAY_MS) {
      score -= 15;
      findings.push("The date is in the future, which reads as a templating bug.");
    }
  }

  if (modified && published && modified.getTime() < published.getTime()) {
    score -= 10;
    findings.push("`dateModified` is earlier than `datePublished` — the two are inconsistent.");
  }

  return result({
    id: "dates",
    label: "Publish and update dates",
    category: "authority",
    score,
    weight: 5,
    findings,
    fix:
      score >= 80
        ? "Keep `dateModified` updated whenever the substance changes — not on every deploy."
        : "Add `datePublished` and `dateModified` (ISO 8601) to the Article JSON-LD and show the date in a <time datetime> element.",
  });
};

export default checkDates;
