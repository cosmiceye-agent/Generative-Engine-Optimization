import type { AnalysisReport, CategoryScore, CheckCategory, CheckResult, CheckStatus } from "./types";

export const CATEGORIES: CheckCategory[] = ["crawlability", "structure", "authority", "content"];

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  crawlability: "Crawlability",
  structure: "Structure",
  authority: "Authority",
  content: "Content",
};

export const CATEGORY_BLURBS: Record<CheckCategory, string> = {
  crawlability: "Can AI engines fetch this page at all?",
  structure: "Can they find the answer inside it?",
  authority: "Do they have a reason to trust and attribute it?",
  content: "Is the text itself quotable in an answer?",
};

/** Single source of truth for the pass/warn/fail bands. */
export function statusFromScore(score: number): CheckStatus {
  if (score >= 80) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Weighted mean of a set of checks.
 *
 * Weighted rather than flat because the checks are not equally consequential: a
 * robots.txt that blocks OAI-SearchBot makes every other check irrelevant, while
 * a missing Open Graph image costs a little polish. Weights are declared per
 * check so adding a check cannot silently rescale the others.
 */
export function weightedAverage(checks: readonly CheckResult[]): number {
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = checks.reduce((sum, check) => sum + check.score * check.weight, 0);
  return clampScore(weighted / totalWeight);
}

export function scoreByCategory(checks: readonly CheckResult[]): CategoryScore[] {
  return CATEGORIES.map((category) => {
    const inCategory = checks.filter((check) => check.category === category);
    return {
      category,
      score: weightedAverage(inCategory),
      weight: inCategory.reduce((sum, check) => sum + check.weight, 0),
    };
  });
}

export function gradeFromScore(score: number): AnalysisReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * How much overall score is recoverable by fixing this one check:
 * `weight × (100 − score)`. Sorting by this puts "heavy check, badly failed" at
 * the top, which is the order someone should actually work in — a hard-failed
 * light check is less urgent than a half-passed heavy one.
 */
export function impactOf(check: CheckResult): number {
  return check.weight * (100 - check.score);
}

export function sortByImpact(checks: readonly CheckResult[]): CheckResult[] {
  return [...checks].sort((a, b) => impactOf(b) - impactOf(a));
}
