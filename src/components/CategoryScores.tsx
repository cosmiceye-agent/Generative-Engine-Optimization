import type { CategoryScore } from "@/lib/geo/types";
import { CATEGORY_BLURBS, CATEGORY_LABELS } from "@/lib/geo/scoring";

function toneFor(score: number): string {
  if (score >= 80) return "var(--pass)";
  if (score >= 50) return "var(--warn)";
  return "var(--fail)";
}

export function CategoryScores({ categories }: { categories: CategoryScore[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {categories.map((category) => (
        <div
          key={category.category}
          className="rounded-lg border border-border-subtle bg-surface-raised p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-medium">{CATEGORY_LABELS[category.category]}</dt>
            <dd
              className="text-lg font-semibold tabular-nums"
              style={{ color: toneFor(category.score) }}
            >
              {category.score}
            </dd>
          </div>
          <p className="mt-1 text-xs text-muted">{CATEGORY_BLURBS[category.category]}</p>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-border-subtle"
            role="meter"
            aria-valuenow={category.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${CATEGORY_LABELS[category.category]} score`}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${category.score}%`, background: toneFor(category.score) }}
            />
          </div>
        </div>
      ))}
    </dl>
  );
}
