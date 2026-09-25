import type { CheckFn } from "../../types";
import { result } from "../helpers";
import { splitWords } from "../../readability";

/**
 * Does the page answer its own question up front?
 *
 * Extractive systems weight the opening of a document heavily. A page that opens
 * with "In today's fast-paced world…" has buried its answer below the window the
 * model actually reads; one that opens with "GEO is the practice of…" hands over
 * a quotable sentence immediately.
 */
const HEDGE_OPENERS = [
  /^in today'?s\b/i,
  /^in the world of\b/i,
  /^we all know\b/i,
  /^have you ever\b/i,
  /^it'?s no secret\b/i,
  /^when it comes to\b/i,
  /^in this (article|post|guide),? (we|i)'?ll\b/i,
  /^welcome to\b/i,
  /^as (we|you) (all )?know\b/i,
];

/**
 * "X is a Y" — the shape a model can lift verbatim as a definition.
 *
 * The determiner is required. Without it the pattern matches any sentence
 * containing "is" or "are" ("businesses are constantly looking…"), which would
 * credit pages that define nothing.
 *
 * The gap between subject and verb is `[^.!?]` rather than word characters so
 * that a parenthetical survives: "Generative Engine Optimization (GEO) is the
 * practice of…" is the single most common way a definition is actually written.
 */
const DEFINITION_SHAPE =
  /\b[\w-]+[^.!?]{0,60}?\s+(?:is|are)\s+(?:a|an|the)\s+[\w-]+|\b[\w-]+[^.!?]{0,60}?\s+(?:means|refers to|is defined as|stands for|describes)\s+[\w-]+/i;

const checkDirectAnswer: CheckFn = (ctx) => {
  const findings: string[] = [];

  // Evaluate the body prose only. `ctx.text` leads with the headings, and an
  // "opening" that is really the H1 would make the checks below trivially pass.
  const paragraphs = ctx
    .$("main p, article p, p")
    .toArray()
    .map((node) => ctx.$(node).text().replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);

  const prose = paragraphs.join(" ");
  const words = splitWords(prose);

  if (words.length < 30) {
    return result({
      id: "direct-answer",
      label: "Direct answer in the opening",
      category: "content",
      score: 0,
      weight: 9,
      findings: [`Only ${words.length} words of body text — there is no opening to evaluate.`],
      fix: "Open the page with a 2–3 sentence answer to the question the page exists to answer.",
    });
  }

  const opening = words.slice(0, 100).join(" ");
  const firstParagraph = paragraphs[0] ?? "";
  let score = 0;

  // 40 points: the opening states a definition or direct claim.
  if (DEFINITION_SHAPE.test(opening)) {
    score += 40;
    findings.push("The first 100 words contain a definition-shaped sentence a model can quote.");
  } else {
    findings.push("The first 100 words contain no direct \"X is Y\" statement.");
  }

  // 30 points: no throat-clearing opener. Tested against the first paragraph,
  // since these patterns are anchored to how the prose actually begins.
  const hedge = HEDGE_OPENERS.find((pattern) => pattern.test(firstParagraph));
  if (hedge) {
    findings.push("The page opens with a generic preamble rather than the answer.");
  } else {
    score += 30;
    findings.push("The opening gets to the point without a filler preamble.");
  }

  // 20 points: the first paragraph is a sensible, self-contained length.
  const firstWords = splitWords(firstParagraph).length;
  if (firstWords >= 20 && firstWords <= 90) {
    score += 20;
    findings.push(`The first paragraph is ${firstWords} words — a self-contained, quotable unit.`);
  } else if (firstWords > 0) {
    score += 8;
    findings.push(
      `The first paragraph is ${firstWords} words (${firstWords < 20 ? "too short to answer anything" : "long enough that the answer is diluted"}).`,
    );
  }

  // 10 points: the H1's subject actually appears in the opening.
  const h1 = ctx.$("h1").first().text().replace(/\s+/g, " ").trim();
  if (h1) {
    const keywords = splitWords(h1)
      .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter((word) => word.length > 3);
    const echoed = keywords.filter((word) => opening.toLowerCase().includes(word));
    if (keywords.length > 0 && echoed.length / keywords.length >= 0.5) {
      score += 10;
      findings.push("The opening restates the H1's subject, so the passage stands alone out of context.");
    } else {
      findings.push("The opening does not restate the H1's subject — an extracted passage would lack context.");
    }
  }

  findings.push(`Opening reads: "${opening.slice(0, 160)}…"`);

  return result({
    id: "direct-answer",
    label: "Direct answer in the opening",
    category: "content",
    score,
    weight: 9,
    findings,
    fix:
      score >= 80
        ? "Keep leading with the answer — this is the passage most likely to be quoted."
        : "Rewrite the opening so the first sentence answers the page's core question outright, naming the subject rather than referring to \"it\".",
  });
};

export default checkDirectAnswer;
