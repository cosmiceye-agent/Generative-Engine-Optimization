import type { CheckResult } from "@/lib/geo/types";
import { CATEGORY_LABELS, impactOf } from "@/lib/geo/scoring";

const STATUS_STYLE: Record<CheckResult["status"], { label: string; color: string }> = {
  pass: { label: "Pass", color: "var(--pass)" },
  warn: { label: "Warn", color: "var(--warn)" },
  fail: { label: "Fail", color: "var(--fail)" },
};

/**
 * One check, expandable.
 *
 * Built on <details>/<summary> rather than a React accordion: it needs no client
 * JavaScript, works before hydration, is keyboard-accessible for free, and — the
 * point of a GEO tool — the findings stay present in the server HTML whether or
 * not the card is open.
 */
export function CheckCard({ check, defaultOpen }: { check: CheckResult; defaultOpen?: boolean }) {
  const style = STATUS_STYLE[check.status];

  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-border-subtle bg-surface-raised open:bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span
          className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: style.color, background: `color-mix(in srgb, ${style.color} 14%, transparent)` }}
        >
          {style.label}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{check.label}</span>
          <span className="block text-xs text-muted">
            {CATEGORY_LABELS[check.category]} · weight {check.weight}
            {check.status !== "pass" && ` · up to +${Math.round(impactOf(check) / 10)} pts overall`}
          </span>
        </span>

        <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: style.color }}>
          {check.score}
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="border-t border-border-subtle px-4 py-4 text-sm">
        {check.findings.length > 0 && (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Findings</h3>
            <ul className="mt-2 space-y-1.5">
              {check.findings.map((finding, index) => (
                <li key={index} className="flex gap-2 leading-relaxed">
                  <span aria-hidden="true" className="text-muted">•</span>
                  <span className="min-w-0 break-words">{finding}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">How to fix</h3>
        <p className="mt-2 leading-relaxed">{check.fix}</p>
      </div>
    </details>
  );
}
