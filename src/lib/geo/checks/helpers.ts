import type { CheckCategory, CheckResult } from "../types";
import { clampScore, statusFromScore } from "../scoring";

type BuildArgs = {
  id: string;
  label: string;
  category: CheckCategory;
  score: number;
  weight: number;
  findings: string[];
  fix: string;
};

/**
 * Build a CheckResult, deriving `status` from `score` so no individual check can
 * report a status that disagrees with its own number.
 */
export function result(args: BuildArgs): CheckResult {
  const score = clampScore(args.score);
  return {
    id: args.id,
    label: args.label,
    category: args.category,
    score,
    weight: args.weight,
    status: statusFromScore(score),
    findings: args.findings,
    fix: args.fix,
  };
}

/**
 * Map a measured value onto 0–100 by where it sits between a floor and a target.
 * Used by the density-style checks so their scoring curve is stated once.
 */
export function scale(value: number, floor: number, target: number): number {
  if (target === floor) return value >= target ? 100 : 0;
  return clampScore(((value - floor) / (target - floor)) * 100);
}

/** Absolute URL resolution that returns null instead of throwing. */
export function resolveUrl(href: string, base: string): URL | null {
  try {
    return new URL(href, base);
  } catch {
    return null;
  }
}
