import type { AnalysisReport } from "@/lib/geo/types";

const CENTER = 60;
const RADIUS = 46;
/** Degrees of sweep. A 90° gap at the bottom keeps the grade legible under the dial. */
const SWEEP = 270;
const START_ANGLE = 135;

function toneFor(score: number): string {
  if (score >= 80) return "var(--pass)";
  if (score >= 50) return "var(--warn)";
  return "var(--fail)";
}

/** Screen-space polar to cartesian — angles increase clockwise from east. */
function point(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

const [START_X, START_Y] = point(START_ANGLE, RADIUS);
const [END_X, END_Y] = point(START_ANGLE + SWEEP, RADIUS);
/** large-arc-flag 1 because the sweep exceeds 180°; sweep-flag 1 for clockwise. */
const ARC = `M ${START_X} ${START_Y} A ${RADIUS} ${RADIUS} 0 1 1 ${END_X} ${END_Y}`;

/** Where the pass/warn band boundaries fall on the dial, as tick marks. */
const THRESHOLDS = [50, 80];

/**
 * Overall score dial.
 *
 * Inline SVG rendered on the server — no chart library and no client JS. The
 * `pathLength="100"` trick lets the dash array be written directly in score
 * units, so the arc length never has to be recomputed if the geometry changes.
 *
 * The threshold ticks matter: a bare number cannot tell you that 78 is one point
 * short of a passing band, and the dial can.
 */
export function ScoreGauge({ score, grade }: { score: number; grade: AnalysisReport["grade"] }) {
  const tone = toneFor(score);

  return (
    <div className="relative shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="size-36"
        role="img"
        aria-label={`Overall GEO score ${score} out of 100, grade ${grade}`}
      >
        <path
          d={ARC}
          pathLength="100"
          fill="none"
          stroke="var(--border)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={ARC}
          pathLength="100"
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${score} 100`}
        />

        {THRESHOLDS.map((value) => {
          const angle = START_ANGLE + (value / 100) * SWEEP;
          const [x1, y1] = point(angle, RADIUS - 8.5);
          const [x2, y2] = point(angle, RADIUS + 8.5);
          return (
            <line
              key={value}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--background)"
              strokeWidth="2.5"
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold leading-none tabular-nums" style={{ color: tone }}>
          {score}
        </span>
        <span className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted">
          Grade {grade}
        </span>
      </div>
    </div>
  );
}
