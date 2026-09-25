import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * Open Graph and Twitter card tags.
 *
 * These matter less for whether a model *understands* the page and more for how
 * the page appears once an assistant or a person shares it. They also act as a
 * redundant, easily-parsed copy of the title/description — useful when the main
 * markup is messy. Hence the modest weight.
 */
const REQUIRED_OG = ["og:title", "og:description", "og:type", "og:url"];

const checkOpenGraph: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  const read = (property: string): string =>
    ($(`meta[property="${property}" i]`).attr("content") ?? $(`meta[name="${property}" i]`).attr("content") ?? "").trim();

  const present = REQUIRED_OG.filter((property) => read(property).length > 0);
  const missing = REQUIRED_OG.filter((property) => read(property).length === 0);

  // 55 points for the four core OG properties.
  let score = (present.length / REQUIRED_OG.length) * 55;

  if (present.length > 0) findings.push(`Open Graph tags present: ${present.join(", ")}.`);
  if (missing.length > 0) findings.push(`Missing: ${missing.join(", ")}.`);

  // 25 points for an image, which is what actually renders in a share card.
  const image = read("og:image");
  if (image) {
    score += 25;
    findings.push(`og:image set to ${image.slice(0, 100)}.`);
    if (!read("og:image:alt")) {
      findings.push("No og:image:alt — the image is undescribed for screen readers and parsers.");
      score -= 5;
    }
  } else {
    findings.push("No og:image — shares render as a bare link.");
  }

  // 20 points for Twitter card tags.
  const cardType = read("twitter:card");
  if (cardType) {
    score += 20;
    findings.push(`twitter:card is "${cardType}".`);
  } else {
    findings.push("No twitter:card tag.");
  }

  const ogUrl = read("og:url");
  if (ogUrl) {
    try {
      const canonicalHost = new URL(ogUrl).hostname.replace(/^www\./, "");
      const actualHost = new URL(ctx.finalUrl).hostname.replace(/^www\./, "");
      if (canonicalHost !== actualHost) {
        score -= 10;
        findings.push(`og:url points at a different host (${canonicalHost}).`);
      }
    } catch {
      score -= 10;
      findings.push(`og:url "${ogUrl}" is not a valid absolute URL.`);
    }
  }

  return result({
    id: "open-graph",
    label: "Open Graph and Twitter tags",
    category: "content",
    score,
    weight: 3,
    findings,
    fix:
      score >= 80
        ? "Social metadata is complete — keep og:url in sync with the canonical."
        : `Add the missing tags: ${[...missing, image ? null : "og:image", cardType ? null : "twitter:card"].filter(Boolean).join(", ")}.`,
  });
};

export default checkOpenGraph;
