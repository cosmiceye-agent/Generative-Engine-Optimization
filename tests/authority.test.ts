import { describe, expect, it } from "vitest";
import jsonLd from "@/lib/geo/checks/authority/json-ld";
import authorInfo from "@/lib/geo/checks/authority/author-info";
import dates from "@/lib/geo/checks/authority/dates";
import outboundCitations from "@/lib/geo/checks/authority/outbound-citations";
import canonical from "@/lib/geo/checks/authority/canonical";
import { extractJsonLd, typesOf, validateNode } from "@/lib/geo/schema";
import { contextFromHtml } from "@/lib/geo/context";
import { fixtureContext } from "./helpers";

function withJsonLd(json: string): ReturnType<typeof contextFromHtml> {
  return contextFromHtml(
    `<html><head><script type="application/ld+json">${json}</script></head><body><h1>T</h1></body></html>`,
  );
}

describe("extractJsonLd", () => {
  it("flattens an @graph document", async () => {
    const ctx = await fixtureContext("good-page");
    const { nodes, errors } = extractJsonLd(ctx.$);
    expect(errors).toHaveLength(0);
    const types = nodes.flatMap(typesOf);
    expect(types).toContain("Organization");
    expect(types).toContain("Article");
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");
  });

  it("handles a top-level array", () => {
    const ctx = withJsonLd('[{"@type":"Organization","name":"A","url":"https://a.com"}]');
    expect(extractJsonLd(ctx.$).nodes).toHaveLength(1);
  });

  it("walks nested typed nodes", () => {
    const ctx = withJsonLd(
      '{"@type":"Article","headline":"H","author":{"@type":"Person","name":"P"},"datePublished":"2026-01-01"}',
    );
    const types = extractJsonLd(ctx.$).nodes.flatMap(typesOf);
    expect(types).toContain("Article");
    expect(types).toContain("Person");
  });

  it("reports invalid JSON without throwing", () => {
    const ctx = withJsonLd("{ not json }");
    const { nodes, errors } = extractJsonLd(ctx.$);
    expect(nodes).toHaveLength(0);
    expect(errors[0]).toContain("not valid JSON");
  });

  it("normalises an array @type", () => {
    const ctx = withJsonLd('{"@type":["Article","NewsArticle"],"headline":"H"}');
    expect(typesOf(extractJsonLd(ctx.$).nodes[0])).toEqual(["Article", "NewsArticle"]);
  });
});

describe("validateNode", () => {
  it("reports missing required fields", () => {
    const [validation] = validateNode({ "@type": "Article", headline: "Only a headline" });
    expect(validation.valid).toBe(false);
    expect(validation.missingRequired).toEqual(["author", "datePublished"]);
  });

  it("accepts a complete node and still lists recommendations", () => {
    const [validation] = validateNode({
      "@type": "Article",
      headline: "H",
      author: { "@type": "Person", name: "P" },
      datePublished: "2026-01-01",
    });
    expect(validation.valid).toBe(true);
    expect(validation.missingRecommended).toContain("dateModified");
  });

  it("treats an empty string as missing", () => {
    const [validation] = validateNode({ "@type": "Organization", name: "  ", url: "https://x.com" });
    expect(validation.missingRequired).toContain("name");
  });

  it("ignores types it does not know about", () => {
    expect(validateNode({ "@type": "SomeUnknownType", name: "x" })).toHaveLength(0);
  });
});

