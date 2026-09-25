import type { CheckFn } from "../../types";
import { result, resolveUrl, scale } from "../helpers";

/**
 * Outbound citations to primary sources.
 *
 * Pages that cite their sources get cited in turn: a model assembling an answer
 * treats a claim backed by a link to a standards body or a study as more
 * dependable than a bare assertion. Links to reputable TLDs and known reference
 * domains are weighted above ordinary outbound links.
 */
const REPUTABLE_HOSTS = [
  "wikipedia.org", "nih.gov", "who.int", "nature.com", "science.org", "arxiv.org",
  "doi.org", "ieee.org", "acm.org", "w3.org", "ietf.org", "rfc-editor.org",
  "schema.org", "developer.mozilla.org", "nist.gov", "oecd.org", "worldbank.org",
  "pubmed.ncbi.nlm.nih.gov", "jstor.org", "springer.com", "sciencedirect.com",
];

const REPUTABLE_TLDS = [".gov", ".edu", ".int", ".ac.uk", ".gov.uk"];

const checkOutboundCitations: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  let pageHost: string;
  try {
    pageHost = new URL(ctx.finalUrl).hostname.replace(/^www\./, "");
  } catch {
    pageHost = "";
  }

  // Only count links inside the content area — a footer full of partner links is
  // not a citation.
  const contentLinks = $("main a[href], article a[href], [role='main'] a[href]");
  const links = (contentLinks.length > 0 ? contentLinks : $("a[href]"))
    .toArray()
    .map((node) => {
      const href = $(node).attr("href") ?? "";
      return { url: resolveUrl(href, ctx.finalUrl), text: $(node).text().trim() };
    })
    .filter(
      (link): link is { url: URL; text: string } =>
        link.url !== null && (link.url.protocol === "http:" || link.url.protocol === "https:"),
    );

  const external = links.filter((link) => {
    const host = link.url.hostname.replace(/^www\./, "");
    return host !== pageHost && !host.endsWith(`.${pageHost}`);
  });

  const uniqueHosts = [...new Set(external.map((link) => link.url.hostname.replace(/^www\./, "")))];

  const reputable = uniqueHosts.filter(
    (host) =>
      REPUTABLE_HOSTS.some((known) => host === known || host.endsWith(`.${known}`)) ||
      REPUTABLE_TLDS.some((tld) => host.endsWith(tld)),
  );

  findings.push(`${external.length} outbound link(s) across ${uniqueHosts.length} external domain(s).`);

  // Half the score for citing anything at all, half for citing sources that carry
  // weight. Three reputable domains is the target.
  const breadthScore = scale(uniqueHosts.length, 0, 4) * 0.5;
  const qualityScore = scale(reputable.length, 0, 3) * 0.5;
  let score = breadthScore + qualityScore;

  if (reputable.length > 0) {
    findings.push(`Cites ${reputable.length} reputable source domain(s): ${reputable.slice(0, 5).join(", ")}.`);
  } else if (uniqueHosts.length > 0) {
    findings.push("No links to primary sources, standards bodies, research or government domains.");
  } else {
    findings.push("The content cites no external sources at all.");
  }

  // Marking every outbound link nofollow tells engines you do not vouch for them,
  // which undercuts the point of citing.
  const nofollowed = external.filter((link) => {
    const node = $(`a[href="${link.url.href}"]`).first();
    return (node.attr("rel") ?? "").toLowerCase().includes("nofollow");
  });
  if (external.length > 0 && nofollowed.length === external.length) {
    score -= 10;
    findings.push("Every outbound link is rel=nofollow, which signals you do not stand behind the sources.");
  }

  const bareUrls = external.filter((link) => /^https?:\/\//i.test(link.text)).length;
  if (bareUrls > 0) {
    findings.push(`${bareUrls} link(s) use a bare URL as anchor text rather than the source's name.`);
    score -= Math.min(10, bareUrls * 2);
  }

  return result({
    id: "outbound-citations",
    label: "Outbound citations",
    category: "authority",
    score,
    weight: 5,
    findings,
    fix:
      score >= 80
        ? "Keep citing primary sources inline — it is a large part of why a page gets cited back."
        : "Link each factual claim to its primary source (a study, a standard, an official statistic), using the source's name as the anchor text.",
  });
};

export default checkOutboundCitations;
