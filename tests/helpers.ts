import { promises as fs } from "node:fs";
import path from "node:path";
import { contextFromHtml, type BuildContextInput } from "@/lib/geo/context";
import type { FetchedResource, PageContext } from "@/lib/geo/types";

const FIXTURES = path.join(process.cwd(), "tests", "fixtures");

export type FixtureName = "good-page" | "bad-page" | "js-only-page";

const cache = new Map<string, string>();

export async function loadFixture(name: FixtureName): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;
  const html = await fs.readFile(path.join(FIXTURES, `${name}.html`), "utf8");
  cache.set(name, html);
  return html;
}

export async function fixtureContext(
  name: FixtureName,
  overrides: Partial<BuildContextInput> = {},
): Promise<PageContext> {
  const html = await loadFixture(name);
  return contextFromHtml(html, {
    finalUrl: "https://example.com/guides/composting",
    requestedUrl: "https://example.com/guides/composting",
    ...overrides,
  });
}

/** Build a FetchedResource for a successfully fetched sibling file. */
export function resource(body: string, contentType = "text/plain"): FetchedResource {
  return { url: "https://example.com/robots.txt", ok: true, status: 200, body, contentType };
}

/** Build a FetchedResource for a 404. */
export function missing(url = "https://example.com/robots.txt"): FetchedResource {
  return { url, ok: false, status: 404, body: "", contentType: "" };
}
