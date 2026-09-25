import type { CheckFn } from "../../types";
import { result, scale } from "../helpers";
import { splitWords } from "../../readability";

/**
 * Concrete numbers make a page quotable.
 *
 * Studies of generative-engine citation behaviour consistently find that adding
 * statistics, dates and named quantities raises how often a source is cited —
 * a specific figure is something a model can attribute, where a vague claim is
 * something it must hedge. This check measures how dense those figures are.
 */
const NUMBER_PATTERN = /\b\d+(?:[.,]\d+)?\s*(?:%|percent|million|billion|trillion|k\b|x\b)?/gi;
const YEAR_PATTERN = /\b(19|20)\d{2}\b/g;
const CURRENCY_PATTERN = /[$£€¥]\s?\d/g;

const checkStatisticsDensity: CheckFn = (ctx) => {
  const findings: string[] = [];
  const text = ctx.text;
  const words = splitWords(text);

  if (words.length < 50) {
    return result({
      id: "statistics-density",
      label: "Statistics and concrete figures",
      category: "content",
      score: 0,
      weight: 6,
      findings: ["Not enough body text to measure."],
      fix: "Back the page's claims with specific figures, each attributed to its source.",
    });
  }

  const numbers = text.match(NUMBER_PATTERN) ?? [];
  const percentages = numbers.filter((match) => /%|percent/i.test(match));
  const years = text.match(YEAR_PATTERN) ?? [];
  const currency = text.match(CURRENCY_PATTERN) ?? [];

  // Figures per 100 words. ~2 per 100 is a well-evidenced page; 0 is an opinion piece.
  const per100 = (numbers.length / words.length) * 100;
  let score = scale(per100, 0, 2);

  findings.push(
    `${numbers.length} numeric figure(s) across ${words.length.toLocaleString("en-US")} words (${per100.toFixed(1)} per 100 words).`,
  );

  if (percentages.length > 0) {
    score = Math.min(100, score + 10);
    findings.push(`${percentages.length} percentage(s) — the most citable figure type.`);
  } else {
    findings.push("No percentages, which are the figures most often lifted into answers.");
  }

  if (years.length > 0) {
    findings.push(`${years.length} year reference(s), which date the claims.`);
  }
  if (currency.length > 0) {
    findings.push(`${currency.length} monetary figure(s).`);
  }

  // A figure with no source is a liability, so reward attribution nearby.
  const attributed = /\b(according to|source:|per the|reported by|study by|research (from|by)|survey (of|by)|\(\s*\d{4}\s*\))/i.test(text);
  if (attributed) {
    score = Math.min(100, score + 10);
    findings.push("Figures are attributed in the prose (\"according to…\", \"source:…\").");
  } else if (numbers.length > 0) {
    score -= 10;
    findings.push("Figures appear without any visible attribution to a source.");
  }

  return result({
    id: "statistics-density",
    label: "Statistics and concrete figures",
    category: "content",
    score,
    weight: 6,
    findings,
    fix:
      score >= 80
        ? "Keep pairing each figure with its source and the year it refers to."
        : "Replace vague claims (\"many teams\", \"significantly faster\") with specific figures, and name the source of each one inline.",
  });
};

export default checkStatisticsDensity;
