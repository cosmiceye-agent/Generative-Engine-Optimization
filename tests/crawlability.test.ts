import { describe, expect, it } from "vitest";
import aiBotAccess from "@/lib/geo/checks/crawlability/ai-bot-access";
import llmsTxt from "@/lib/geo/checks/crawlability/llms-txt";
import sitemap from "@/lib/geo/checks/crawlability/sitemap";
import httpStatus from "@/lib/geo/checks/crawlability/http-status";
import serverRendered from "@/lib/geo/checks/crawlability/server-rendered-content";
import metaRobots from "@/lib/geo/checks/crawlability/meta-robots";
import { parseRobotsTxt, isPathAllowed, hasExplicitGroup } from "@/lib/geo/robots-txt";
import { fixtureContext, missing, resource } from "./helpers";

describe("parseRobotsTxt", () => {
  it("groups consecutive user-agent lines together", () => {
    const parsed = parseRobotsTxt(`
User-agent: GPTBot
User-agent: CCBot
Disallow: /private/

User-agent: *
Allow: /
    `);
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[0].userAgents).toEqual(["gptbot", "ccbot"]);
    expect(parsed.groups[0].disallow).toEqual(["/private/"]);
  });

  it("collects sitemap directives independently of groups", () => {
    const parsed = parseRobotsTxt("Sitemap: https://example.com/sitemap.xml\nUser-agent: *\nAllow: /");
    expect(parsed.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("ignores comments and blank lines", () => {
    const parsed = parseRobotsTxt("# a comment\nUser-agent: * # trailing\nDisallow: /x");
    expect(parsed.groups[0].userAgents).toEqual(["*"]);
    expect(parsed.groups[0].disallow).toEqual(["/x"]);
  });

  it("starts a new group after a rule line interrupts the agent run", () => {
    const parsed = parseRobotsTxt("User-agent: A\nDisallow: /a\nUser-agent: B\nDisallow: /b");
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[1].userAgents).toEqual(["b"]);
  });
});

describe("isPathAllowed", () => {
  it("prefers a specific group over the wildcard group", () => {
    const robots = parseRobotsTxt("User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /");
    expect(isPathAllowed(robots, "GPTBot", "/page")).toBe(true);
    expect(isPathAllowed(robots, "PerplexityBot", "/page")).toBe(false);
  });

  it("lets the longest matching pattern win", () => {
    const robots = parseRobotsTxt("User-agent: *\nDisallow: /docs/\nAllow: /docs/public/");
    expect(isPathAllowed(robots, "AnyBot", "/docs/private/x")).toBe(false);
    expect(isPathAllowed(robots, "AnyBot", "/docs/public/x")).toBe(true);
  });

  it("treats an empty Disallow as allow-all", () => {
    const robots = parseRobotsTxt("User-agent: *\nDisallow:");
    expect(isPathAllowed(robots, "AnyBot", "/anything")).toBe(true);
  });

  it("supports wildcard and end-anchor patterns", () => {
    const robots = parseRobotsTxt("User-agent: *\nDisallow: /*.pdf$");
    expect(isPathAllowed(robots, "AnyBot", "/files/report.pdf")).toBe(false);
    expect(isPathAllowed(robots, "AnyBot", "/files/report.pdf.html")).toBe(true);
  });

  it("allows everything when no group addresses the bot", () => {
    const robots = parseRobotsTxt("User-agent: SomeOtherBot\nDisallow: /");
    expect(isPathAllowed(robots, "GPTBot", "/page")).toBe(true);
  });

  it("detects explicit groups", () => {
    const robots = parseRobotsTxt("User-agent: GPTBot\nAllow: /");
    expect(hasExplicitGroup(robots, "GPTBot")).toBe(true);
    expect(hasExplicitGroup(robots, "CCBot")).toBe(false);
  });
});

describe("ai-bot-access check", () => {
  it("scores 100 when every bot is allowed", async () => {
    const ctx = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml"),
    });
    const result = aiBotAccess(ctx);
    expect(result.score).toBe(100);
    expect(result.status).toBe("pass");
  });

  it("fails hard when everything is blocked", async () => {
    const ctx = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: *\nDisallow: /"),
    });
    const result = aiBotAccess(ctx);
    expect(result.score).toBe(0);
    expect(result.status).toBe("fail");
  });

  it("penalises blocking a retrieval bot more than a training bot", async () => {
    const trainingBlocked = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: CCBot\nDisallow: /"),
    });
    const retrievalBlocked = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: OAI-SearchBot\nDisallow: /"),
    });
    expect(aiBotAccess(trainingBlocked).score).toBeGreaterThan(
      aiBotAccess(retrievalBlocked).score,
    );
  });

  it("treats a missing robots.txt as permissive but unsignalled", async () => {
    const ctx = await fixtureContext("good-page", { robotsTxt: missing() });
    const result = aiBotAccess(ctx);
    expect(result.score).toBe(70);
    expect(result.status).toBe("warn");
  });

  it("warns rather than failing when robots.txt is unreachable", async () => {
    const ctx = await fixtureContext("good-page", {
      robotsTxt: { url: "https://example.com/robots.txt", ok: false, status: 0, body: "", contentType: "", error: "timeout" },
    });
    expect(aiBotAccess(ctx).status).toBe("warn");
  });
});

