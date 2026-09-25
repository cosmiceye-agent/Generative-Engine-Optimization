import type { CheckFn } from "../../types";
import { result, resolveUrl } from "../helpers";

/**
 * The canonical URL tells an engine which address to attribute the content to.
 * When it is missing, wrong, or points somewhere else, citations get split across
 * duplicate URLs or handed to another page entirely.
 */
const checkCanonical: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  const tags = $('link[rel="canonical" i]').toArray();
  const hrefs = tags
    .map((node) => $(node).attr("href")?.trim())
    .filter((href): href is string => Boolean(href));

  if (hrefs.length === 0) {
    return result({
      id: "canonical",
      label: "Canonical URL",
      category: "authority",
      score: 0,
      weight: 5,
      findings: ["No <link rel=\"canonical\"> on the page."],
      fix: `Add <link rel="canonical" href="${ctx.finalUrl}"> so engines attribute the content to one address.`,
    });
  }

  if (hrefs.length > 1) {
    findings.push(`${hrefs.length} canonical tags found — engines will ignore all of them.`);
    return result({
      id: "canonical",
      label: "Canonical URL",
      category: "authority",
      score: 20,
      weight: 5,
      findings,
      fix: "Emit exactly one <link rel=\"canonical\">. Multiple conflicting tags are treated as no tag at all.",
    });
  }

  const canonical = resolveUrl(hrefs[0], ctx.finalUrl);
  if (!canonical) {
    return result({
      id: "canonical",
      label: "Canonical URL",
      category: "authority",
      score: 25,
      weight: 5,
      findings: [`Canonical href "${hrefs[0]}" is not a resolvable URL.`],
      fix: "Set the canonical to an absolute https URL.",
    });
  }

  let score = 60;
  findings.push(`Canonical: ${canonical.href}`);

  if (/^https?:\/\//i.test(hrefs[0])) {
    score += 15;
  } else {
    findings.push("The canonical href is relative. Use an absolute URL — relative canonicals are error-prone across environments.");
  }

  if (canonical.protocol === "https:") {
    score += 10;
  } else {
    findings.push("The canonical points at an http:// URL.");
    score -= 10;
  }

  const current = new URL(ctx.finalUrl);
  const sameHost = canonical.hostname.replace(/^www\./, "") === current.hostname.replace(/^www\./, "");
  const samePath = canonical.pathname.replace(/\/$/, "") === current.pathname.replace(/\/$/, "");

  if (sameHost && samePath) {
    score += 15;
    findings.push("The canonical matches the URL that was fetched — this page is its own canonical.");
  } else if (!sameHost) {
    score = Math.min(score, 30);
    findings.push(
      `The canonical points at a different domain (${canonical.hostname}). All citation credit goes there instead.`,
    );
  } else {
    score = Math.min(score, 55);
    findings.push(`The canonical points at a different path (${canonical.pathname}), so this URL is treated as a duplicate.`);
  }

  return result({
    id: "canonical",
    label: "Canonical URL",
    category: "authority",
    score,
    weight: 5,
    findings,
    fix:
      score >= 80
        ? "Canonical is correct — keep it absolute and self-referencing on primary content pages."
        : `Point the canonical at the absolute https URL this content should be attributed to (likely ${ctx.finalUrl}).`,
  });
};

export default checkCanonical;
