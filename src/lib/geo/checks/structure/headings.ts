import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * Heading hierarchy is how a retrieval system decides which *slice* of a page
 * answers a question. A page with one H1 and a clean H2/H3 tree chunks cleanly;
 * a page that jumps H1 → H4, or has six H1s, gets chunked arbitrarily and its
 * passages lose their context.
 */
const checkHeadings: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  const headings = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((node) => ({
      level: Number($(node).prop("tagName")?.slice(1) ?? 0),
      text: $(node).text().replace(/\s+/g, " ").trim(),
    }))
    .filter((heading) => heading.level > 0);

  const h1s = headings.filter((heading) => heading.level === 1);
  let score = 0;

  // 40 points: exactly one H1.
  if (h1s.length === 1) {
    score += 40;
    findings.push(`Single H1: "${h1s[0].text.slice(0, 80)}".`);
  } else if (h1s.length === 0) {
    findings.push("No H1 — there is no single statement of what this page is about.");
  } else {
    score += 10;
    findings.push(`${h1s.length} H1 elements found. Engines cannot tell which is the page's subject.`);
  }

  // 30 points: enough subheadings to chunk against.
  const subheadings = headings.filter((heading) => heading.level >= 2 && heading.level <= 3);
  if (subheadings.length >= 3) {
    score += 30;
    findings.push(`${subheadings.length} H2/H3 subheadings give the page clear sections.`);
  } else if (subheadings.length > 0) {
    score += 15;
    findings.push(`Only ${subheadings.length} H2/H3 subheading(s) — long sections are hard to chunk.`);
  } else {
    findings.push("No H2 or H3 subheadings — the page is one undifferentiated block.");
  }

  // 30 points: no skipped levels on the way down.
  const skips: string[] = [];
  for (let i = 1; i < headings.length; i += 1) {
    const jump = headings[i].level - headings[i - 1].level;
    if (jump > 1) {
      skips.push(`H${headings[i - 1].level} → H${headings[i].level} at "${headings[i].text.slice(0, 50)}"`);
    }
  }
  if (skips.length === 0 && headings.length > 0) {
    score += 30;
    findings.push("Heading levels descend one at a time with no gaps.");
  } else if (skips.length > 0) {
    score += Math.max(0, 30 - skips.length * 10);
    findings.push(`${skips.length} skipped heading level(s): ${skips.slice(0, 3).join("; ")}.`);
  }

  const empty = headings.filter((heading) => heading.text.length === 0).length;
  if (empty > 0) {
    score -= empty * 5;
    findings.push(`${empty} heading element(s) contain no text.`);
  }

  return result({
    id: "headings",
    label: "Heading hierarchy",
    category: "structure",
    score,
    weight: 8,
    findings,
    fix:
      h1s.length !== 1
        ? "Use exactly one H1 stating the page's subject, then H2s for each major section and H3s beneath them."
        : skips.length > 0
          ? "Do not skip heading levels — go H2 → H3 rather than H2 → H4, so each section nests under the right parent."
          : "Keep the hierarchy as it is; it chunks cleanly for retrieval.",
  });
};

export default checkHeadings;