describe("llms-txt check", () => {
  it("scores 0 when absent", async () => {
    const ctx = await fixtureContext("good-page", { llmsTxt: missing("https://example.com/llms.txt") });
    expect(llmsTxt(ctx).score).toBe(0);
  });

  it("rewards a well-formed llms.txt", async () => {
    const body = [
      "# Example",
      "",
      "> A short summary of the site.",
      "",
      "## Docs",
      "- [One](https://example.com/1)",
      "- [Two](https://example.com/2)",
      "- [Three](https://example.com/3)",
    ].join("\n");
    const ctx = await fixtureContext("good-page", {
      llmsTxt: { url: "https://example.com/llms.txt", ok: true, status: 200, body, contentType: "text/plain" },
    });
    const result = llmsTxt(ctx);
    expect(result.score).toBe(100);
    expect(result.status).toBe("pass");
  });

  it("only partly credits a file with no links", async () => {
    const ctx = await fixtureContext("good-page", {
      llmsTxt: { url: "https://example.com/llms.txt", ok: true, status: 200, body: "# Example", contentType: "text/plain" },
    });
    const result = llmsTxt(ctx);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(80);
  });
});

describe("sitemap check", () => {
  it("rewards a reachable sitemap declared in robots.txt", async () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc><lastmod>2026-09-01</lastmod></url></urlset>`;
    const ctx = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml"),
      sitemap: { url: "https://example.com/sitemap.xml", ok: true, status: 200, body: xml, contentType: "application/xml" },
    });
    expect(sitemap(ctx).score).toBe(100);
  });

  it("fails when there is no sitemap at all", async () => {
    const ctx = await fixtureContext("bad-page", {
      sitemap: missing("https://example.com/sitemap.xml"),
      robotsTxt: missing(),
    });
    expect(sitemap(ctx).score).toBe(0);
  });

  it("notes a missing Sitemap directive even when the file exists", async () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url></urlset>`;
    const ctx = await fixtureContext("good-page", {
      robotsTxt: resource("User-agent: *\nAllow: /"),
      sitemap: { url: "https://example.com/sitemap.xml", ok: true, status: 200, body: xml, contentType: "application/xml" },
    });
    const result = sitemap(ctx);
    expect(result.findings.some((f) => f.includes("no `Sitemap:` line"))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });
});

describe("http-status check", () => {
  it("scores a 200 HTTPS HTML response at 100", async () => {
    const ctx = await fixtureContext("good-page");
    expect(httpStatus(ctx).score).toBe(100);
  });

  it("fails a 404", async () => {
    const ctx = await fixtureContext("good-page", { status: 404 });
    expect(httpStatus(ctx).score).toBe(0);
  });

  it("penalises plain HTTP", async () => {
    const ctx = await fixtureContext("good-page", {
      finalUrl: "http://example.com/page",
      requestedUrl: "http://example.com/page",
    });
    expect(httpStatus(ctx).score).toBe(70);
  });

  it("penalises a non-HTML content type", async () => {
    const ctx = await fixtureContext("good-page", {
      headers: { "content-type": "application/json" },
    });
    expect(httpStatus(ctx).score).toBeLessThan(100);
  });
});

describe("server-rendered-content check", () => {
  it("passes a fully server-rendered page", async () => {
    const ctx = await fixtureContext("good-page");
    const result = serverRendered(ctx);
    expect(result.status).toBe("pass");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("caps a client-rendered page with an empty mount point", async () => {
    const ctx = await fixtureContext("js-only-page");
    const result = serverRendered(ctx);
    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.status).toBe("fail");
    expect(result.findings.some((f) => f.includes("mount point"))).toBe(true);
  });

  it("ranks the good page above the JS-only page", async () => {
    const good = serverRendered(await fixtureContext("good-page"));
    const js = serverRendered(await fixtureContext("js-only-page"));
    expect(good.score).toBeGreaterThan(js.score);
  });
});

describe("meta-robots check", () => {
  it("passes a page with no restrictive directives", async () => {
    const ctx = await fixtureContext("good-page");
    expect(metaRobots(ctx).score).toBe(100);
  });

  it("zeroes a noindex page", async () => {
    const ctx = await fixtureContext("bad-page");
    const result = metaRobots(ctx);
    expect(result.score).toBe(0);
    expect(result.status).toBe("fail");
  });

  it("reads directives from the X-Robots-Tag header", async () => {
    const ctx = await fixtureContext("good-page", {
      headers: { "content-type": "text/html", "x-robots-tag": "noindex" },
    });
    expect(metaRobots(ctx).score).toBe(0);
  });

  it("treats nosnippet as citation-blocking", async () => {
    const ctx = await fixtureContext("good-page", {
      headers: { "content-type": "text/html", "x-robots-tag": "nosnippet" },
    });
    const result = metaRobots(ctx);
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.findings.some((f) => f.includes("nosnippet"))).toBe(true);
  });
});
