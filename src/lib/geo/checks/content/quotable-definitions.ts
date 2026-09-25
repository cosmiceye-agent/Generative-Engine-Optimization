import type { CheckFn } from "../../types";
import { result, scale } from "../helpers";
import { splitSentences } from "../../readability";

/**
 * Self-contained, definition-shaped sentences.
 *
 * A sentence that begins "It does this by…" is useless once extracted — the
 * referent is gone. A sentence that begins "Generative Engine Optimization is…"
 * survives extraction intact. This check counts sentences that name their subject
 * and state a fact about it, and penalises sentences that open with a dangling
 * pronoun.
 */
const DEFINITION_PATTERNS = [
  // "X is a Y" / "X are the Y", tolerating a parenthetical between the two
  // ("Generative Engine Optimization (GEO) is the practice of…").
  /\b[A-Z][\w-]*[^.!?]{0,50}?\s+(?:is|are)\s+(?:a|an|the)\s+\w+/,
  // "X means Y" and its synonyms
  /\b[\w-]+(?:\s+[\w-]+){0,4}\s+(?:means|refers to|is defined as|stands for|describes)\s+\w+/i,
  // "the main difference is Y"
  /\bthe\s+(?:main|key|primary|biggest|most important)\s+\w+\s+(?:is|are)\s+\w+/i,
  // A noun phrase making a concrete claim: "A hot heap produces…", "Finished
  // compost is safe…". These are just as quotable as a formal definition, and a
  // page written entirely in them would otherwise score zero.
  /^(?:A|An|The|[A-Z][\w-]+)\s+(?:[\w-]+\s+){0,5}(?:is|are|has|have|needs?|requires?|produces?|takes?|costs?|contains?|includes?|provides?|works|prevents?|causes?)\b/,
  /\b(?:there are|consists of|comprises)\s+\w+/i,
];

/** Openers that make a sentence meaningless once lifted out of the page. */
const DANGLING_OPENER = /^(it|this|that|these|those|they|he|she|there|such|which|both|either)\b/i;

const checkQuotableDefinitions: CheckFn = (ctx) => {
  const findings: string[] = [];
  // Fragments shorter than five words are headings, labels and captions rather
  // than claims, and would skew both ratios.
  const sentences = splitSentences(ctx.text).filter(
    (sentence) => sentence.split(/\s+/).length >= 5,
  );

  if (sentences.length < 3) {
    return result({
      id: "quotable-definitions",
      label: "Quotable, self-contained sentences",
      category: "content",
      score: 0,
      weight: 7,
      findings: [`Only ${sentences.length} full sentence(s) of body text.`],
      fix: "Write definition-style sentences that name their subject: \"X is a Y that does Z.\"",
    });
  }

  const definitions = sentences.filter((sentence) =>
    DEFINITION_PATTERNS.some((pattern) => pattern.test(sentence)),
  );
  const dangling = sentences.filter((sentence) => DANGLING_OPENER.test(sentence));

  const definitionRatio = definitions.length / sentences.length;
  const danglingRatio = dangling.length / sentences.length;

  // The headline quality is self-containment, so it carries most of the score:
  // 70 points for the share of sentences that name their own subject rather than
  // pointing back at an earlier one. Definition-shaped sentences are the
  // strongest form of that, so they add a further 30 on top, targeting 10%.
  const selfContainedRatio = 1 - danglingRatio;
  let score = selfContainedRatio * 70 + (scale(definitionRatio, 0, 0.1) / 100) * 30;

  findings.push(
    `${sentences.length - dangling.length} of ${sentences.length} sentences (${Math.round(selfContainedRatio * 100)}%) name their own subject and survive extraction.`,
  );
  findings.push(
    `${definitions.length} (${Math.round(definitionRatio * 100)}%) are definition-shaped, the most quotable form.`,
  );
  if (definitions.length > 0) {
    findings.push(`For example: "${definitions[0].slice(0, 140)}".`);
  }
  findings.push(
    `${dangling.length} sentence(s) (${Math.round(danglingRatio * 100)}%) open with a pronoun like "it" or "this", which loses meaning when quoted alone.`,
  );

  const longSentences = sentences.filter((sentence) => sentence.split(/\s+/).length > 40);
  if (longSentences.length > 0) {
    score -= Math.min(15, longSentences.length * 3);
    findings.push(`${longSentences.length} sentence(s) run past 40 words — too long to quote cleanly.`);
  }

  return result({
    id: "quotable-definitions",
    label: "Quotable, self-contained sentences",
    category: "content",
    score,
    weight: 7,
    findings,
    fix:
      score >= 80
        ? "Keep naming the subject in each key sentence rather than leaning on pronouns."
        : "Start key sentences with the subject's name instead of \"it\" or \"this\", and keep them under 40 words so they can be lifted verbatim.",
  });
};

export default checkQuotableDefinitions;
