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
  const recoverable = Math.round(impactOf(check) / 10);

  return (
    <details
      id={`check-${check.id}`}
      open={defaultOpen}
      className="group scroll-mt-24 rounded-xl border border-border-subtle bg-surface-raised transition-colors hover:border-border-strong open:border-border-strong open:bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        {/* A 2px rule in the status colour, not a filled pill — the colour reads
            as a state marker while the text label carries the actual meaning. */}
        <span
          aria-hidden="true"
          className="h-8 w-0.5 shrink-0 rounded-full"
          style={{ background: style.color }}
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{check.label}</span>
          <span className="mt-0.5 block font-mono text-[0.6875rem] uppercase tracking-wider text-muted">
            {CATEGORY_LABELS[check.category]} · weight {check.weight}
            {check.status !== "pass" && recoverable > 0 && ` · +${recoverable} pts available`}
          </span>
        </span>

        <span
          className="shrink-0 rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide"
          style={{
            color: style.color,
            background: `color-mix(in srgb, ${style.color} 13%, transparent)`,
          }}
        >
          {style.label}
        </span>

        <span
          className="w-7 shrink-0 text-right font-mono text-sm font-semibold tabular-nums"
          style={{ color: style.color }}
        >
          {check.score}
        </span>

        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="size-3 shrink-0 text-muted transition-transform group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
      </summary>

      <div className="border-t border-border-subtle px-4 py-4 text-sm">
        {check.findings.length > 0 && (
          <>
            <h3 className="eyebrow">What we found</h3>
            <ul className="mt-2.5 space-y-1.5">
              {check.findings.map((finding, index) => (
                <li key={index} className="flex gap-2.5 leading-relaxed">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                  <span className="min-w-0 break-words">{finding}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className={`eyebrow ${check.findings.length > 0 ? "mt-4 block" : ""}`}>How to fix it</h3>
        <p className="mt-2.5 leading-relaxed">{check.fix}</p>
      </div>
    </details>
  );
}
