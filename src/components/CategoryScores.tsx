import type { CategoryScore } from "@/lib/geo/types";
import { CATEGORY_BLURBS, CATEGORY_LABELS } from "@/lib/geo/scoring";

function toneFor(score: number): string {
  if (score >= 80) return "var(--pass)";
  if (score >= 50) return "var(--warn)";
  return "var(--fail)";
}

export function CategoryScores({ categories }: { categories: CategoryScore[] }) {
  return (
    // Cell borders are uniform rather than conditional: on the outer edges they
    // land exactly on the container's own border, so they cost nothing visually
    // and the markup needs no first/last-child variants.
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised sm:grid-cols-4">
      {categories.map((category) => {
        const tone = toneFor(category.score);
        return (
          <div
            key={category.category}
            className="border-b border-r border-border-subtle p-4"
          >
            <dt className="eyebrow">{CATEGORY_LABELS[category.category]}</dt>
            <dd className="mt-2">
              <span
                className="font-display text-2xl font-bold leading-none tabular-nums"
                style={{ color: tone }}
              >
                {category.score}
              </span>
              <span className="ml-1 text-xs text-muted">/100</span>
            </dd>
            <div
              className="mt-3 h-1 overflow-hidden rounded-full bg-border-subtle"
              role="meter"
              aria-valuenow={category.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${CATEGORY_LABELS[category.category]} score`}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${category.score}%`, background: tone }}
              />
            </div>
            <p className="mt-2.5 text-xs leading-snug text-muted">
              {CATEGORY_BLURBS[category.category]}
            </p>
          </div>
        );
      })}
    </dl>
  );
}
