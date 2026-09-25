import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * Title and meta description are what an engine shows *around* a citation. A
 * description that is missing, truncated, or duplicated from the title wastes the
 * one piece of summary copy you get to write yourself.
 */
const IDEAL_MIN = 120;
const IDEAL_MAX = 160;

const checkMetaDescription: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];
  let score = 0;

  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const description = ($('meta[name="description" i]').attr("content") ?? "").replace(/\s+/g, " ").trim();

  // 40 points for the title.
  if (title.length === 0) {
    findings.push("No <title> element.");
  } else {
    findings.push(`Title (${title.length} chars): "${title}".`);
    if (title.length >= 20 && title.length <= 65) score += 40;
    else {
      score += 20;
      findings.push(
        title.length < 20
          ? "The title is too short to describe the page."
          : "The title runs past 65 characters and will be truncated in results.",
      );
    }
  }

  // 60 points for the description.
  if (description.length === 0) {
    findings.push("No meta description — engines will synthesise one from the body copy.");
  } else {
    findings.push(`Meta description (${description.length} chars): "${description}".`);

    if (description.length >= IDEAL_MIN && description.length <= IDEAL_MAX) {
      score += 45;
    } else if (description.length >= 70 && description.length <= 200) {
      score += 30;
      findings.push(`Outside the ${IDEAL_MIN}–${IDEAL_MAX} character sweet spot.`);
    } else {
      score += 10;
      findings.push(
        description.length < 70
          ? "Too short to summarise the page."
          : "Long enough that it will be cut off.",
      );
    }

    // A description that answers something beats one that markets something.
    if (/\b(is|are|how|what|why|means|includes|explains)\b/i.test(description)) {
      score += 15;
      findings.push("The description makes a substantive claim rather than a sales pitch.");
    } else {
      findings.push("The description does not state what the page actually answers.");
    }

    if (title && description.toLowerCase() === title.toLowerCase()) {
      score -= 20;
      findings.push("The description simply duplicates the title.");
    }
  }

  return result({
    id: "meta-description",
    label: "Title and meta description",
    category: "content",
    score,
    weight: 4,
    findings,
    fix:
      score >= 80
        ? "Keep the description as a one-sentence answer, not a tagline."
        : `Write a ${IDEAL_MIN}–${IDEAL_MAX} character meta description that answers the page's question in one sentence, and keep the <title> under 65 characters.`,
  });
};

export default checkMetaDescription;
