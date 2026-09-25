import type { CheckFn } from "../../types";
import { result } from "../helpers";
import { fleschReadingEase } from "../../readability";

/**
 * Flesch Reading Ease, mapped onto a GEO score.
 *
 * The mapping is deliberately not linear-with-Flesch: the target is the 50–80
 * band ("fairly plain English"). Scoring far *above* 80 is not better for a
 * technical page — text that simple usually means the substance has been removed,
 * and there is nothing worth citing left.
 */
const checkReadability: CheckFn = (ctx) => {
  const findings: string[] = [];
  const stats = fleschReadingEase(ctx.text);

  if (stats.words < 50) {
    return result({
      id: "readability",
      label: "Readability",
      category: "content",
      score: 0,
      weight: 5,
      findings: [`Only ${stats.words} words of body text — too little to score.`],
      fix: "Write at least a few hundred words of substantive prose.",
    });
  }

  let score: number;
  let band: string;

  if (stats.flesch >= 50 && stats.flesch <= 80) {
    score = 100;
    band = "plain English — the band answer engines quote most readily";
  } else if (stats.flesch >= 40 && stats.flesch < 50) {
    score = 75;
    band = "fairly difficult";
  } else if (stats.flesch > 80 && stats.flesch <= 90) {
    score = 85;
    band = "very easy, verging on thin for a technical topic";
  } else if (stats.flesch >= 30 && stats.flesch < 40) {
    score = 50;
    band = "difficult — university-level density";
  } else if (stats.flesch > 90) {
    score = 70;
    band = "extremely simple; check the substance has not been stripped out";
  } else {
    score = 25;
    band = "very difficult — dense enough that passages are hard to reuse";
  }

  findings.push(`Flesch Reading Ease ${stats.flesch} (${band}).`);
  findings.push(
    `${stats.words.toLocaleString("en-US")} words in ${stats.sentences} sentences — ${stats.wordsPerSentence.toFixed(1)} words per sentence.`,
  );

  if (stats.wordsPerSentence > 25) {
    score -= 15;
    findings.push("Average sentence length is above 25 words; shorter sentences extract better.");
  }

  return result({
    id: "readability",
    label: "Readability",
    category: "content",
    score,
    weight: 5,
    findings,
    fix:
      score >= 80
        ? "Readability is in the right band — keep sentences short and concrete."
        : stats.flesch < 50
          ? "Shorten sentences and replace multi-syllable jargon with plain words. Aim for a Flesch score of 50–80."
          : "Add back the specifics — very high readability with no detail leaves nothing worth citing.",
  });
};

export default checkReadability;
