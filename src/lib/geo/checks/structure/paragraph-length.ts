import type { CheckFn } from "../../types";
import { result } from "../helpers";
import { splitWords } from "../../readability";

/**
 * Paragraph length controls chunk quality.
 *
 * Retrieval pipelines split pages into chunks and embed each one. A 300-word
 * paragraph covering four ideas produces a muddy embedding that matches nothing
 * strongly; two to four focused sentences produce a chunk that matches its one
 * question sharply. 40–120 words is the useful band.
 */
const IDEAL_MIN = 20;
const IDEAL_MAX = 120;

const checkParagraphLength: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  const paragraphs = $("p")
    .toArray()
    .map((node) => splitWords($(node).text()).length)
    .filter((count) => count >= 5); // skip captions, labels, one-liners

  if (paragraphs.length === 0) {
    return result({
      id: "paragraph-length",
      label: "Paragraph length",
      category: "structure",
      score: 0,
      weight: 4,
      findings: ["No substantive <p> elements found."],
      fix: "Write the body copy in <p> elements of 40–120 words, one idea each.",
    });
  }

  const inBand = paragraphs.filter((count) => count >= IDEAL_MIN && count <= IDEAL_MAX);
  const tooLong = paragraphs.filter((count) => count > IDEAL_MAX);
  const ratio = inBand.length / paragraphs.length;
  const average = Math.round(paragraphs.reduce((sum, count) => sum + count, 0) / paragraphs.length);

  findings.push(`${paragraphs.length} paragraphs, averaging ${average} words.`);
  findings.push(
    `${inBand.length} (${Math.round(ratio * 100)}%) fall in the ${IDEAL_MIN}–${IDEAL_MAX} word band that chunks cleanly.`,
  );
  if (tooLong.length > 0) {
    findings.push(
      `${tooLong.length} paragraph(s) exceed ${IDEAL_MAX} words — the longest is ${Math.max(...tooLong)} words.`,
    );
  }

  // Overlong paragraphs are penalised harder than short ones: a short paragraph
  // is merely terse and still chunks fine, whereas an overlong one blurs its
  // embedding across several ideas. So short paragraphs earn half credit, and
  // overlong ones additionally subtract.
  const tooShort = paragraphs.filter((count) => count < IDEAL_MIN);
  const effective = inBand.length + tooShort.length * 0.5;
  const score = (effective / paragraphs.length) * 100 - (tooLong.length / paragraphs.length) * 25;

  return result({
    id: "paragraph-length",
    label: "Paragraph length",
    category: "structure",
    score,
    weight: 4,
    findings,
    fix:
      score >= 80
        ? "Paragraph sizing is good — keep one idea per paragraph."
        : tooLong.length > 0
          ? `Split the ${tooLong.length} paragraph(s) over ${IDEAL_MAX} words so each covers a single idea.`
          : `Expand the ${tooShort.length} paragraph(s) under ${IDEAL_MIN} words into complete, self-contained answers.`,
  });
};

export default checkParagraphLength;