describe("json-ld check", () => {
  it("passes the fully marked-up fixture", async () => {
    const result = jsonLd(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
  });

  it("scores zero with no structured data", async () => {
    const result = jsonLd(await fixtureContext("bad-page"));
    expect(result.score).toBe(0);
  });

  it("penalises an Article missing required fields", () => {
    const ctx = withJsonLd('{"@type":"Article","headline":"Just a headline"}');
    const result = jsonLd(ctx);
    expect(result.findings.some((f) => f.includes("missing required field"))).toBe(true);
    expect(result.score).toBeLessThan(80);
  });
});

describe("author-info check", () => {
  it("credits schema author, publisher, meta and byline", async () => {
    const result = authorInfo(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
    expect(result.findings.some((f) => f.includes("Dr Maya Okonkwo"))).toBe(true);
  });

  it("scores zero with no attribution", async () => {
    expect(authorInfo(await fixtureContext("bad-page")).score).toBe(0);
  });

  it("finds a visible byline past an empty <link rel=author> in the head", () => {
    // Next.js emits <link rel="author"> from page metadata. It matches the byline
    // selector and is always empty, so taking the first match blindly reported
    // "no byline" on pages that plainly had one.
    const ctx = contextFromHtml(
      `<html><head><link rel="author" href="https://example.com/about"></head>` +
        `<body><main><h1>T</h1><p class="byline">By Ada Lovelace</p></main></body></html>`,
    );
    const result = authorInfo(ctx);
    expect(result.findings.some((f) => f.includes("Ada Lovelace"))).toBe(true);
    expect(result.findings).not.toContain("No visible byline element found.");
  });

  it("still reports no byline when the only match is the empty head link", () => {
    const ctx = contextFromHtml(
      `<html><head><link rel="author" href="https://example.com/about"></head>` +
        `<body><main><h1>T</h1><p>Body copy with no byline.</p></main></body></html>`,
    );
    expect(authorInfo(ctx).findings).toContain("No visible byline element found.");
  });
});

describe("dates check", () => {
  it("credits published and modified dates", async () => {
    const ctx = await fixtureContext("good-page", { fetchedAt: "2026-09-25T00:00:00.000Z" });
    const result = dates(ctx);
    expect(result.status).toBe("pass");
    expect(result.findings.some((f) => f.includes("dateModified"))).toBe(true);
  });

  it("scores zero with no dates", async () => {
    expect(dates(await fixtureContext("bad-page")).score).toBe(0);
  });

  it("penalises a stale page", async () => {
    const fresh = dates(await fixtureContext("good-page", { fetchedAt: "2026-09-25T00:00:00.000Z" }));
    const stale = dates(await fixtureContext("good-page", { fetchedAt: "2030-09-25T00:00:00.000Z" }));
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("flags a future date", () => {
    const ctx = contextFromHtml(
      `<html><head><script type="application/ld+json">{"@type":"Article","datePublished":"2030-01-01","dateModified":"2030-01-01"}</script></head><body><time datetime="2030-01-01">x</time></body></html>`,
      { fetchedAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(dates(ctx).findings.some((f) => f.includes("in the future"))).toBe(true);
  });
});

describe("outbound-citations check", () => {
  it("credits links to reputable domains", async () => {
    const result = outboundCitations(await fixtureContext("good-page"));
    expect(result.findings.some((f) => f.includes("reputable source domain"))).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it("scores zero when nothing is cited", async () => {
    expect(outboundCitations(await fixtureContext("bad-page")).score).toBe(0);
  });

  it("does not count internal links as citations", () => {
    const ctx = contextFromHtml(
      `<html><body><main><a href="/a">A</a><a href="https://example.com/b">B</a></main></body></html>`,
      { finalUrl: "https://example.com/page" },
    );
    const result = outboundCitations(ctx);
    expect(result.findings[0]).toContain("0 outbound link");
  });

  it("flags bare-URL anchor text", () => {
    const ctx = contextFromHtml(
      `<html><body><main><a href="https://nih.gov/x">https://nih.gov/x</a></main></body></html>`,
      { finalUrl: "https://example.com/page" },
    );
    expect(outboundCitations(ctx).findings.some((f) => f.includes("bare URL"))).toBe(true);
  });
});

describe("canonical check", () => {
  it("passes a self-referencing absolute canonical", async () => {
    const result = canonical(await fixtureContext("good-page"));
    expect(result.status).toBe("pass");
    expect(result.score).toBe(100);
  });

  it("scores zero when absent", async () => {
    expect(canonical(await fixtureContext("bad-page")).score).toBe(0);
  });

  it("caps a cross-domain canonical", () => {
    const ctx = contextFromHtml(
      `<html><head><link rel="canonical" href="https://other.com/page"></head><body></body></html>`,
      { finalUrl: "https://example.com/page" },
    );
    const result = canonical(ctx);
    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.findings.some((f) => f.includes("different domain"))).toBe(true);
  });

  it("rejects multiple canonical tags", () => {
    const ctx = contextFromHtml(
      `<html><head><link rel="canonical" href="https://a.com/1"><link rel="canonical" href="https://a.com/2"></head><body></body></html>`,
    );
    expect(canonical(ctx).score).toBe(20);
  });

  it("notes a relative canonical", () => {
    const ctx = contextFromHtml(
      `<html><head><link rel="canonical" href="/page"></head><body></body></html>`,
      { finalUrl: "https://example.com/page" },
    );
    expect(canonical(ctx).findings.some((f) => f.includes("relative"))).toBe(true);
  });
});

describe("@id reference resolution", () => {
  it("follows a publisher given as an @id reference", () => {
    const ctx = contextFromHtml(
      `<html><head><script type="application/ld+json">{
        "@context":"https://schema.org",
        "@graph":[
          {"@type":"Organization","@id":"https://x.com/#org","name":"Example Ltd","url":"https://x.com"},
          {"@type":"Article","headline":"H","datePublished":"2026-01-01",
           "author":{"@type":"Person","name":"A"},"publisher":{"@id":"https://x.com/#org"}}
        ]}</script></head><body><h1>T</h1></body></html>`,
    );
    const result = authorInfo(ctx);
    expect(result.findings.some((f) => f.includes("Publisher declared: Example Ltd"))).toBe(true);
  });

  it("does not invent a publisher when the reference dangles", () => {
    const ctx = contextFromHtml(
      `<html><head><script type="application/ld+json">{
        "@type":"Article","headline":"H","publisher":{"@id":"https://x.com/#missing"}
      }</script></head><body></body></html>`,
    );
    expect(authorInfo(ctx).findings.some((f) => f.includes("No `publisher`"))).toBe(true);
  });
});

describe("direct-answer definition shape", () => {
  it("recognises a definition interrupted by a parenthetical", async () => {
    const { default: directAnswer } = await import("@/lib/geo/checks/content/direct-answer");
    const ctx = contextFromHtml(
      `<html><body><main><h1>GEO</h1><p>Generative Engine Optimization (GEO) is the practice of structuring web content so that AI answer engines can crawl it, understand it, and cite it as a source in generated answers.</p></main></body></html>`,
    );
    expect(
      directAnswer(ctx).findings.some((f) => f.includes("definition-shaped sentence")),
    ).toBe(true);
  });

  it("still rejects a sentence that merely contains \"are\"", async () => {
    const { default: directAnswer } = await import("@/lib/geo/checks/content/direct-answer");
    const ctx = contextFromHtml(
      `<html><body><main><h1>X</h1><p>In today's fast-paced world, businesses everywhere are constantly looking for ways to stay ahead of the curve and remain competitive in an ever-changing marketplace that demands agility, resilience and a willingness to rethink long-standing operational assumptions across every department.</p></main></body></html>`,
    );
    expect(directAnswer(ctx).findings.some((f) => f.includes("no direct"))).toBe(true);
  });
});
