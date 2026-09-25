import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * An explicit FAQ block is the highest-yield structure in GEO: each entry is a
 * self-contained question/answer pair, which is exactly the unit an answer engine
 * wants to retrieve. Pairing it with FAQPage JSON-LD (scored separately under
 * authority) makes the pairing machine-readable rather than inferred.
 */
const FAQ_HEADING = /\b(faq|faqs|frequently asked|common questions|questions & answers|q&a)\b/i;

const checkFaqSection: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];
  let score = 0;

  const faqHeadings = $("h1, h2, h3")
    .toArray()
    .map((node) => $(node).text().trim())
    .filter((text) => FAQ_HEADING.test(text));

  const questionHeadings = $("h2, h3, h4")
    .toArray()
    .map((node) => $(node).text().trim())
    .filter((text) => text.endsWith("?"));

  // <details>/<summary> is the common accordion pattern and is fully readable in
  // raw HTML, unlike a JS-driven accordion.
  const detailsBlocks = $("details").toArray();
  const detailQuestions = detailsBlocks.filter((node) =>
    $(node).find("summary").text().trim().endsWith("?"),
  );

  const hasFaqJsonLd = ctx.html.includes('"FAQPage"');

  if (faqHeadings.length > 0) {
    score += 30;
    findings.push(`FAQ section heading found: "${faqHeadings[0].slice(0, 70)}".`);
  } else {
    findings.push("No heading identifies an FAQ section.");
  }

  const pairCount = Math.max(questionHeadings.length, detailQuestions.length);
  if (pairCount >= 3) {
    score += 45;
    findings.push(`${pairCount} question/answer pairs found.`);
  } else if (pairCount > 0) {
    score += 20;
    findings.push(`Only ${pairCount} question/answer pair(s) — three or more makes the section worth retrieving.`);
  } else {
    findings.push("No question-and-answer pairs found.");
  }

  if (detailQuestions.length > 0) {
    findings.push(`${detailQuestions.length} pair(s) use <details>/<summary>, which stays readable without JavaScript.`);
  }

  if (hasFaqJsonLd) {
    score += 25;
    findings.push("FAQPage JSON-LD is present, making the pairs machine-readable.");
  } else if (pairCount > 0) {
    findings.push("The Q&A pairs are not backed by FAQPage JSON-LD.");
  }

  return result({
    id: "faq-section",
    label: "FAQ section",
    category: "structure",
    score,
    weight: 6,
    findings,
    fix:
      score >= 80
        ? "Keep the FAQ in sync with the questions you actually get asked."
        : "Add an FAQ section of at least three real questions as H3 headings, answer each in 40–60 words, and mark it up with FAQPage JSON-LD.",
  });
};

export default checkFaqSection;
