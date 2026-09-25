import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeUrl } from "@/lib/geo/analyze";
import { FetchFailure } from "@/lib/geo/fetcher";
import { SsrfError } from "@/lib/geo/ssrf";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/geo/rate-limit";
import { normaliseUrlInput } from "@/lib/geo/normalise-url";

/**
 * The analyzer needs Node APIs — `node:dns` for the SSRF guard and cheerio for
 * parsing — so this route cannot run on the edge runtime.
 */
export const runtime = "nodejs";
/** Never cache: the whole point is a live look at the target page. */
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL to analyse.")
    .max(2048, "That URL is too long.")
    // Accept a bare domain, since that is what people paste. A URL that already
    // names a scheme keeps it, so a bad scheme is reported as a bad scheme.
    .transform(normaliseUrlInput)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "That does not look like a valid URL."),
});

type ErrorBody = { error: string; code: string };

function errorResponse(message: string, code: string, status: number): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const rate = checkRateLimit(clientKeyFromHeaders(request.headers));
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Too many requests. Try again in ${rate.retryAfterSeconds}s.`,
        code: "RATE_LIMITED",
      },
      { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Request body must be JSON.", "BAD_JSON", 400);
  }

  const parsed = RequestSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(first?.message ?? "Invalid request.", "INVALID_INPUT", 400);
  }

  try {
    const report = await analyzeUrl(parsed.data.url);
    return NextResponse.json(report, {
      headers: {
        "cache-control": "no-store",
        "x-ratelimit-remaining": String(rate.remaining),
      },
    });
  } catch (error) {
    // SSRF rejections are the user's fault and safe to echo — the messages are
    // written to explain without confirming what does or does not exist inside
    // our network.
    if (error instanceof SsrfError) {
      return errorResponse(error.message, error.code, 400);
    }
    if (error instanceof FetchFailure) {
      // 502: we are fine, the upstream page is not.
      return errorResponse(error.message, "FETCH_FAILED", 502);
    }
    console.error("[api/analyze] unexpected error:", error);
    return errorResponse("Something went wrong while analysing that page.", "INTERNAL", 500);
  }
}

/** A GET here is almost always someone exploring — point them at the docs. */
export function GET(): NextResponse {
  return NextResponse.json(
    { error: "Use POST with a JSON body of { \"url\": \"https://example.com\" }.", code: "METHOD" },
    { status: 405, headers: { allow: "POST" } },
  );
}
