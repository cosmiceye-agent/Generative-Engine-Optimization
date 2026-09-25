import type { FetchedResource } from "./types";
import { assertSafeUrl, SsrfError } from "./ssrf";

export const USER_AGENT =
  "GEOLensBot/1.0 (+https://geo-lens.vercel.app/about; GEO audit tool; respects robots.txt)";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_REDIRECTS = 3;

export class FetchFailure extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FetchFailure";
  }
}

export type FetchedPage = {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  redirectChain: string[];
};

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/**
 * Read a response body but stop at {@link MAX_BODY_BYTES}.
 *
 * `response.text()` would buffer the whole thing first, so a malicious or simply
 * enormous endpoint could exhaust memory before we ever got to check the size.
 * Streaming lets us abandon the read as soon as the cap is passed. Content-Length
 * is checked first as a cheap fast path, but it is advisory — a server can lie or
 * omit it, so the streaming cap is the real limit.
 */
async function readCapped(response: Response): Promise<{ text: string; bytes: number }> {
  const declared = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new FetchFailure(
      `Response is ${(declared / 1024 / 1024).toFixed(1)} MB, over the ${MAX_BODY_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  if (!response.body) return { text: "", bytes: 0 };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        throw new FetchFailure(`Response exceeded the ${MAX_BODY_BYTES / 1024 / 1024} MB limit.`);
      }
      chunks.push(value);
    }
  } finally {
    // Free the socket whether we finished or bailed out early.
    await reader.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { text: new TextDecoder("utf-8", { fatal: false }).decode(merged), bytes };
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * Fetch a URL with SSRF vetting applied to the initial URL *and* to every redirect
 * hop. Redirects are followed manually (`redirect: "manual"`) precisely so that a
 * public URL cannot bounce us into a private network.
 */
export async function safeFetch(
  rawUrl: string,
  init: { accept?: string } = {},
): Promise<FetchedPage> {
  const redirectChain: string[] = [];
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const { url } = await assertSafeUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: init.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new FetchFailure(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s.`, error);
      }
      throw new FetchFailure(`Could not reach ${url.hostname}.`, error);
    } finally {
      clearTimeout(timeout);
    }

    if (isRedirect(response.status)) {
      const location = response.headers.get("location");
      // Drain the redirect body so the connection can be reused/released.
      await response.body?.cancel().catch(() => undefined);

      if (!location) {
        throw new FetchFailure(`Got a ${response.status} redirect with no Location header.`);
      }
      if (hop === MAX_REDIRECTS) {
        throw new FetchFailure(`Too many redirects (more than ${MAX_REDIRECTS}).`);
      }

      redirectChain.push(url.toString());
      currentUrl = new URL(location, url).toString();
      continue;
    }

    const { text, bytes } = await readCapped(response);
    return {
      finalUrl: url.toString(),
      status: response.status,
      headers: headersToObject(response.headers),
      body: text,
      bytes,
      redirectChain,
    };
  }

  throw new FetchFailure(`Too many redirects (more than ${MAX_REDIRECTS}).`);
}

/**
 * Fetch a sibling resource (robots.txt, llms.txt, sitemap.xml). Unlike the page
 * fetch, a failure here is information rather than an error — "no llms.txt" is a
 * finding — so every outcome is folded into a {@link FetchedResource}.
 */
export async function fetchResource(url: string, accept: string): Promise<FetchedResource> {
  try {
    const result = await safeFetch(url, { accept });
    return {
      url: result.finalUrl,
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      body: result.body,
      contentType: result.headers["content-type"] ?? "",
    };
  } catch (error) {
    const message =
      error instanceof SsrfError || error instanceof FetchFailure
        ? error.message
        : "Unexpected error while fetching.";
    return { url, ok: false, status: 0, body: "", contentType: "", error: message };
  }
}
