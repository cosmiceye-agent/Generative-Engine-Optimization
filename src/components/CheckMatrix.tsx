import type { CheckResult } from "@/lib/geo/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/geo/scoring";

const STATUS_COLOR: Record<CheckResult["status"], string> = {
  pass: "var(--pass)",
  warn: "var(--warn)",
  fail: "var(--fail)",
};

const STATUS_LABEL: Record<CheckResult["status"], string> = {
  pass: "passed",
  warn: "needs attention",
  fail: "failed",
};

/**
 * Every check as one small square, grouped by category — the whole audit in a
 * glance before any scrolling.
 *
 * Each square is an in-page anchor to the matching card, so this doubles as
 * navigation. It is a plain link list, so it works without JavaScript; the
 * accessible name on each link spells out the check and its status, because a
 * coloured square on its own communicates nothing to a screen reader.
 */
export function CheckMatrix({ checks }: { checks: readonly CheckResult[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {CATEGORIES.map((category) => {
        const inCategory = checks.filter((check) => check.category === category);
        if (inCategory.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="eyebrow">{CATEGORY_LABELS[category]}</h3>
            <ul className="mt-2 flex flex-wrap gap-1">
              {inCategory.map((check) => (
                <li key={check.id}>
                  <a
                    href={`#check-${check.id}`}
                    title={`${check.label} — ${STATUS_LABEL[check.status]} (${check.score}/100)`}
                    className="block size-4 rounded transition-transform hover:scale-125"
                    style={{ background: STATUS_COLOR[check.status] }}
                  >
                    <span className="sr-only">
                      {check.label} — {STATUS_LABEL[check.status]}, scored {check.score} out of 100
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
