import type { AnalysisReport } from "@/lib/geo/types";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function toneFor(score: number): string {
  if (score >= 80) return "var(--pass)";
  if (score >= 50) return "var(--warn)";
  return "var(--fail)";
}

/**
 * Overall score dial. Rendered as inline SVG on the server — no chart library,
 * no client JS, and the number is also exposed as text so it is readable by
 * screen readers and by anything parsing the page.
 */
export function ScoreGauge({ score, grade }: { score: number; grade: AnalysisReport["grade"] }) {
  const dash = (score / 100) * CIRCUMFERENCE;

  return (
    <div className="flex items-center gap-5">
      <svg
        viewBox="0 0 120 120"
        className="size-32 shrink-0 -rotate-90"
        role="img"
        aria-label={`Overall GEO score ${score} out of 100, grade ${grade}`}
      >
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none" stroke="var(--border)" strokeWidth="10"
        />
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          stroke={toneFor(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
        />
      </svg>

      <div>
        <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: toneFor(score) }}>
          {score}
          <span className="text-xl font-medium text-muted">/100</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          Grade <span className="font-semibold text-foreground">{grade}</span>
        </p>
      </div>
    </div>
  );
}
