import { describe, expect, it } from "vitest";
import headings from "@/lib/geo/checks/structure/headings";
import questionHeadings from "@/lib/geo/checks/structure/question-headings";
import listsAndTables from "@/lib/geo/checks/structure/lists-and-tables";
import paragraphLength from "@/lib/geo/checks/structure/paragraph-length";
import faqSection from "@/lib/geo/checks/structure/faq-section";
import { contextFromHtml } from "@/lib/geo/context";
import { fixtureContext } from "./helpers";

describe("headings check", () => {
  it("passes the well-structured fixture", async () => {
    const result = headings(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
    expect(result.findings.some((f) => f.includes("Single H1"))).toBe(true);
  });

  it("penalises multiple H1s and skipped levels", async () => {
    const result = headings(await fixtureContext("bad-page"));
    expect(result.status).toBe("fail");
    expect(result.findings.some((f) => f.includes("2 H1 elements"))).toBe(true);
    expect(result.findings.some((f) => f.includes("skipped heading level"))).toBe(true);
  });

  it("reports a page with no H1", () => {
    const ctx = contextFromHtml("<html><body><h2>Only a subheading</h2><p>Text.</p></body></html>");
    const result = headings(ctx);
    expect(result.findings.some((f) => f.includes("No H1"))).toBe(true);
    expect(result.score).toBeLessThan(80);
  });

  it("flags empty heading elements", () => {
    const ctx = contextFromHtml("<html><body><h1>Title</h1><h2></h2><h2>Real</h2><h2>Also</h2></body></html>");
    expect(headings(ctx).findings.some((f) => f.includes("contain no text"))).toBe(true);
  });
});

describe("question-headings check", () => {
  it("rewards question-shaped subheadings", async () => {
    const result = questionHeadings(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("scores zero when there are no subheadings", () => {
    const ctx = contextFromHtml("<html><body><h1>Title</h1><p>Body text here.</p></body></html>");
    expect(questionHeadings(ctx).score).toBe(0);
  });

  it("flags generic headings that carry no query signal", () => {
    const ctx = contextFromHtml(
      "<html><body><h1>T</h1><h2>Overview</h2><h2>Features</h2><h2>Benefits</h2></body></html>",
    );
    const result = questionHeadings(ctx);
    expect(result.findings.some((f) => f.includes("Generic headings"))).toBe(true);
    expect(result.score).toBe(0);
  });
});

describe("lists-and-tables check", () => {
  it("credits content lists and captioned tables", async () => {
    const result = listsAndTables(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
    expect(result.findings.some((f) => f.includes("<th> header cells"))).toBe(true);
    expect(result.findings.some((f) => f.includes("<caption>"))).toBe(true);
  });

  it("ignores navigation lists", () => {
    const ctx = contextFromHtml(
      `<html><body><nav><ul><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul></nav>
       <main><h1>T</h1><p>${"word ".repeat(400)}</p></main></body></html>`,
    );
    const result = listsAndTables(ctx);
    expect(result.score).toBe(0);
    expect(result.findings.some((f) => f.includes("No content lists"))).toBe(true);
  });

  it("penalises a table with no header cells", () => {
    const withHeaders = contextFromHtml(
      "<html><body><main><table><tr><th>A</th></tr><tr><td>1</td></tr></table></main></body></html>",
    );
    const without = contextFromHtml(
      "<html><body><main><table><tr><td>A</td></tr><tr><td>1</td></tr></table></main></body></html>",
    );
    expect(listsAndTables(withHeaders).score).toBeGreaterThan(listsAndTables(without).score);
  });
});

describe("paragraph-length check", () => {
  it("passes paragraphs that sit in the chunking band", async () => {
    const result = paragraphLength(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("fails a page built from one enormous paragraph", async () => {
    const result = paragraphLength(await fixtureContext("bad-page"));
    expect(result.status).not.toBe("pass");
    expect(result.findings.some((f) => f.includes("exceed 120 words"))).toBe(true);
  });

  it("reports when there are no substantive paragraphs", () => {
    const ctx = contextFromHtml("<html><body><h1>Title</h1></body></html>");
    expect(paragraphLength(ctx).score).toBe(0);
  });
});

describe("faq-section check", () => {
  it("credits an FAQ heading, pairs and JSON-LD together", async () => {
    const result = faqSection(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
    expect(result.findings.some((f) => f.includes("FAQPage JSON-LD is present"))).toBe(true);
    expect(result.findings.some((f) => f.includes("<details>/<summary>"))).toBe(true);
  });

  it("scores zero with no FAQ at all", async () => {
    const result = faqSection(await fixtureContext("bad-page"));
    expect(result.score).toBe(0);
  });

  it("partly credits question pairs without a section heading", () => {
    const ctx = contextFromHtml(
      `<html><body><main><h1>T</h1>
       <h3>What is it?</h3><p>An answer.</p>
       <h3>How much?</h3><p>Another answer.</p>
       <h3>When?</h3><p>A third answer.</p></main></body></html>`,
    );
    const result = faqSection(ctx);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(80);
  });
});
