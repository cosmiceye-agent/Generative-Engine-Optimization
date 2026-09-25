import { describe, expect, it } from "vitest";
import directAnswer from "@/lib/geo/checks/content/direct-answer";
import statisticsDensity from "@/lib/geo/checks/content/statistics-density";
import quotableDefinitions from "@/lib/geo/checks/content/quotable-definitions";
import readability from "@/lib/geo/checks/content/readability-score";
import metaDescription from "@/lib/geo/checks/content/meta-description";
import openGraph from "@/lib/geo/checks/content/open-graph";
import { contextFromHtml } from "@/lib/geo/context";
import { fixtureContext } from "./helpers";

describe("direct-answer check", () => {
  it("passes a page that opens with a definition", async () => {
    const result = directAnswer(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
    expect(result.findings.some((f) => f.includes("definition-shaped sentence"))).toBe(true);
  });

  it("penalises a generic preamble", async () => {
    const result = directAnswer(await fixtureContext("bad-page"));
    expect(result.status).toBe("fail");
    expect(result.findings.some((f) => f.includes("generic preamble"))).toBe(true);
  });

  it("scores zero on a page with almost no text", async () => {
    expect(directAnswer(await fixtureContext("js-only-page")).score).toBe(0);
  });

  it("rewards an opening that restates the H1 subject", () => {
    const echoed = contextFromHtml(
      `<html><body><main><h1>Composting basics</h1><p>Composting is a process that turns kitchen scraps into soil conditioner using bacteria and fungi over several weeks in a managed garden heap that is turned regularly to keep it aerated and warm.</p></main></body></html>`,
    );
    const notEchoed = contextFromHtml(
      `<html><body><main><h1>Composting basics</h1><p>Widgets are a kind of gadget that many organisations deploy in order to accomplish a range of unrelated operational objectives each year across several unconnected departments and regional offices.</p></main></body></html>`,
    );
    expect(directAnswer(echoed).score).toBeGreaterThan(directAnswer(notEchoed).score);
  });
});

describe("statistics-density check", () => {
  it("credits figures with inline attribution", async () => {
    const result = statisticsDensity(await fixtureContext("good-page"));
    expect(result.score).toBeGreaterThan(50);
    expect(result.findings.some((f) => f.includes("attributed"))).toBe(true);
  });

  it("scores low on a page with no figures", async () => {
    const result = statisticsDensity(await fixtureContext("bad-page"));
    expect(result.score).toBe(0);
  });

  it("penalises unattributed figures", () => {
    const filler =
      " The remainder of the report covers regional breakdowns, methodology notes, and a glossary of the terms used throughout the analysis for readers who want more detail on how the work was carried out. A further appendix lists every participating organisation and the date on which each response was collected by the research team.";
    const attributed = contextFromHtml(
      `<html><body><main><p>Costs fell 40% in 2026, according to the annual industry survey of 900 firms.${filler}</p></main></body></html>`,
    );
    const bare = contextFromHtml(
      `<html><body><main><p>Costs fell 40% in 2026 across 900 firms in the market overall.${filler}</p></main></body></html>`,
    );
    expect(statisticsDensity(attributed).score).toBeGreaterThan(statisticsDensity(bare).score);
  });
});

describe("quotable-definitions check", () => {
  it("passes prose that names its subjects", async () => {
    const result = quotableDefinitions(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("penalises prose built on dangling pronouns", async () => {
    const result = quotableDefinitions(await fixtureContext("bad-page"));
    expect(result.status).toBe("fail");
    expect(result.findings.some((f) => f.includes("open with a pronoun"))).toBe(true);
  });

  it("flags sentences that run past 40 words", () => {
    const long = `A widget assembly ${"combines another subcomponent and ".repeat(12)} completes the build.`;
    const ctx = contextFromHtml(
      `<html><body><main><p>A widget is a small mechanical device. A gadget is a larger tool built from widgets. ${long} A spanner is a hand tool used for turning nuts.</p></main></body></html>`,
    );
    expect(quotableDefinitions(ctx).findings.some((f) => f.includes("past 40 words"))).toBe(true);
  });
});

describe("readability check", () => {
  it("scores the plain-English fixture in the target band", async () => {
    const result = readability(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("penalises dense prose with very long sentences", async () => {
    const result = readability(await fixtureContext("bad-page"));
    expect(result.score).toBeLessThan(80);
  });

  it("refuses to score a page with too little text", async () => {
    expect(readability(await fixtureContext("js-only-page")).score).toBe(0);
  });
});

describe("meta-description check", () => {
  it("passes a well-sized title and substantive description", async () => {
    const result = metaDescription(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("penalises a missing description", async () => {
    const result = metaDescription(await fixtureContext("bad-page"));
    expect(result.score).toBeLessThan(50);
    expect(result.findings.some((f) => f.includes("No meta description"))).toBe(true);
  });

  it("penalises a description that duplicates the title", () => {
    const ctx = contextFromHtml(
      `<html><head><title>How composting works in a home garden</title>
       <meta name="description" content="How composting works in a home garden"></head><body></body></html>`,
    );
    expect(metaDescription(ctx).findings.some((f) => f.includes("duplicates the title"))).toBe(true);
  });
});

describe("open-graph check", () => {
  it("passes a fully tagged page", async () => {
    const result = openGraph(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("scores zero with no social tags", async () => {
    expect(openGraph(await fixtureContext("bad-page")).score).toBe(0);
  });

  it("penalises an og:url on a different host", () => {
    const ctx = contextFromHtml(
      `<html><head>
        <meta property="og:title" content="T"><meta property="og:description" content="D">
        <meta property="og:type" content="article"><meta property="og:url" content="https://other.com/x">
       </head><body></body></html>`,
      { finalUrl: "https://example.com/page" },
    );
    expect(openGraph(ctx).findings.some((f) => f.includes("different host"))).toBe(true);
  });
});
