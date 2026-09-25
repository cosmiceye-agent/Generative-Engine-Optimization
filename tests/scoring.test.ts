import { describe, expect, it } from "vitest";
import {
  clampScore,
  gradeFromScore,
  impactOf,
  scoreByCategory,
  sortByImpact,
  statusFromScore,
  weightedAverage,
} from "@/lib/geo/scoring";
import { fleschReadingEase, countSyllables, countSentences } from "@/lib/geo/readability";
import { buildReport, runChecks } from "@/lib/geo/registry";
import { reportToMarkdown } from "@/lib/geo/report";
import { scale } from "@/lib/geo/checks/helpers";
import { normaliseUrlInput } from "@/lib/geo/normalise-url";
import type { CheckResult } from "@/lib/geo/types";
import { fixtureContext, resource } from "./helpers";

function check(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id: "x", label: "X", category: "content", score: 50, weight: 1,
    status: "warn", findings: [], fix: "", ...overrides,
  };
}

describe("statusFromScore", () => {
  it("uses the documented bands", () => {
    expect(statusFromScore(100)).toBe("pass");
    expect(statusFromScore(80)).toBe("pass");
    expect(statusFromScore(79)).toBe("warn");
    expect(statusFromScore(50)).toBe("warn");
    expect(statusFromScore(49)).toBe("fail");
    expect(statusFromScore(0)).toBe("fail");
  });
});

describe("clampScore", () => {
  it("clamps and rounds", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-20)).toBe(0);
    expect(clampScore(72.6)).toBe(73);
  });
});

describe("weightedAverage", () => {
  it("weights heavy checks more than light ones", () => {
    const result = weightedAverage([
      check({ score: 0, weight: 10 }),
      check({ score: 100, weight: 1 }),
    ]);
    expect(result).toBe(9);
  });

  it("returns 0 for an empty set", () => {
    expect(weightedAverage([])).toBe(0);
  });

  it("ignores zero-weight checks", () => {
    const withCrash = weightedAverage([check({ score: 100, weight: 5 }), check({ score: 0, weight: 0 })]);
    expect(withCrash).toBe(100);
  });
});

describe("impactOf and sortByImpact", () => {
  it("ranks a badly-failed heavy check above a lightly-failed light one", () => {
    const heavy = check({ id: "heavy", score: 20, weight: 10 });
    const light = check({ id: "light", score: 0, weight: 1 });
    expect(impactOf(heavy)).toBeGreaterThan(impactOf(light));
    expect(sortByImpact([light, heavy])[0].id).toBe("heavy");
  });

  it("puts a passing check last", () => {
    const sorted = sortByImpact([
      check({ id: "pass", score: 100, weight: 10 }),
      check({ id: "fail", score: 0, weight: 1 }),
    ]);
    expect(sorted[0].id).toBe("fail");
  });
});

describe("scoreByCategory", () => {
  it("scores each category independently", () => {
    const scores = scoreByCategory([
      check({ category: "crawlability", score: 100, weight: 1 }),
      check({ category: "content", score: 0, weight: 1 }),
    ]);
    expect(scores.find((s) => s.category === "crawlability")?.score).toBe(100);
    expect(scores.find((s) => s.category === "content")?.score).toBe(0);
  });
});

describe("gradeFromScore", () => {
  it("maps score bands to grades", () => {
    expect(gradeFromScore(95)).toBe("A");
    expect(gradeFromScore(85)).toBe("B");
    expect(gradeFromScore(75)).toBe("C");
    expect(gradeFromScore(65)).toBe("D");
    expect(gradeFromScore(40)).toBe("F");
  });
});

describe("scale", () => {
  it("maps a value between floor and target onto 0-100", () => {
    expect(scale(0, 0, 10)).toBe(0);
    expect(scale(5, 0, 10)).toBe(50);
    expect(scale(20, 0, 10)).toBe(100);
    expect(scale(-5, 0, 10)).toBe(0);
  });
});

describe("readability maths", () => {
  it("counts syllables in common words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("table")).toBe(2);
    expect(countSyllables("composting")).toBe(3);
    expect(countSyllables("")).toBe(0);
  });

  it("counts sentences and never returns zero", () => {
    expect(countSentences("One. Two! Three?")).toBe(3);
    expect(countSentences("No terminator")).toBe(1);
  });

  it("scores simple prose higher than dense prose", () => {
    const simple = fleschReadingEase("The cat sat on the mat. The dog ran fast. We had fun.");
    const dense = fleschReadingEase(
      "Notwithstanding the aforementioned considerations, the implementation necessitates comprehensive reconceptualisation of organisational infrastructure.",
    );
    expect(simple.flesch).toBeGreaterThan(dense.flesch);
  });

  it("clamps into 0-100", () => {
    const stats = fleschReadingEase("Go. Do. Be.");
    expect(stats.flesch).toBeLessThanOrEqual(100);
    expect(stats.flesch).toBeGreaterThanOrEqual(0);
  });
});

describe("runChecks and buildReport", () => {
  it("runs every check and produces a complete report", async () => {
    const ctx = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml"),
      fetchedAt: "2026-09-25T00:00:00.000Z",
    });
    const report = buildReport(ctx);

    expect(report.checks.length).toBe(runChecks(ctx).length);
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.categories).toHaveLength(4);
    expect(new Set(report.checks.map((c) => c.id)).size).toBe(report.checks.length);
  });

  it("ranks the good fixture well above the bad and JS-only ones", async () => {
    const good = buildReport(await fixtureContext("good-page", { fetchedAt: "2026-09-25T00:00:00.000Z" }));
    const bad = buildReport(await fixtureContext("bad-page"));
    const js = buildReport(await fixtureContext("js-only-page"));

    expect(good.overallScore).toBeGreaterThan(bad.overallScore);
    expect(good.overallScore).toBeGreaterThan(js.overallScore);
    expect(bad.grade).toBe("F");
  });

  it("returns checks sorted by impact", async () => {
    const report = buildReport(await fixtureContext("bad-page"));
    const impacts = report.checks.map(impactOf);
    expect(impacts).toEqual([...impacts].sort((a, b) => b - a));
  });
});

describe("reportToMarkdown", () => {
  it("renders a complete Markdown document", async () => {
    const report = buildReport(await fixtureContext("good-page", { fetchedAt: "2026-09-25T00:00:00.000Z" }));
    const markdown = reportToMarkdown(report);

    expect(markdown).toContain("# GEO audit:");
    expect(markdown).toContain("## Category scores");
    expect(markdown).toContain("## All checks");
    expect(markdown).toContain(`**Overall score: ${report.overallScore}/100`);
    for (const check of report.checks) {
      expect(markdown).toContain(check.label);
    }
  });

  it("includes a priority section when checks are failing", async () => {
    const markdown = reportToMarkdown(buildReport(await fixtureContext("bad-page")));
    expect(markdown).toContain("## Priority fixes");
  });
});

describe("normaliseUrlInput", () => {
  it("adds https to a bare domain", () => {
    expect(normaliseUrlInput("example.com")).toBe("https://example.com");
    expect(normaliseUrlInput("  example.com/page  ")).toBe("https://example.com/page");
  });

  it("leaves an existing scheme alone so it can be rejected on its merits", () => {
    expect(normaliseUrlInput("http://example.com")).toBe("http://example.com");
    expect(normaliseUrlInput("file:///etc/passwd")).toBe("file:///etc/passwd");
    expect(normaliseUrlInput("javascript:alert(1)")).toBe("javascript:alert(1)");
  });

  it("passes an empty string through", () => {
    expect(normaliseUrlInput("   ")).toBe("");
  });
});
